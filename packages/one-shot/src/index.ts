import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const packageIdentity = "@sfhs/one-shot" as const;

export type OneShotStatus = "VERIFIED" | "REPORTED" | "INFERRED" | "PROPOSED" | "UNTESTED" | "BLOCKED" | "SUPERSEDED";
export type OneShotFindingCode =
  | "SFHS_ONE_SHOT_ARGUMENT_INVALID"
  | "SFHS_ONE_SHOT_BRIEF_INVALID"
  | "SFHS_ONE_SHOT_LANE_UNSUPPORTED"
  | "SFHS_ONE_SHOT_OUTPUT_EXISTS"
  | "SFHS_ONE_SHOT_OUTPUT_OUTSIDE_EXAMPLES"
  | "SFHS_ONE_SHOT_PACKET_MISSING"
  | "SFHS_ONE_SHOT_PACKET_INVALID"
  | "SFHS_ONE_SHOT_ADAPTER_EVIDENCE_REQUIRED"
  | "SFHS_ONE_SHOT_CANONICAL_EVIDENCE_REQUIRED"
  | "SFHS_ONE_SHOT_PHYSICAL_EVIDENCE_REQUIRED"
  | "SFHS_ONE_SHOT_SOURCE_PACK_INVALID"
  | "SFHS_ONE_SHOT_IO_FAILURE";

export interface OneShotFinding {
  readonly code: OneShotFindingCode;
  readonly severity: "error" | "warning";
  readonly path: string;
  readonly message: string;
}

export interface OneShotResult {
  readonly valid: boolean;
  readonly findings: readonly OneShotFinding[];
}

export interface OneShotInspection extends OneShotResult {
  readonly projectRoot: string;
  readonly packet: Readonly<Record<string, OneShotStatus | "MISSING" | "INVALID">>;
  readonly lane?: string;
}

export interface OneShotCanonicalArtifact {
  readonly path: string;
  readonly sha256: string;
  readonly buildId: string;
}

interface BriefRecord {
  readonly schema: "sfhs.one-shot-brief@1";
  readonly project: { readonly id: string; readonly title: string };
  readonly lane: { readonly id: string };
  readonly target: { readonly device: string; readonly orientation: string };
  readonly status: OneShotStatus;
}

interface SourcePackEntry {
  readonly path: string;
  readonly authority: "normative" | "explanatory" | "historical";
  readonly priority: number;
  readonly required: boolean;
  readonly lanes?: readonly string[];
  readonly supersedes?: readonly string[];
}

interface SourcePackManifest {
  readonly schema: "sfhs.one-shot-source-pack@1";
  readonly version: string;
  readonly compatibility: { readonly sfhs: string; readonly node: string; readonly adapter: string };
  readonly authorityOrder: readonly string[];
  readonly superseded: readonly string[];
  readonly sources: readonly SourcePackEntry[];
}

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const oneShotRoot = join(repositoryRoot, "one-shot");
const templateRoot = join(oneShotRoot, "project-files");
const templateProjectRoot = join(repositoryRoot, "examples", "pixi-minimal");
const packetFiles = Object.freeze([
  "ONE-SHOT-BRIEF.md",
  "AUTHORIZED-SCOPE.md",
  "DECISIONS.md",
  "ISSUES-ENCOUNTERED.md",
  "ACCEPTANCE-CRITERIA.md",
  "INTAKE-STATUS.md",
  "VERIFICATION-REPORT.md"
]);
const statuses = new Set<OneShotStatus>(["VERIFIED", "REPORTED", "INFERRED", "PROPOSED", "UNTESTED", "BLOCKED", "SUPERSEDED"]);

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isInside(root: string, candidate: string): boolean {
  const difference = relative(root, candidate);
  return difference === "" || (difference !== ".." && !difference.startsWith(`..${sep}`) && !isAbsolute(difference));
}

function sorted(findings: readonly OneShotFinding[]): readonly OneShotFinding[] {
  return Object.freeze([...findings].sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code)));
}

