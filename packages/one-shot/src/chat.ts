import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

export type ChatCapabilityState = "AVAILABLE" | "UNAVAILABLE" | "UNTESTED" | "BLOCKED_BY_POLICY";
export type ChatExecutionMode = "SFHS_NATIVE_MODE" | "CHAT_CANDIDATE_MODE" | "SOURCE_ONLY_MODE";
export type ChatProductStatus = "PRODUCT_INCOMPLETE" | "PRODUCT_PLAYABLE" | "PRODUCT_COMPLETE" | "PRODUCT_USER_ACCEPTED" | "PRODUCT_NEEDS_REPAIR";
export type ChatSfhsStatus = "SFHS_SOURCE_ONLY" | "SFHS_CANDIDATE" | "SFHS_CANONICAL" | "SFHS_RELEASE_PREPARED" | "SFHS_INTAKE_REQUIRED" | "SFHS_BLOCKED";
export type ChatEvidenceMode = "SOURCE_TEST" | "HTML_SET_CONTENT_EXECUTION" | "LOCAL_HTTP_ARTIFACT_NAVIGATION" | "FILE_PROTOCOL_NAVIGATION" | "CANONICAL_BROWSER_RUNNER" | "PHYSICAL_DEVICE";
export type ChatGate = "CONTRACT" | "PREFLIGHT" | "RISK_SLICE" | "PLAYABLE_LOOP" | "SOURCE_TESTS" | "SEMANTIC_SCENARIO" | "VISUAL_AUDIO" | "ARTIFACT_BROWSER" | "PHYSICAL_SEED" | "COMPLETION";

export interface ChatCapability { readonly state: ChatCapabilityState; readonly detail: string; readonly value?: string; }
export interface ChatPreflight {
  readonly schema: "sfhs.one-shot-preflight@1";
  readonly version: 1;
  readonly timestamp: string;
  readonly depth: "fast" | "deep";
  readonly platform: string;
  readonly architecture: string;
  readonly workingDirectory: string;
  readonly writableOutputRoot: ChatCapability;
  readonly runtimes: readonly ChatCapability[];
  readonly selectedRuntime: ChatCapability;
  readonly capabilities: Readonly<Record<string, ChatCapability>>;
  readonly selectedExecutionMode: ChatExecutionMode;
  readonly reasons: readonly string[];
}

export interface ChatRunState {
  readonly schema: "sfhs.one-shot-run-state@1";
  readonly version: 1;
  readonly project: { readonly id: string; readonly source: { readonly path: string; readonly sha256: string } };
  readonly classification: string;
  readonly executionMode: ChatExecutionMode;
  readonly currentGate: ChatGate;
  readonly completedGates: readonly ChatGate[];
  readonly failedGates: readonly ChatGate[];
  readonly records: Readonly<Record<string, { readonly path: string; readonly sha256: string }>>;
  readonly productStatus: ChatProductStatus;
  readonly sfhsStatus: ChatSfhsStatus;
  readonly physicalEvidence: string;
  readonly completionPolicy: { readonly requiredBeforeCompletion: readonly string[]; readonly deferredHardening: readonly string[]; readonly graduationBacklog: readonly string[]; readonly releaseBacklog: readonly string[]; };
  readonly nextRequiredAction: string;
  readonly updatedAt: string;
}

export interface ChatPhysicalTestSeed {
  readonly schema: "sfhs.one-shot-physical-test-seed@1";
  readonly classification: "candidate" | "canonical";
  readonly artifact: { readonly path: string; readonly sha256: string; readonly bytes?: number; readonly buildId?: string };
  readonly source: { readonly path: string; readonly sha256: string };
  readonly required: readonly string[];
  readonly resultVocabulary: readonly string[];
}

export interface ChatFinding { readonly code: string; readonly severity: "error" | "warning"; readonly path: string; readonly message: string; }
export interface ChatResult<T = undefined> { readonly valid: boolean; readonly findings: readonly ChatFinding[]; readonly value?: T; }

