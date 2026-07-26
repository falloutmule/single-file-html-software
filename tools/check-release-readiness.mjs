import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import process from "node:process";

import { buildProject } from "../packages/builder/src/index.ts";
import { validateEvidenceManifest } from "../packages/contracts/src/index.ts";
import { packIntermediate } from "../packages/packer/src/index.ts";
import { verifyArtifactFile } from "../packages/verifier/src/index.ts";

const repositoryRoot = resolve(import.meta.dirname, "..");
const projects = Object.freeze(["examples/pixi-minimal", "examples/hermes-minimal-import"]);

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("Arguments must be --name value pairs.");
    }
    values.set(key.slice(2), value);
  }
  return values;
}

function run(executable, arguments_, cwd = repositoryRoot) {
  return new Promise((resolvePromise) => {
    const child = spawn(executable, arguments_, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => resolvePromise({ exitCode: -1, stdout: "", stderr: error.message }));
    child.on("exit", (code) => resolvePromise({
      exitCode: code ?? -1,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: Buffer.concat(stderr).toString("utf8")
    }));
  });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function sourceFiles(root) {
  const output = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else output.push(path);
    }
  }
  await walk(root);
  return output.sort((left, right) => left.localeCompare(right));
}

const values = parseArguments(process.argv.slice(2));
const evidencePath = resolve(repositoryRoot, values.get("evidence") ?? "");
const reviewPath = resolve(repositoryRoot, values.get("semantic-review") ?? "");
const localFindings = [];
const externalBlockers = [];

if (!values.has("evidence")) localFindings.push("SFHS_RELEASE_GATE_EVIDENCE_REQUIRED");
if (!values.has("semantic-review")) localFindings.push("SFHS_RELEASE_GATE_SEMANTIC_REVIEW_REQUIRED");

const status = await run("git", ["status", "--short"]);
if (status.exitCode !== 0 || status.stdout.trim().length > 0) localFindings.push("SFHS_RELEASE_GATE_WORKTREE_DIRTY");
const branch = await run("git", ["branch", "--show-current"]);
if (branch.exitCode !== 0 || branch.stdout.trim() !== "main") localFindings.push("SFHS_RELEASE_GATE_BRANCH_INVALID");
const head = await run("git", ["rev-parse", "HEAD"]);
if (head.exitCode !== 0 || !/^[0-9a-f]{40}$/u.test(head.stdout.trim())) localFindings.push("SFHS_RELEASE_GATE_HEAD_INVALID");
const remotes = await run("git", ["remote"]);
const remoteNames = remotes.stdout.trim().split(/\s+/u).filter(Boolean);
if (remotes.exitCode !== 0 || remoteNames.length === 0) {
  externalBlockers.push("SFHS_RELEASE_PUBLIC_REMOTE_UNCONFIGURED");
} else {
  const remoteUrls = await Promise.all(remoteNames.map(async (name) => (await run("git", ["remote", "get-url", name])).stdout.trim()));
  if (!remoteUrls.some((url) => /^(?:https?:\/\/|ssh:\/\/|git@)/iu.test(url))) {
    externalBlockers.push("SFHS_RELEASE_PUBLIC_REMOTE_UNCONFIGURED");
  }
}
if (!values.has("cross-platform-evidence")) {
  externalBlockers.push("SFHS_RELEASE_CROSS_PLATFORM_CI_UNVERIFIED");
} else {
  try {
    const crossPlatform = JSON.parse(await readFile(resolve(repositoryRoot, values.get("cross-platform-evidence")), "utf8"));
    if (
      crossPlatform.schema !== "sfhs.cross-platform-determinism@1" ||
      crossPlatform.commit !== head.stdout.trim() ||
      !/^[0-9a-f]{64}$/u.test(crossPlatform.windows?.artifactSha256 ?? "") ||
      crossPlatform.windows.artifactSha256 !== crossPlatform.linux?.artifactSha256
    ) {
      localFindings.push("SFHS_RELEASE_GATE_CROSS_PLATFORM_EVIDENCE_INVALID");
    }
  } catch {
    localFindings.push("SFHS_RELEASE_GATE_CROSS_PLATFORM_EVIDENCE_UNREADABLE");
  }
}

for (const validator of ["validate-sfhs-plugin.mjs", "validate-hermes-adapter.mjs"]) {
  const result = await run(process.execPath, [join(repositoryRoot, "tools", validator)]);
  if (result.exitCode !== 0) localFindings.push(`SFHS_RELEASE_GATE_${basename(validator, ".mjs").toUpperCase().replaceAll("-", "_")}_FAILED`);
}

for (const project of projects) {
  try {
    const projectRoot = join(repositoryRoot, project);
    const expected = packIntermediate(await buildProject(projectRoot));
    const verification = await verifyArtifactFile(projectRoot, expected.descriptor);
    if (!verification.valid) localFindings.push(`SFHS_RELEASE_GATE_ARTIFACT_INVALID:${project}`);
  } catch {
    localFindings.push(`SFHS_RELEASE_GATE_ARTIFACT_MISSING:${project}`);
  }
}