function result(findings: readonly OneShotFinding[]): OneShotResult {
  const ordered = sorted(findings);
  return Object.freeze({ valid: !ordered.some((finding) => finding.severity === "error"), findings: ordered });
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function parseOneShotFrontMatter(contents: string): unknown {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(contents);
  if (match?.[1] === undefined) throw new Error("Missing JSON front matter.");
  return JSON.parse(match[1]) as unknown;
}

function briefFrom(value: unknown): BriefRecord | undefined {
  const record = object(value);
  const project = object(record?.project);
  const lane = object(record?.lane);
  const target = object(record?.target);
  if (
    record?.schema !== "sfhs.one-shot-brief@1" ||
    typeof project?.id !== "string" || !/^[a-z0-9][a-z0-9-]{1,63}$/u.test(project.id) ||
    typeof project.title !== "string" || project.title.length === 0 ||
    typeof lane?.id !== "string" ||
    typeof target?.device !== "string" || typeof target.orientation !== "string" ||
    typeof record.status !== "string" || !statuses.has(record.status as OneShotStatus)
  ) return undefined;
  return record as unknown as BriefRecord;
}

export async function readOneShotBrief(path: string): Promise<BriefRecord> {
  let parsed: unknown;
  try {
    parsed = parseOneShotFrontMatter(await readFile(path, "utf8"));
  } catch {
    throw new Error("SFHS_ONE_SHOT_BRIEF_INVALID");
  }
  const brief = briefFrom(parsed);
  if (brief === undefined) throw new Error("SFHS_ONE_SHOT_BRIEF_INVALID");
  return brief;
}

function renderTemplate(template: string, brief: BriefRecord, revision: string): string {
  return template
    .replaceAll("{{PROJECT_ID}}", brief.project.id)
    .replaceAll("{{PROJECT_TITLE}}", brief.project.title)
    .replaceAll("{{LANE_ID}}", brief.lane.id)
    .replaceAll("{{TARGET_DEVICE}}", brief.target.device)
    .replaceAll("{{TARGET_ORIENTATION}}", brief.target.orientation)
    .replaceAll("{{SFHS_REVISION}}", revision);
}

async function renderPacket(outputRoot: string, brief: BriefRecord, revision: string): Promise<void> {
  const packetRoot = join(outputRoot, "one-shot");
  await mkdir(packetRoot, { recursive: true });
  for (const name of packetFiles) {
    const templateName = name.replace(/\.md$/u, ".template.md");
    const template = await readFile(join(templateRoot, templateName), "utf8");
    await writeFile(join(packetRoot, name), renderTemplate(template, brief, revision), "utf8");
  }
}

export async function initializeOneShotProject(options: {
  readonly briefPath: string;
  readonly outputPath: string;
  readonly lane: string;
  readonly revision: string;
}): Promise<OneShotResult> {
  const findings: OneShotFinding[] = [];
  let brief: BriefRecord | undefined;
  try { brief = await readOneShotBrief(options.briefPath); } catch {
    findings.push({ code: "SFHS_ONE_SHOT_BRIEF_INVALID", severity: "error", path: options.briefPath, message: "Brief must use valid sfhs.one-shot-brief@1 JSON front matter." });
  }
  if (brief !== undefined && (options.lane !== "pixi-v8" || brief.lane.id !== options.lane)) {
    findings.push({ code: "SFHS_ONE_SHOT_LANE_UNSUPPORTED", severity: "error", path: "/lane", message: "Only the current pixi-v8 lane is initializable, and it must match the brief." });
  }
  const examplesRoot = resolve(repositoryRoot, "examples");
  const outputRoot = resolve(options.outputPath);
  if (!isInside(examplesRoot, outputRoot) || outputRoot === examplesRoot) {
    findings.push({ code: "SFHS_ONE_SHOT_OUTPUT_OUTSIDE_EXAMPLES", severity: "error", path: options.outputPath, message: "One-Shot initialization must create a repository-contained project under examples/." });
  }
  if (await stat(outputRoot).then(() => true).catch(() => false)) {
    findings.push({ code: "SFHS_ONE_SHOT_OUTPUT_EXISTS", severity: "error", path: outputRoot, message: "One-Shot initialization never overwrites an existing directory." });
  }
  if (!result(findings).valid || brief === undefined) return result(findings);
  const temporaryRoot = join(examplesRoot, `.${brief.project.id}-one-shot-${randomUUID()}`);
  try {
    await cp(templateProjectRoot, temporaryRoot, {
      recursive: true,
      filter: (source) => !["dist", "node_modules", "test-results"].includes(basename(source))
    });
    const projectManifestPath = join(temporaryRoot, "sfhs.project.json");
    const manifest = JSON.parse(await readFile(projectManifestPath, "utf8")) as Record<string, unknown>;
    manifest.project = { id: brief.project.id, title: brief.project.title, version: "0.1.0" };
    await writeFile(projectManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    const packagePath = join(temporaryRoot, "package.json");
    const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as Record<string, unknown>;
    packageJson.name = `@sfhs/example-${brief.project.id}`;
    await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
    await renderPacket(temporaryRoot, brief, options.revision);
    await rename(temporaryRoot, outputRoot);
  } catch {
    await rm(temporaryRoot, { recursive: true, force: true }).catch(() => undefined);
    findings.push({ code: "SFHS_ONE_SHOT_IO_FAILURE", severity: "error", path: outputRoot, message: "One-Shot could not safely materialize the current Pixi template and packet." });
  }
  return result(findings);
}

function validPacketValue(name: string, value: Record<string, unknown>): boolean {
  const facts = object(value.facts);
  if (typeof value.status !== "string" || !statuses.has(value.status as OneShotStatus)) return false;
  if (name === "ONE-SHOT-BRIEF.md") return briefFrom(value) !== undefined;
  if (name === "AUTHORIZED-SCOPE.md") return value.schema === "sfhs.one-shot-scope@1" && typeof facts?.sfhsRevision === "string" && typeof facts?.lane === "string" && typeof facts?.remoteMutationAuthorized === "boolean";
  if (name === "DECISIONS.md") return value.schema === "sfhs.one-shot-decision-log@1" && Array.isArray(facts?.decisions);
  if (name === "ISSUES-ENCOUNTERED.md") return value.schema === "sfhs.one-shot-issue-log@1" && Array.isArray(facts?.issues);
  if (name === "ACCEPTANCE-CRITERIA.md") return value.schema === "sfhs.one-shot-acceptance@1" && typeof facts?.physicalDevice === "string";
  if (name === "INTAKE-STATUS.md") return value.schema === "sfhs.one-shot-intake@1" && object(facts?.adapterIntegration) !== undefined && typeof facts?.physicalDevice === "string";
  if (name === "VERIFICATION-REPORT.md") {
    const artifact = object(facts?.artifact);
    return value.schema === "sfhs.one-shot-report@1" && artifact !== undefined && ["canonical", "candidate", "none"].includes(artifact.classification as string) && typeof facts?.physicalDevice === "string";
  }
  return false;
}

async function packetStatus(projectRoot: string, name: string): Promise<{ readonly status: OneShotStatus | "MISSING" | "INVALID"; readonly value?: Record<string, unknown> }> {
  try {
    const value = object(parseOneShotFrontMatter(await readFile(join(projectRoot, "one-shot", name), "utf8")));
    if (value === undefined || !validPacketValue(name, value)) return { status: "INVALID" };
    return { status: value.status as OneShotStatus, value };
  } catch { return { status: "MISSING" }; }
}

export async function inspectOneShotProject(projectRoot: string): Promise<OneShotInspection> {
  const resolved = resolve(projectRoot);
  const findings: OneShotFinding[] = [];
  const packet: Record<string, OneShotStatus | "MISSING" | "INVALID"> = {};
  let lane: string | undefined;
  for (const name of packetFiles) {
    const state = await packetStatus(resolved, name);
    packet[name] = state.status;
    if (state.status === "MISSING") findings.push({ code: "SFHS_ONE_SHOT_PACKET_MISSING", severity: "error", path: `one-shot/${name}`, message: "Required One-Shot packet file is missing." });
    if (state.status === "INVALID") findings.push({ code: "SFHS_ONE_SHOT_PACKET_INVALID", severity: "error", path: `one-shot/${name}`, message: "Packet JSON front matter requires its schema-specific machine facts and a known status." });
    if (name === "ONE-SHOT-BRIEF.md" && state.value !== undefined) lane = object(state.value.lane)?.id as string | undefined;
  }
  const basic = result(findings);
  return Object.freeze({ ...basic, projectRoot: resolved, packet: Object.freeze(packet), ...(lane === undefined ? {} : { lane }) });
}

export async function auditOneShotProject(projectRoot: string, options: { readonly canonicalArtifact?: OneShotCanonicalArtifact }): Promise<OneShotInspection> {
  const inspection = await inspectOneShotProject(projectRoot);
  const findings = [...inspection.findings];
  const resolved = resolve(projectRoot);
  const intake = await packetStatus(resolved, "INTAKE-STATUS.md");
  const verification = await packetStatus(resolved, "VERIFICATION-REPORT.md");
  const intakeFacts = object(intake.value?.facts);
  const integration = object(intakeFacts?.adapterIntegration);
  if (integration?.status === "VERIFIED" && (!Array.isArray(integration.evidence) || integration.evidence.length === 0)) {
    findings.push({ code: "SFHS_ONE_SHOT_ADAPTER_EVIDENCE_REQUIRED", severity: "error", path: "one-shot/INTAKE-STATUS.md", message: "Verified adapter integration requires retained renderer or browser evidence." });
  }
  const verificationFacts = object(verification.value?.facts);
  const artifact = object(verificationFacts?.artifact);
  const canonicalMatches = artifact?.path === options.canonicalArtifact?.path && artifact?.sha256 === options.canonicalArtifact?.sha256 && artifact?.buildId === options.canonicalArtifact?.buildId;
  if (artifact?.classification === "canonical" && (options.canonicalArtifact === undefined || !canonicalMatches || verification.status !== "VERIFIED")) {
    findings.push({ code: "SFHS_ONE_SHOT_CANONICAL_EVIDENCE_REQUIRED", severity: "error", path: "one-shot/VERIFICATION-REPORT.md", message: "A canonical claim requires a successful real SFHS verifier result and VERIFIED report." });
  }
  if (artifact?.classification === "candidate" && verification.status === "VERIFIED") {
    findings.push({ code: "SFHS_ONE_SHOT_CANONICAL_EVIDENCE_REQUIRED", severity: "error", path: "one-shot/VERIFICATION-REPORT.md", message: "A candidate artifact cannot use a VERIFIED report status; retain candidate or blocked truth." });
  }
  for (const [name, state] of [["ACCEPTANCE-CRITERIA.md", await packetStatus(resolved, "ACCEPTANCE-CRITERIA.md")], ["INTAKE-STATUS.md", intake], ["VERIFICATION-REPORT.md", verification]] as const) {
    const facts = object(state.value?.facts);
    if (facts?.physicalDevice === "VERIFIED" && (!Array.isArray(facts.physicalEvidence) || facts.physicalEvidence.length === 0)) {
      findings.push({ code: "SFHS_ONE_SHOT_PHYSICAL_EVIDENCE_REQUIRED", severity: "error", path: `one-shot/${name}`, message: "Physical-device acceptance requires retained exact device evidence, not an unbound VERIFIED claim." });
    }
  }
  const basic = result(findings);
  return Object.freeze({ ...basic, projectRoot: inspection.projectRoot, packet: inspection.packet, ...(inspection.lane === undefined ? {} : { lane: inspection.lane }) });
}

export async function readSourcePackManifest(): Promise<SourcePackManifest> {
  const value = JSON.parse(await readFile(join(oneShotRoot, "source-pack-manifest.json"), "utf8")) as unknown;
  const manifest = object(value);
  if (
    manifest?.schema !== "sfhs.one-shot-source-pack@1" || typeof manifest.version !== "string" ||
    !Array.isArray(manifest.authorityOrder) || !Array.isArray(manifest.superseded) || !Array.isArray(manifest.sources)
  ) throw new Error("SFHS_ONE_SHOT_SOURCE_PACK_INVALID");
  return manifest as unknown as SourcePackManifest;
}

export async function buildOneShotKit(outputPath: string, options: { readonly revision: string }): Promise<OneShotResult> {
  const findings: OneShotFinding[] = [];
  const target = resolve(outputPath);
  if (await stat(target).then(() => true).catch(() => false)) {
    findings.push({ code: "SFHS_ONE_SHOT_OUTPUT_EXISTS", severity: "error", path: target, message: "Kit output must be a new path so old evidence cannot be overwritten." });
    return result(findings);
  }
  try {
    const manifest = await readSourcePackManifest();
    const entries = [...manifest.sources].sort((left, right) => left.priority - right.priority || left.path.localeCompare(right.path));
    if (entries.some((entry, index) => entry.priority !== index + 1) || new Set(entries.map((entry) => entry.path)).size !== entries.length) throw new Error("invalid entries");
    const files: Array<{ readonly path: string; readonly sha256: string; readonly content: string; readonly authority: string; readonly priority: number; readonly required: boolean; readonly lanes?: readonly string[]; readonly supersedes?: readonly string[] }> = [];
    for (const entry of entries) {
      const source = resolve(repositoryRoot, entry.path);
      if (!isInside(repositoryRoot, source)) throw new Error("path escape");
      const content = await readFile(source, "utf8");
      files.push({ path: entry.path, sha256: sha256(content), content, authority: entry.authority, priority: entry.priority, required: entry.required, ...(entry.lanes === undefined ? {} : { lanes: entry.lanes }), ...(entry.supersedes === undefined ? {} : { supersedes: entry.supersedes }) });
    }
    await mkdir(dirname(target), { recursive: true });
    const archive = {
      schema: "sfhs.one-shot-kit@1",
      version: manifest.version,
      repository: { revision: options.revision, compatibility: manifest.compatibility },
      sourcePack: { authorityOrder: manifest.authorityOrder, superseded: manifest.superseded, sources: entries },
      files
    };
    await writeFile(target, `${JSON.stringify(archive, null, 2)}\n`, "utf8");
  } catch {
    findings.push({ code: "SFHS_ONE_SHOT_SOURCE_PACK_INVALID", severity: "error", path: "one-shot/source-pack-manifest.json", message: "Source pack entries must be unique, ordered, repository-contained, and readable." });
  }
  return result(findings);
}