const execFileAsync = promisify(execFile);
const gates: readonly ChatGate[] = ["CONTRACT", "PREFLIGHT", "RISK_SLICE", "PLAYABLE_LOOP", "SOURCE_TESTS", "SEMANTIC_SCENARIO", "VISUAL_AUDIO", "ARTIFACT_BROWSER", "PHYSICAL_SEED", "COMPLETION"];
const modes: readonly ChatExecutionMode[] = ["SFHS_NATIVE_MODE", "CHAT_CANDIDATE_MODE", "SOURCE_ONLY_MODE"];

function hash(bytes: Uint8Array | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function record(value: unknown): Record<string, unknown> | undefined { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function inside(root: string, path: string): boolean { const value = relative(root, path); return value === "" || (!value.startsWith(`..${sep}`) && value !== ".." && !value.includes(`..${sep}`)); }
function result<T>(findings: readonly ChatFinding[], value?: T): ChatResult<T> { const ordered = [...findings].sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code)); return { valid: !ordered.some((finding) => finding.severity === "error"), findings: ordered, ...(value === undefined ? {} : { value }) }; }

export function stableJson(value: unknown): string {
  const visit = (current: unknown): unknown => Array.isArray(current) ? current.map(visit) : record(current) === undefined ? current : Object.fromEntries(Object.entries(record(current)!).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, visit(child)]));
  return `${JSON.stringify(visit(value), null, 2)}\n`;
}

export async function writeChatJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, stableJson(value), "utf8");
  await rename(temporary, path);
}

async function command(command: string, args: readonly string[], cwd: string): Promise<ChatCapability> {
  try { const { stdout } = await execFileAsync(command, [...args], { cwd, windowsHide: true }); return { state: "AVAILABLE", detail: `${command} ${args.join(" ")}`.trim(), value: stdout.trim() }; }
  catch { return { state: "UNAVAILABLE", detail: `${command} ${args.join(" ")}`.trim() }; }
}

async function exists(path: string, detail: string): Promise<ChatCapability> { try { await stat(path); return { state: "AVAILABLE", detail, value: path }; } catch { return { state: "UNAVAILABLE", detail }; } }

export function selectChatMode(capabilities: Readonly<Record<string, ChatCapability>>): { readonly mode: ChatExecutionMode; readonly reasons: readonly string[] } {
  const native = ["sfhsCheckout", "pnpm", "template", "adapter", "runtime", "canonicalCli", "browserRunner"].every((name) => capabilities[name]?.state === "AVAILABLE") && capabilities.runtimeCompatible?.state !== "UNAVAILABLE";
  if (native) return { mode: "SFHS_NATIVE_MODE", reasons: [] };
  const candidate = capabilities.candidateRuntime?.state === "AVAILABLE" && capabilities.chromium?.state === "AVAILABLE";
  if (candidate) return { mode: "CHAT_CANDIDATE_MODE", reasons: ["Canonical SFHS capabilities are incomplete; candidate runtime is available."] };
  return { mode: "SOURCE_ONLY_MODE", reasons: ["Neither the complete canonical path nor a candidate runtime is available."] };
}

