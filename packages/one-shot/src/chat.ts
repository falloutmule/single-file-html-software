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
  const native = ["sfhsCheckout", "pnpm", "template", "adapter", "runtime", "canonicalCli", "browserRunner"].every((name) => capabilities[name]?.state === "AVAILABLE");
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
  if (options.depth === "deep") for (const name of ["playwright", "headlessWebgl", "headfulWebgl", "urlNavigation", "fileProtocol"] as const) capabilities[name] = { state: "BLOCKED_BY_POLICY", detail: "Deep browser probe requires the packaged browser helper; no helper was invoked by this collector." };
  const selection = selectChatMode(capabilities);
  return { schema: "sfhs.one-shot-preflight@1", version: 1, timestamp: (options.now ?? (() => new Date()))().toISOString(), depth: options.depth, platform: process.platform, architecture: process.arch, workingDirectory: cwd, writableOutputRoot: { state: "AVAILABLE", detail: "Project one-shot directory is writable after command validation.", value: join(cwd, "one-shot") }, runtimes, selectedRuntime: selected, capabilities, selectedExecutionMode: selection.mode, reasons: selection.reasons };
}

export async function validateChatRunState(projectRoot: string): Promise<ChatResult<ChatRunState>> {
  const path = join(resolve(projectRoot), "one-shot", "RUN-STATE.json"); const findings: ChatFinding[] = [];
  let value: unknown; try { value = JSON.parse(await readFile(path, "utf8")); } catch { return result([{ code: "SFHS_ONE_SHOT_RUN_STATE_INVALID", severity: "error", path: "one-shot/RUN-STATE.json", message: "Run state is missing or invalid JSON." }]); }
  const state = record(value); if (state?.schema !== "sfhs.one-shot-run-state@1" || state.version !== 1 || !modes.includes(state.executionMode as ChatExecutionMode) || !gates.includes(state.currentGate as ChatGate)) findings.push({ code: "SFHS_ONE_SHOT_RUN_STATE_INVALID", severity: "error", path: "one-shot/RUN-STATE.json", message: "Run state has an unsupported schema, mode, or gate." });
  const records = record(state?.records); for (const entry of Object.values(records ?? {})) { const reference = record(entry); if (typeof reference?.path !== "string" || typeof reference.sha256 !== "string" || !inside(resolve(projectRoot), resolve(projectRoot, reference.path))) { findings.push({ code: "SFHS_ONE_SHOT_RUN_STATE_REFERENCE_INVALID", severity: "error", path: "one-shot/RUN-STATE.json", message: "Run-state record references must be project-contained hashed paths." }); continue; } try { if (hash(await readFile(resolve(projectRoot, reference.path))) !== reference.sha256) findings.push({ code: "SFHS_ONE_SHOT_RUN_STATE_HASH_MISMATCH", severity: "error", path: reference.path, message: "Run-state reference hash is stale." }); } catch { findings.push({ code: "SFHS_ONE_SHOT_RUN_STATE_REFERENCE_INVALID", severity: "error", path: reference.path, message: "Run-state reference is unreadable." }); } }
  return result(findings, state as unknown as ChatRunState);
}