for (const directory of ["packages/core", "packages/contracts", "packages/builder", "packages/packer", "packages/verifier", "packages/evidence"]) {
  for (const path of await sourceFiles(join(repositoryRoot, directory))) {
    const text = await readFile(path, "utf8");
    if (/\b(?:plugins\/|hermes\/)|from\s+["']@sfhs\/adapter/iu.test(text)) {
      localFindings.push(`SFHS_RELEASE_GATE_HOST_DIRECTION_INVALID:${relative(repositoryRoot, path).split(sep).join("/")}`);
    }
  }
}

for (const path of await sourceFiles(join(repositoryRoot, "adapters", "pixi-v8"))) {
  const text = await readFile(path, "utf8");
  if (/from\s+["'].*examples\//iu.test(text)) {
    localFindings.push(`SFHS_RELEASE_GATE_ADAPTER_BOUNDARY_INVALID:${relative(repositoryRoot, path).split(sep).join("/")}`);
  }
}

let evidence;
try {
  evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  const validation = validateEvidenceManifest(evidence);
  if (!validation.valid) localFindings.push("SFHS_RELEASE_GATE_EVIDENCE_INVALID");
} catch {
  localFindings.push("SFHS_RELEASE_GATE_EVIDENCE_UNREADABLE");
}

let review;
try {
  review = JSON.parse(await readFile(reviewPath, "utf8"));
  if (review.schema !== "sfhs.semantic-review@1" || review.verdict !== "pass" || !Array.isArray(review.screenshots)) {
    localFindings.push("SFHS_RELEASE_GATE_SEMANTIC_REVIEW_INVALID");
  }
} catch {
  localFindings.push("SFHS_RELEASE_GATE_SEMANTIC_REVIEW_UNREADABLE");
}

if (evidence !== undefined && review !== undefined) {
  const evidenceBytes = await readFile(evidencePath);
  if (review.evidenceSha256 !== sha256(evidenceBytes)) localFindings.push("SFHS_RELEASE_GATE_REVIEW_EVIDENCE_MISMATCH");
  for (const screenshot of evidence.screenshots ?? []) {
    const reviewEntry = review.screenshots?.find((entry) => entry.path === screenshot.path);
    const screenshotPath = join(resolve(evidencePath, ".."), screenshot.path);
    try {
      const digest = sha256(await readFile(screenshotPath));
      if (digest !== screenshot.sha256 || reviewEntry?.sha256 !== digest || reviewEntry?.status !== "passed") {
        localFindings.push(`SFHS_RELEASE_GATE_SCREENSHOT_REVIEW_INVALID:${screenshot.path}`);
      }
    } catch {
      localFindings.push(`SFHS_RELEASE_GATE_SCREENSHOT_MISSING:${screenshot.path}`);
    }
  }
  for (const blocker of evidence.blockers ?? []) externalBlockers.push(blocker);
}

const pluginEvidence = await readFile(join(repositoryRoot, "docs", "evidence", "SFHS-006D-CLEAN-COPY-PLUGIN-ACCEPTANCE.md"), "utf8");
if (pluginEvidence.includes("BLOCKED_ON_PLUGIN_INSTALL_AUTHORIZATION")) {
  externalBlockers.push("BLOCKED_ON_PLUGIN_INSTALL_AUTHORIZATION");
}

const requiredLimitationText = (await Promise.all([
  readFile(join(repositoryRoot, "README.md"), "utf8"),
  readFile(join(repositoryRoot, "docs", "SAMSUNG-S21-ULTRA-PHYSICAL-ACCEPTANCE.md"), "utf8"),
  readFile(join(repositoryRoot, "docs", "evidence", "SFHS-008A-NON-PROJECT-IMPORT-PROOF.md"), "utf8")
])).join("\n").toLowerCase();
for (const term of ["file-protocol", "context loss", "physical", "visual", "webgpu", "canvas fallback", "publication"]) {
  if (!requiredLimitationText.includes(term)) localFindings.push(`SFHS_RELEASE_GATE_LIMITATION_UNRECORDED:${term}`);
}

const uniqueLocal = [...new Set(localFindings)].sort();
const uniqueExternal = [...new Set(externalBlockers)].sort();
for (const finding of uniqueLocal) process.stderr.write(`LOCAL_FINDING ${finding}\n`);
for (const blocker of uniqueExternal) process.stderr.write(`EXTERNAL_BLOCKER ${blocker}\n`);

if (uniqueLocal.length > 0) {
  process.stdout.write("NOT_READY\n");
  process.exitCode = 1;
} else if (uniqueExternal.length > 0) {
  process.stdout.write("BLOCKED_ON_EXTERNAL_DECISION\n");
  process.exitCode = 2;
} else {
  process.stdout.write("READY_FOR_USER_RELEASE_APPROVAL\n");
}