export async function collectChatPreflight(projectRoot: string, options: { readonly depth: "fast" | "deep"; readonly now?: () => Date } = { depth: "fast" }): Promise<ChatPreflight> {
  const cwd = resolve(projectRoot); const repository = resolve(cwd, "..");
  const where = process.platform === "win32" ? await command("where.exe", ["node"], cwd) : await command("sh", ["-lc", "command -v node; command -v -a node 2>/dev/null || true"], cwd);
  const paths = [...new Set([process.execPath, ...(where.value?.split(/\r?\n/u).filter(Boolean) ?? []), ...(process.env.SFHS_NODE_PATHS?.split(process.platform === "win32" ? ";" : ":").filter(Boolean) ?? [])])];
  const runtimes = await Promise.all(paths.map(async (path) => command(path, ["--version"], cwd)));
  const selected = runtimes.find((entry) => entry.state === "AVAILABLE" && /^v(?:2[4-9]|[3-9]\d)\./u.test(entry.value ?? "")) ?? { state: "UNAVAILABLE" as const, detail: "No supported Node >=24 runtime discovered." };
  const capabilities: Record<string, ChatCapability> = {
    pnpm: await command("pnpm", ["--version"], cwd), corepack: await command("corepack", ["--version"], cwd),
    sfhsCheckout: await exists(join(repository, "package.json"), "Adjacent SFHS repository package.json"),
    template: await exists(join(repository, "examples", "pixi-minimal", "sfhs.project.json"), "Current Pixi template"),
    adapter: await exists(join(repository, "adapters", "pixi-v8", "src", "index.ts"), "Pixi adapter source"),
    runtime: await exists(join(repository, "packages", "pixi-runtime", "src", "index.ts"), "Pixi runtime source"),
    canonicalCli: await exists(join(repository, "packages", "cli", "src", "main.ts"), "SFHS CLI source"),
    browserRunner: await exists(join(repository, "packages", "browser-runner", "src", "index.ts"), "SFHS browser runner source"),
    candidateRuntime: await exists(join(cwd, ".sfhs-one-shot", "sfhs-chat-candidate-runtime.zip"), "Chat candidate runtime ZIP"),
    chromium: await command(process.platform === "win32" ? "where.exe" : "sh", process.platform === "win32" ? ["chrome"] : ["-lc", "command -v chromium || command -v google-chrome"], cwd),
    playwright: { state: "UNTESTED", detail: "Deep probe not run." }, headlessWebgl: { state: "UNTESTED", detail: "Deep probe not run." }, headfulWebgl: { state: "UNTESTED", detail: "Deep probe not run." }, urlNavigation: { state: "UNTESTED", detail: "Deep probe not run." }, fileProtocol: { state: "UNTESTED", detail: "Deep probe not run." }
  };
  capabilities.runtimeCompatible = selected.state === "AVAILABLE" ? { state: "AVAILABLE", detail: "A Node.js 24+ runtime was discovered.", ...(selected.value === undefined ? {} : { value: selected.value }) } : selected;
  const descriptorPath = join(cwd, ".sfhs-one-shot", "sfhs-chat-candidate-runtime.json");
  try {
    const descriptor = record(JSON.parse(await readFile(descriptorPath, "utf8")));
    const compiler = record(descriptor?.candidateCompiler);
    if (compiler?.state !== "AVAILABLE") capabilities.candidateRuntime = { state: "UNAVAILABLE", detail: typeof compiler?.reason === "string" ? compiler.reason : "Candidate runtime does not provide a portable compiler." };
  } catch { /* A legacy externally supplied runtime ZIP has no descriptor; retain its probe result. */ }
  if (options.depth === "deep") for (const name of ["playwright", "headlessWebgl", "headfulWebgl", "urlNavigation", "fileProtocol"] as const) capabilities[name] = { state: "UNTESTED", detail: "Deep browser helper is not available to this portable collector." };
  const selection = selectChatMode(capabilities);
  return { schema: "sfhs.one-shot-preflight@1", version: 1, timestamp: (options.now ?? (() => new Date()))().toISOString(), depth: options.depth, platform: process.platform, architecture: process.arch, workingDirectory: cwd, writableOutputRoot: { state: "AVAILABLE", detail: "Project one-shot directory is writable after command validation.", value: join(cwd, "one-shot") }, runtimes, selectedRuntime: selected, capabilities, selectedExecutionMode: selection.mode, reasons: selection.reasons };
}

