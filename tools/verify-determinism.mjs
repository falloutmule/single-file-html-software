import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readlink,
  readdir,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function parseArguments(argumentsList) {
  const options = {
    artifactFile: undefined,
    offline: false,
    reportFile: undefined
  };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--offline") {
      options.offline = true;
      continue;
    }
    if (argument === "--artifact-file" || argument === "--report-file") {
      const value = argumentsList[index + 1];
      if (value === undefined) {
        throw new Error(`${argument} requires a path.`);
      }
      index += 1;
      const resolved = resolve(repositoryRoot, value);
      if (argument === "--artifact-file") {
        options.artifactFile = resolved;
      } else {
        options.reportFile = resolved;
      }
      continue;
    }
    throw new Error(`Unknown determinism option: ${argument}`);
  }
  return options;
}

function run(command, argumentsList, cwd, capture = false) {
  return new Promise((resolvePromise, reject) => {
    const spawnOptions = {
      cwd,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
    };
    const child = command.endsWith(".cmd")
      ? spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...argumentsList], {
          ...spawnOptions,
          shell: false
        })
      : spawn(command, argumentsList, { ...spawnOptions, shell: false });
    const stdout = [];
    const stderr = [];
    if (capture) {
      child.stdout.on("data", (chunk) => stdout.push(chunk));
      child.stderr.on("data", (chunk) => stderr.push(chunk));
    }
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise(Buffer.concat(stdout).toString("utf8"));
      } else {
        reject(new Error(
          `${command} ${argumentsList.join(" ")} exited ${code}. ${Buffer.concat(stderr).toString("utf8").trim()}`
        ));
      }
    });
  });
}

async function trackedFiles() {
  const output = await run(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    repositoryRoot,
    true
  );
  return output.split("\0").filter(Boolean).sort((left, right) => left.localeCompare(right));
}

async function copyTrackedSource(destination, files) {
  for (const relativePath of files) {
    const sourcePath = join(repositoryRoot, relativePath);
    const destinationPath = join(destination, relativePath);
    await mkdir(dirname(destinationPath), { recursive: true });
    const details = await lstat(sourcePath);
    if (details.isSymbolicLink()) {
      await symlink(await readlink(sourcePath), destinationPath);
    } else {
      await copyFile(sourcePath, destinationPath);
    }
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function buildAndInspect(root, label, sourceRevision, offline) {
  const installArguments = ["install", "--frozen-lockfile", "--reporter=append-only"];
  if (offline) {
    installArguments.push("--offline");
  }
  await run(pnpmCommand, installArguments, root);

  const packerUrl = pathToFileURL(join(root, "packages", "packer", "src", "index.ts")).href;
  const verifierUrl = pathToFileURL(join(root, "packages", "verifier", "src", "index.ts")).href;
  const { packProject } = await import(packerUrl);
  const { scanPackedBytes } = await import(verifierUrl);
  const artifact = await packProject(join(root, "examples", "pixi-minimal"), { sourceRevision });
  const scan = scanPackedBytes(artifact.bytes);
  const outputDirectory = dirname(join(root, "examples", "pixi-minimal", artifact.descriptor.artifact.path));
  const outputEntries = (await readdir(outputDirectory)).sort((left, right) => left.localeCompare(right));
  if (outputEntries.length !== 1 || outputEntries[0] !== "index.html") {
    throw new Error(`Build ${label} emitted unexpected files: ${outputEntries.join(", ")}`);
  }
  if (!scan.valid) {
    throw new Error(`Build ${label} failed static scanning: ${JSON.stringify(scan.findings)}`);
  }
  const bytes = Buffer.from(artifact.bytes);
  const digest = sha256(bytes);
  if (digest !== artifact.descriptor.artifact.sha256) {
    throw new Error(`Build ${label} descriptor hash does not match its bytes.`);
  }
  return {
    bytes,
    record: Object.freeze({
      label,
      artifactBytes: bytes.byteLength,
      artifactSha256: digest,
      buildId: artifact.descriptor.artifact.buildId,
      sourceSha256: artifact.descriptor.source.sha256,
      staticScanFindingCount: scan.findings.length,
      staticScanValid: scan.valid
    })
  };
}

async function writeOutput(path, contents) {
  if (path === undefined) {
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const sourceRevision = (await run("git", ["rev-parse", "HEAD"], repositoryRoot, true)).trim();
  const pnpmVersion = (await run(pnpmCommand, ["--version"], repositoryRoot, true)).trim();
  const files = await trackedFiles();
  const temporaryRoot = await mkdtemp(join(tmpdir(), "sfhs-determinism-"));
  try {
    const firstRoot = join(temporaryRoot, "build-a");
    const secondRoot = join(temporaryRoot, "build-b");
    await Promise.all([
      copyTrackedSource(firstRoot, files),
      copyTrackedSource(secondRoot, files)
    ]);
    const first = await buildAndInspect(firstRoot, "A", sourceRevision, options.offline);
    const second = await buildAndInspect(secondRoot, "B", sourceRevision, options.offline);
    const identical = first.bytes.equals(second.bytes);
    const result = Object.freeze({
      schema: "sfhs.determinism@1",
      sourceRevision,
      environment: Object.freeze({
        platform: process.platform,
        architecture: process.arch,
        node: process.version,
        pnpm: pnpmVersion
      }),
      builds: Object.freeze([first.record, second.record]),
      identical
    });
    const reportText = `${JSON.stringify(result, null, 2)}\n`;
    await writeOutput(options.reportFile, reportText);
    await writeOutput(options.artifactFile, first.bytes);
    process.stdout.write(reportText);
    if (!identical) {
      throw new Error("Isolated builds did not produce byte-identical HTML.");
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

await main();