export async function validateChatRunState(projectRoot: string): Promise<ChatResult<ChatRunState>> {
  const path = join(resolve(projectRoot), "one-shot", "RUN-STATE.json"); const findings: ChatFinding[] = [];
  let value: unknown; try { value = JSON.parse(await readFile(path, "utf8")); } catch { return result([{ code: "SFHS_ONE_SHOT_RUN_STATE_INVALID", severity: "error", path: "one-shot/RUN-STATE.json", message: "Run state is missing or invalid JSON." }]); }
  const state = record(value); if (state?.schema !== "sfhs.one-shot-run-state@1" || state.version !== 1 || !modes.includes(state.executionMode as ChatExecutionMode) || !gates.includes(state.currentGate as ChatGate)) findings.push({ code: "SFHS_ONE_SHOT_RUN_STATE_INVALID", severity: "error", path: "one-shot/RUN-STATE.json", message: "Run state has an unsupported schema, mode, or gate." });
  const source = record(record(state?.project)?.source);
  if (typeof source?.path !== "string" || typeof source.sha256 !== "string" || !inside(resolve(projectRoot), resolve(projectRoot, source.path))) findings.push({ code: "SFHS_ONE_SHOT_RUN_STATE_REFERENCE_INVALID", severity: "error", path: "one-shot/RUN-STATE.json", message: "Run-state source identity must be a project-contained hashed path." });
  else try { if (hash(await readFile(resolve(projectRoot, source.path))) !== source.sha256) findings.push({ code: "SFHS_ONE_SHOT_RUN_STATE_HASH_MISMATCH", severity: "error", path: source.path, message: "Run-state source identity is stale; completion must be reopened." }); } catch { findings.push({ code: "SFHS_ONE_SHOT_RUN_STATE_REFERENCE_INVALID", severity: "error", path: source.path, message: "Run-state source identity is unreadable." }); }
  const records = record(state?.records); for (const entry of Object.values(records ?? {})) { const reference = record(entry); if (typeof reference?.path !== "string" || typeof reference.sha256 !== "string" || !inside(resolve(projectRoot), resolve(projectRoot, reference.path))) { findings.push({ code: "SFHS_ONE_SHOT_RUN_STATE_REFERENCE_INVALID", severity: "error", path: "one-shot/RUN-STATE.json", message: "Run-state record references must be project-contained hashed paths." }); continue; } try { if (hash(await readFile(resolve(projectRoot, reference.path))) !== reference.sha256) findings.push({ code: "SFHS_ONE_SHOT_RUN_STATE_HASH_MISMATCH", severity: "error", path: reference.path, message: "Run-state reference hash is stale." }); } catch { findings.push({ code: "SFHS_ONE_SHOT_RUN_STATE_REFERENCE_INVALID", severity: "error", path: reference.path, message: "Run-state reference is unreadable." }); } }
  if (state?.productStatus === "PRODUCT_USER_ACCEPTED" && !["REPORTED", "VERIFIED"].includes(state.physicalEvidence as string)) findings.push({ code: "SFHS_ONE_SHOT_PRODUCT_ACCEPTANCE_UNBOUND", severity: "error", path: "one-shot/RUN-STATE.json", message: "PRODUCT_USER_ACCEPTED requires retained REPORTED or VERIFIED human evidence." });
  return result(findings, state as unknown as ChatRunState);
}

export async function completeChatOneShot(projectRoot: string, outputPath: string): Promise<ChatResult<{ readonly outcome: string }>> {
  const stateResult = await validateChatRunState(projectRoot); const findings = [...stateResult.findings]; const state = stateResult.value;
  if (state === undefined) return result(findings);
  const missing = state.completionPolicy.requiredBeforeCompletion.filter((gate) => !state.completedGates.includes(gate as ChatGate));
  if (missing.length > 0) findings.push({ code: "SFHS_ONE_SHOT_COMPLETION_REQUIRED_OPEN", severity: "error", path: "one-shot/RUN-STATE.json", message: `Completion requires these open gates: ${missing.join(", ")}.` });
  const project = resolve(projectRoot); const packet = join(project, "one-shot"); const artifactReference = record(state.records.artifact); let seed: ChatPhysicalTestSeed | undefined;
  if (state.completedGates.includes("PHYSICAL_SEED") || artifactReference !== undefined) {
    try {
      if (artifactReference === undefined || typeof artifactReference.path !== "string") throw new Error("missing artifact");
      const artifact = record(JSON.parse(await readFile(resolve(project, artifactReference.path), "utf8")));
      const classification = artifact?.classification === "canonical" ? "canonical" : artifact?.classification === "candidate" ? "candidate" : undefined;
      if (artifact === undefined || classification === undefined || typeof artifact.path !== "string" || typeof artifact.sha256 !== "string") throw new Error("invalid artifact");
      seed = { schema: "sfhs.one-shot-physical-test-seed@1", classification, artifact: { path: artifact.path, sha256: artifact.sha256, ...(typeof artifact.bytes === "number" ? { bytes: artifact.bytes } : {}), ...(classification === "canonical" && typeof artifact.buildId === "string" ? { buildId: artifact.buildId } : {}) }, source: state.project.source, required: ["artifact identity", "device model", "numeric browser version", "portrait viewport width/height/DPR", "landscape viewport width/height/DPR or rotate-gate screenshot", "required screenshots", "complete semantic scenario", "background/return", "audio", "performance and heat"], resultVocabulary: ["REPORTED PASS", "REPORTED FAIL"] };
    } catch { findings.push({ code: "SFHS_ONE_SHOT_PHYSICAL_SEED_INVALID", severity: "error", path: "one-shot/ARTIFACT.json", message: "The artifact record must declare a candidate or canonical path and SHA-256 before physical instructions can be generated." }); }
  }
  const outcome = findings.some((finding) => finding.severity === "error") ? "NEEDS_REPAIR" : "ONE_SHOT_COMPLETE";
  if (outcome === "ONE_SHOT_COMPLETE") {
    const output = resolve(outputPath);
    if (!inside(project, output)) return result([...findings, { code: "SFHS_ONE_SHOT_COMPLETION_OUTPUT_INVALID", severity: "error", path: outputPath, message: "Completion output must remain inside the project." }]);
    const source = await readFile(resolve(project, state.project.source.path));
    if (seed !== undefined) await writeChatJson(join(packet, "PHYSICAL-TEST-SEED.json"), seed);
    if (seed !== undefined) await writeFile(join(packet, "PHYSICAL-TEST-INSTRUCTIONS.md"), `# Physical Test Instructions\n\n**Artifact classification: ${seed.classification.toUpperCase()}**\n\nTest ${seed.artifact.path} with SHA-256 ${seed.artifact.sha256}. ${seed.classification === "candidate" ? "A candidate pass improves product evidence only; it cannot become canonical device acceptance." : "This canonical artifact is eligible for device acceptance when its verifier identity is retained."}\n\nRecord the device model, OS, numeric browser version, portrait and landscape viewport dimensions and DPR, requested screenshots, complete semantic scenario, reset, background/return, audio, performance/heat, result (REPORTED PASS or REPORTED FAIL), and notes.\n`, "utf8");
    const completion = { schema: "sfhs.one-shot-chat-completion@1", outcome, timestamp: new Date(0).toISOString(), source: state.project.source, packet: state.records, productStatus: state.productStatus, sfhsStatus: state.sfhsStatus, completedGates: state.completedGates, completionPolicy: state.completionPolicy, files: [{ path: state.project.source.path, sha256: hash(source) }], nextAction: "Run the generated physical-test instructions for the exact testable artifact." };
    await writeChatJson(join(packet, "COMPLETION.json"), completion);
    await writeChatJson(output, completion);
  }
  return result(findings, { outcome });
}
