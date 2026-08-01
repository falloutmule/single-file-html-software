/**
 * Chat-to-Codex graduation is deliberately an intake and audit layer.  It
 * never bundles, verifies, or rewrites a product: those remain SFHS core and
 * agent-authored migration work respectively.
 */
import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, readFile, readdir, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { inflateRaw } from "node:zlib";
import { promisify } from "node:util";
import { stableJson, writeChatJson } from "./chat.ts";

const inflateRawAsync = promisify(inflateRaw);
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export type GraduationStage =
  | "GRADUATION_UNINSPECTED" | "GRADUATION_INSPECTED" | "GRADUATION_PLAN_READY"
  | "GRADUATION_IMPORTED" | "GRADUATION_MIGRATING" | "GRADUATION_CANONICALIZED"
  | "GRADUATION_PHYSICAL_PENDING" | "GRADUATION_COMPLETE" | "GRADUATION_NEEDS_REPAIR"
  | "GRADUATION_BLOCKED";
export type SourceAuthority = "AUTHORITATIVE" | "CANDIDATE_SOURCE" | "SUPERSEDED_SOURCE" | "AMBIGUOUS" | "HISTORICAL" | "REJECTED";
export type BehaviorClassification = "PRESERVE" | "KNOWN_DEFECT" | "UNKNOWN" | "DEFERRED" | "NOT_APPLICABLE";
export type GraduationStrategy = "DIRECT_CANONICALIZATION" | "ADAPTER_REWIRE" | "SALVAGEABLE_MIGRATION" | "ARCHITECTURE_MISMATCH";
export type ArchitectureFact = "DETECTED" | "NOT_DETECTED" | "UNKNOWN";
export type GraduationFindingCode =
  | "SFHS_GRAD_ARGUMENT_INVALID" | "SFHS_GRAD_INPUT_INVALID" | "SFHS_GRAD_ARCHIVE_HASH_MISMATCH"
  | "SFHS_GRAD_ARCHIVE_PATH_UNSAFE" | "SFHS_GRAD_ARCHIVE_LIMIT_EXCEEDED" | "SFHS_GRAD_ARCHIVE_FEATURE_UNSUPPORTED"
  | "SFHS_GRAD_SOURCE_MISSING" | "SFHS_GRAD_SOURCE_AUTHORITY_AMBIGUOUS" | "SFHS_GRAD_SOURCE_LINEAGE_INCOMPLETE"
  | "SFHS_GRAD_SOURCE_MANIFEST_INVALID" | "SFHS_GRAD_BEHAVIOR_BASELINE_INCOMPLETE" | "SFHS_GRAD_STRATEGY_UNSUPPORTED"
  | "SFHS_GRAD_ADAPTER_REWIRE_REQUIRED" | "SFHS_GRAD_MODULE_INTEGRATION_REQUIRED" | "SFHS_GRAD_LOOP_REWIRE_REQUIRED"
  | "SFHS_GRAD_INPUT_REWIRE_REQUIRED" | "SFHS_GRAD_ASSET_PIPELINE_REWIRE_REQUIRED" | "SFHS_GRAD_PROJECT_CONTRACT_REWIRE_REQUIRED" | "SFHS_GRAD_ASSET_SPATIAL_REQUIRED"
  | "SFHS_GRAD_CANDIDATE_TOOLING_HISTORICAL_ONLY" | "SFHS_GRAD_CANDIDATE_IN_CANONICAL_DIST"
  | "SFHS_GRAD_MATERIALIZATION_INVALID" | "SFHS_GRAD_MATERIALIZATION_STALE" | "SFHS_GRAD_BEHAVIOR_REGRESSION"
  | "SFHS_GRAD_PRODUCT_REPAIR_REQUIRED" | "SFHS_GRAD_CANONICAL_EVIDENCE_REQUIRED"
  | "SFHS_GRAD_BROWSER_EVIDENCE_REQUIRED" | "SFHS_GRAD_PHYSICAL_EVIDENCE_INCOMPLETE"
  | "SFHS_GRAD_REMOTE_ACTION_NOT_AUTHORIZED" | "SFHS_GRAD_IO_FAILURE";

export interface GraduationFinding { readonly code: GraduationFindingCode; readonly severity: "error" | "warning"; readonly path: string; readonly message: string; }
export interface GraduationResult<T = undefined> { readonly valid: boolean; readonly findings: readonly GraduationFinding[]; readonly value?: T; }
export interface GraduationLimits { readonly maxEntries: number; readonly maxEntryBytes: number; readonly maxExpandedBytes: number; readonly maxCompressionRatio: number; }
export interface GraduationFile { readonly path: string; readonly bytes: number; readonly sha256: string; readonly content?: Uint8Array; }
export interface GraduationInput { readonly kind: "directory" | "zip"; readonly path: string; readonly bytes?: number; readonly sha256?: string; readonly files: readonly GraduationFile[]; }
export interface GraduationSourceCandidate { readonly id: string; readonly root: string; readonly authority: SourceAuthority; readonly input: string; readonly manifestPath?: string; readonly manifestSha256?: string; readonly reason: string; }
export interface GraduationIntake {
  readonly schema: "sfhs.graduation-intake@1"; readonly version: 1; readonly stage: GraduationStage;
  readonly inputs: readonly GraduationInput[]; readonly sourceCandidates: readonly GraduationSourceCandidate[];
  readonly candidateArtifacts: readonly GraduationFile[]; readonly canonicalArtifacts: readonly GraduationFile[];
  readonly packetRecords: readonly GraduationFile[]; readonly evidenceCollections: readonly GraduationFile[];
  readonly findings: readonly GraduationFinding[];
}
export interface SourceLineage { readonly schema: "sfhs.source-lineage@1"; readonly version: 1; readonly selectedSourceId?: string; readonly revisions: readonly GraduationSourceCandidate[]; }
export interface ArchitectureInspection { readonly facts: Readonly<Record<string, ArchitectureFact>>; readonly evidence: Readonly<Record<string, readonly string[]>>; }
export interface BehaviorBaseline { readonly schema: "sfhs.graduation-behavior-baseline@1"; readonly version: 1; readonly entries: readonly { readonly id: string; readonly description: string; readonly classification: BehaviorClassification; readonly migrationRequirement: string; readonly evidence: readonly string[]; }[]; }
export interface MigrationPlan { readonly schema: "sfhs.migration-plan@1"; readonly version: 1; readonly sourceId: string; readonly strategy: GraduationStrategy; readonly modifiers: readonly string[]; readonly targetLane: string; readonly inspection: ArchitectureInspection; readonly preserve: readonly string[]; readonly rewire: readonly string[]; readonly replace: readonly string[]; readonly historicalOnly: readonly string[]; readonly productRepairs: readonly string[]; readonly forbidden: readonly string[]; readonly remoteAuthorized: false; }
export interface GraduationState { readonly schema: "sfhs.graduation-state@1"; readonly version: 1; readonly stage: GraduationStage; readonly sourceId: string; readonly projectRoot: string; readonly strategy: GraduationStrategy; readonly records: Readonly<Record<string, { readonly path: string; readonly sha256: string }>>; readonly productStatus: string; readonly sfhsStatus: string; readonly evidenceStatus: string; readonly physicalStatus: string; readonly requiredRepairs: readonly string[]; readonly deferredWork: readonly string[]; readonly nextAction: string; }

export const graduationLimits: GraduationLimits = Object.freeze({ maxEntries: 512, maxEntryBytes: 8 * 1024 * 1024, maxExpandedBytes: 32 * 1024 * 1024, maxCompressionRatio: 100 });
const sourceFile = /(?:^|\/)(?:src|tests|public)\/|(?:^|\/)(?:sfhs\.project\.json|package\.json|SOURCE-MANIFEST\.json)$/u;
const historicalDirectoryNames = new Set([".git", "node_modules", "dist", "candidate", ".candidate", ".sfhs-evidence", "test-results", ".intake"]);

function hash(value: Uint8Array | string): string { return createHash("sha256").update(value).digest("hex"); }
function asObject(value: unknown): Record<string, unknown> | undefined { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function sorted(findings: readonly GraduationFinding[]): readonly GraduationFinding[] { return Object.freeze([...findings].sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code))); }
function result<T>(findings: readonly GraduationFinding[], value?: T): GraduationResult<T> { const ordered = sorted(findings); return Object.freeze({ valid: !ordered.some((finding) => finding.severity === "error"), findings: ordered, ...(value === undefined ? {} : { value }) }); }
function inside(root: string, candidate: string): boolean { const value = relative(root, candidate); return value === "" || (!value.startsWith(`..${sep}`) && value !== ".." && !isAbsolute(value)); }
function crc32(bytes: Uint8Array): number { let value = 0xffffffff; for (const byte of bytes) { value ^= byte; for (let i = 0; i < 8; i += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; }
function u16(bytes: Uint8Array, offset: number): number { return bytes[offset]! | (bytes[offset + 1]! << 8); }
function u32(bytes: Uint8Array, offset: number): number { return (bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16) | (bytes[offset + 3]! << 24)) >>> 0; }
function failure(code: GraduationFindingCode, path: string, message: string): GraduationFinding { return { code, severity: "error", path, message }; }
function warning(code: GraduationFindingCode, path: string, message: string): GraduationFinding { return { code, severity: "warning", path, message }; }

/** Normalizes a zip name before it ever reaches the filesystem. */
export function normalizeGraduationArchivePath(raw: string): string | undefined {
  const normalized = raw.replaceAll("\\", "/");
  if (raw.length === 0 || normalized.startsWith("/") || /^[A-Za-z]:/u.test(normalized) || normalized.includes("\0")) return undefined;
  const parts = normalized.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return undefined;
  return normalized;
}

interface ZipDirectoryEntry { readonly path: string; readonly compression: number; readonly flags: number; readonly crc: number; readonly compressed: number; readonly expanded: number; readonly localOffset: number; }

function eocd(bytes: Uint8Array): number | undefined {
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) if (u32(bytes, offset) === 0x06054b50) return offset;
  return undefined;
}

/** Read ZIP central directories without extracting or running supplied content. */
export async function inspectGraduationZip(bytes: Uint8Array, limits: GraduationLimits = graduationLimits, nestedDepth = 0): Promise<GraduationResult<readonly GraduationFile[]>> {
  const findings: GraduationFinding[] = [];
  const end = eocd(bytes);
  if (end === undefined || end + 22 > bytes.length) return result([failure("SFHS_GRAD_INPUT_INVALID", "/archive", "ZIP end-of-central-directory record is missing or truncated.")]);
  const disk = u16(bytes, end + 4); const centralDisk = u16(bytes, end + 6); const entries = u16(bytes, end + 8); const totalEntries = u16(bytes, end + 10); const centralBytes = u32(bytes, end + 12); const centralOffset = u32(bytes, end + 16); const commentLength = u16(bytes, end + 20);
  if (disk !== 0 || centralDisk !== 0 || entries !== totalEntries || entries === 0xffff || centralOffset === 0xffffffff || centralBytes === 0xffffffff) return result([failure("SFHS_GRAD_ARCHIVE_FEATURE_UNSUPPORTED", "/archive", "Multi-disk and Zip64 archives are not supported by the bounded graduation intake.")]);
  if (end + 22 + commentLength !== bytes.length || entries > limits.maxEntries || centralOffset + centralBytes > end) return result([failure(entries > limits.maxEntries ? "SFHS_GRAD_ARCHIVE_LIMIT_EXCEEDED" : "SFHS_GRAD_INPUT_INVALID", "/archive", entries > limits.maxEntries ? "Archive exceeds the maximum entry count." : "ZIP central-directory bounds are invalid.")]);
  const records: ZipDirectoryEntry[] = []; const paths = new Set<string>(); let expandedTotal = 0; let at = centralOffset;
  for (let index = 0; index < entries; index += 1) {
    if (at + 46 > centralOffset + centralBytes || u32(bytes, at) !== 0x02014b50) return result([failure("SFHS_GRAD_INPUT_INVALID", "/archive", "ZIP central-directory entry is malformed.")]);
    const flags = u16(bytes, at + 8); const compression = u16(bytes, at + 10); const checksum = u32(bytes, at + 16); const compressed = u32(bytes, at + 20); const expanded = u32(bytes, at + 24); const nameLength = u16(bytes, at + 28); const extraLength = u16(bytes, at + 30); const comment = u16(bytes, at + 32); const localOffset = u32(bytes, at + 42); const endAt = at + 46 + nameLength + extraLength + comment;
    if (endAt > centralOffset + centralBytes) return result([failure("SFHS_GRAD_INPUT_INVALID", "/archive", "ZIP entry fields exceed the central-directory bounds.")]);
    let rawName: string; try { rawName = textDecoder.decode(bytes.subarray(at + 46, at + 46 + nameLength)); } catch { return result([failure("SFHS_GRAD_ARCHIVE_PATH_UNSAFE", `/entries/${index}`, "ZIP filename is not valid UTF-8.")]); }
    const directoryEntry = /[\\/]$/u.test(rawName);
    const path = normalizeGraduationArchivePath(directoryEntry ? rawName.replace(/[\\/]+$/u, "") : rawName);
    if (path === undefined || paths.has(path)) return result([failure("SFHS_GRAD_ARCHIVE_PATH_UNSAFE", rawName, path === undefined ? "Archive entry path is absolute, traversing, or otherwise unsafe." : "Archive contains duplicate normalized paths.")]);
    if ((flags & 1) !== 0 || compression !== 0 && compression !== 8) return result([failure("SFHS_GRAD_ARCHIVE_FEATURE_UNSUPPORTED", path, (flags & 1) !== 0 ? "Encrypted ZIP entries are not supported." : "ZIP compression method is not supported.")]);
    if (directoryEntry && (compressed !== 0 || expanded !== 0)) return result([failure("SFHS_GRAD_INPUT_INVALID", path, "ZIP directory entries must not contain file data.")]);
    if (expanded > limits.maxEntryBytes || expandedTotal + expanded > limits.maxExpandedBytes || (compressed > 0 && expanded / compressed > limits.maxCompressionRatio) || (compressed === 0 && expanded > 0)) return result([failure("SFHS_GRAD_ARCHIVE_LIMIT_EXCEEDED", path, "Archive entry exceeds configured expanded-size or compression-ratio limits.")]);
    if (localOffset + 30 > bytes.length || u32(bytes, localOffset) !== 0x04034b50) return result([failure("SFHS_GRAD_INPUT_INVALID", path, "ZIP local-file header is missing or malformed.")]);
    const localFlags = u16(bytes, localOffset + 6); const localCompression = u16(bytes, localOffset + 8); const localNameLength = u16(bytes, localOffset + 26); const localExtraLength = u16(bytes, localOffset + 28); const contentOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (contentOffset > bytes.length || localFlags !== flags || localCompression !== compression || localNameLength !== nameLength || !bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength).every((value, offset) => value === bytes[at + 46 + offset])) return result([failure("SFHS_GRAD_INPUT_INVALID", path, "ZIP local-file header does not match its central-directory entry.")]);
    if (contentOffset + compressed > bytes.length) return result([failure("SFHS_GRAD_INPUT_INVALID", path, "ZIP entry data is truncated.")]);
    paths.add(path); expandedTotal += expanded; if (!directoryEntry) records.push({ path, compression, flags, crc: checksum, compressed, expanded, localOffset }); at = endAt;
  }
  if (at !== centralOffset + centralBytes) return result([failure("SFHS_GRAD_INPUT_INVALID", "/archive", "ZIP central-directory length is inconsistent.")]);
  const files: GraduationFile[] = [];
  for (const entry of records) {
    const localNameLength = u16(bytes, entry.localOffset + 26); const localExtraLength = u16(bytes, entry.localOffset + 28); const contentOffset = entry.localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(contentOffset, contentOffset + entry.compressed);
    let content: Uint8Array;
    try { content = entry.compression === 0 ? new Uint8Array(compressed) : new Uint8Array(await inflateRawAsync(compressed)); } catch { return result([failure("SFHS_GRAD_INPUT_INVALID", entry.path, "ZIP deflate data could not be decoded.")]); }
    if (content.length !== entry.expanded || crc32(content) !== entry.crc) return result([failure("SFHS_GRAD_ARCHIVE_HASH_MISMATCH", entry.path, "ZIP entry CRC or declared uncompressed size does not match its decoded bytes.")]);
    if (entry.path.toLowerCase().endsWith(".zip") && nestedDepth >= 1) findings.push(failure("SFHS_GRAD_ARCHIVE_FEATURE_UNSUPPORTED", entry.path, "Nested archive exceeds the one-level graduation inspection limit."));
    files.push({ path: entry.path, bytes: content.length, sha256: hash(content), content });
  }
  return result(findings, Object.freeze(files));
}

async function expandNestedArchiveFiles(files: readonly GraduationFile[], limits: GraduationLimits): Promise<GraduationResult<readonly GraduationFile[]>> {
  const findings: GraduationFinding[] = []; const expanded: GraduationFile[] = []; const paths = new Set<string>();
  let expandedBytes = 0;
  for (const file of files) {
    if (paths.has(file.path)) return result([failure("SFHS_GRAD_ARCHIVE_PATH_UNSAFE", file.path, "Nested archive collides with an existing normalized archive path.")]);
    paths.add(file.path); expanded.push(file); expandedBytes += file.bytes;
    if (!file.path.toLowerCase().endsWith(".zip")) continue;
    const nested = await inspectGraduationZip(file.content!, limits, 1);
    findings.push(...nested.findings);
    if (!nested.valid || nested.value === undefined) {
      findings.push(failure("SFHS_GRAD_INPUT_INVALID", file.path, "Nested graduation archive could not be safely inspected."));
      continue;
    }
    for (const nestedFile of nested.value) {
      if (paths.has(nestedFile.path)) return result([...findings, failure("SFHS_GRAD_ARCHIVE_PATH_UNSAFE", nestedFile.path, "Nested archive entry collides with an outer or sibling normalized path.")]);
      paths.add(nestedFile.path); expandedBytes += nestedFile.bytes;
      if (expanded.length + 1 > limits.maxEntries || expandedBytes > limits.maxExpandedBytes) return result([...findings, failure("SFHS_GRAD_ARCHIVE_LIMIT_EXCEEDED", file.path, "Nested archive entries exceed the global graduation intake limits.")]);
      expanded.push(nestedFile);
    }
  }
  return result(findings, Object.freeze(expanded));
}

/**
 * Extract only an already validated archive into a newly created directory.
 * The destination is never replaced, and all filesystem paths originate from
 * normalized central-directory names above.
 */
export async function extractGraduationZip(bytes: Uint8Array, destination: string, limits: GraduationLimits = graduationLimits): Promise<GraduationResult<{ readonly path: string; readonly files: readonly GraduationFile[] }>> {
  const inspected = await inspectGraduationZip(bytes, limits);
  if (!inspected.valid || inspected.value === undefined) return result(inspected.findings);
  const output = resolve(destination);
  if (await stat(output).then(() => true).catch(() => false)) return result([...inspected.findings, failure("SFHS_GRAD_IO_FAILURE", output, "Graduation extraction never overwrites an existing directory.")]);
  const staging = join(dirname(output), `.${basename(output)}.extract-${randomUUID()}`);
  try {
    await mkdir(staging, { recursive: true });
    for (const file of inspected.value) {
      const target = resolve(staging, file.path);
      if (!inside(staging, target)) throw new Error("unsafe");
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content!);
    }
    await rename(staging, output);
    return result(inspected.findings, { path: output, files: inspected.value });
  } catch {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    return result([...inspected.findings, failure("SFHS_GRAD_IO_FAILURE", output, "Graduation archive extraction failed transactionally; no destination was created.")]);
  }
}

/** Materialize exactly the lineage-selected source root from inspected input. */
export async function extractGraduationSelectedSource(intake: GraduationIntake, lineage: SourceLineage, destination: string): Promise<GraduationResult<{ readonly path: string; readonly files: readonly GraduationFile[] }>> {
  const selected = lineage.revisions.find((candidate) => candidate.id === lineage.selectedSourceId);
  if (selected === undefined || selected.authority !== "AUTHORITATIVE") return result([failure("SFHS_GRAD_SOURCE_AUTHORITY_AMBIGUOUS", "SOURCE-LINEAGE.json", "A selected authoritative source is required before extraction.")]);
  const sourceFiles = intake.inputs.flatMap((input) => input.files).filter((file) => file.path.startsWith(selected.root));
  if (sourceFiles.length === 0) return result([failure("SFHS_GRAD_SOURCE_MISSING", selected.root, "The selected source root has no retained inspected files.")]);
  const output = resolve(destination);
  if (await stat(output).then(() => true).catch(() => false)) return result([failure("SFHS_GRAD_IO_FAILURE", output, "Selected source extraction never overwrites an existing directory.")]);
  const staging = join(dirname(output), `.${basename(output)}.selected-source-${randomUUID()}`);
  try {
    await mkdir(staging, { recursive: true });
    for (const file of sourceFiles) {
      const path = normalizeGraduationArchivePath(file.path.slice(selected.root.length));
      if (path === undefined) throw new Error("unsafe");
      const target = resolve(staging, path); if (!inside(staging, target)) throw new Error("unsafe");
      await mkdir(dirname(target), { recursive: true }); await writeFile(target, file.content!);
    }
    await rename(staging, output); return result([], { path: output, files: sourceFiles });
  } catch {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    return result([failure("SFHS_GRAD_IO_FAILURE", output, "Selected source extraction failed transactionally; no destination was created.")]);
  }
}

async function listDirectory(root: string): Promise<readonly GraduationFile[]> {
  const files: GraduationFile[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name); const path = relative(root, full).replaceAll("\\", "/");
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { await visit(full); continue; }
      if (!entry.isFile()) continue;
      const content = new Uint8Array(await readFile(full)); files.push({ path, bytes: content.length, sha256: hash(content), content });
    }
  }
  await visit(root); return Object.freeze(files.sort((a, b) => a.path.localeCompare(b.path)));
}

function rootsFor(files: readonly GraduationFile[]): readonly string[] {
  const roots = new Set<string>();
  for (const file of files) if (file.path.endsWith("sfhs.project.json") || file.path.endsWith("SOURCE-MANIFEST.json")) roots.add(file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/") + 1) : "");
  return Object.freeze([...roots].sort());
}
function text(file: GraduationFile): string | undefined { try { return new TextDecoder("utf-8", { fatal: true }).decode(file.content); } catch { return undefined; } }
function matchingManifest(files: readonly GraduationFile[], root: string): GraduationFile | undefined { return files.find((file) => file.path === `${root}SOURCE-MANIFEST.json`); }

function classifyInput(input: GraduationInput, allFiles: readonly GraduationFile[]): Omit<GraduationIntake, "schema" | "version" | "stage" | "findings"> {
  const roots = rootsFor(allFiles); const candidates: GraduationSourceCandidate[] = roots.map((root, index) => {
    const manifest = matchingManifest(allFiles, root); let authority: SourceAuthority = "AMBIGUOUS"; let reason = "Multiple source roots require explicit lineage authority.";
    if (roots.length === 1 && (manifest !== undefined || allFiles.some((file) => file.path === `${root}sfhs.project.json`))) { authority = "AUTHORITATIVE"; reason = manifest === undefined ? "A single source root has an explicit SFHS project manifest." : "A single source root has an explicit source manifest."; }
    else if (roots.length === 1) { authority = "CANDIDATE_SOURCE"; reason = "A single readable source root was inferred; add a manifest before irreversible migration."; }
    return { id: `source-${index + 1}-${hash(`${input.path}:${root}`).slice(0, 12)}`, root, authority, input: input.path, ...(manifest === undefined ? {} : { manifestPath: manifest.path, manifestSha256: manifest.sha256 }), reason };
  });
  const candidateArtifacts = allFiles.filter((file) => /(?:^|\/)candidate\/index\.unverified\.html$/u.test(file.path));
  const canonicalArtifacts = allFiles.filter((file) => /(?:^|\/)dist\/index\.html$/u.test(file.path));
  const packetRecords = allFiles.filter((file) => /(?:^|\/)(?:one-shot\/|DECISIONS\.md$|ISSUES-ENCOUNTERED\.md$|INTAKE-STATUS\.md$|SOURCE-MANIFEST\.json$)/u.test(file.path));
  const evidenceCollections = allFiles.filter((file) => /(?:^|\/)(?:evidence|screenshots|reports?)(?:\/|$)/iu.test(file.path));
  return { inputs: [input], sourceCandidates: candidates, candidateArtifacts, canonicalArtifacts, packetRecords, evidenceCollections };
}

export async function inspectGraduationInput(options: { readonly source: string; readonly evidence?: string; readonly report?: string; readonly candidate?: string; readonly limits?: GraduationLimits; readonly outputPath?: string }): Promise<GraduationResult<{ readonly intake: GraduationIntake; readonly lineage: SourceLineage }>> {
  const findings: GraduationFinding[] = []; const inputs: GraduationInput[] = []; let allFiles: GraduationFile[] = [];
  for (const [role, raw] of Object.entries({ source: options.source, ...(options.evidence === undefined ? {} : { evidence: options.evidence }), ...(options.report === undefined ? {} : { report: options.report }), ...(options.candidate === undefined ? {} : { candidate: options.candidate }) })) {
    const path = resolve(raw); let sourceStat;
    try { sourceStat = await stat(path); } catch { findings.push(failure("SFHS_GRAD_SOURCE_MISSING", path, `Graduation ${role} input does not exist.`)); continue; }
    if (sourceStat.isDirectory()) { const files = await listDirectory(path); inputs.push({ kind: "directory", path, files }); allFiles = allFiles.concat(files.map((file) => ({ ...file, path: file.path }))); continue; }
    const bytes = new Uint8Array(await readFile(path));
    if (path.toLowerCase().endsWith(".zip")) {
      const inspected = await inspectGraduationZip(bytes, options.limits); findings.push(...inspected.findings);
      const nested = inspected.value === undefined ? undefined : await expandNestedArchiveFiles(inspected.value, options.limits ?? graduationLimits);
      findings.push(...(nested?.findings ?? []));
      const files = nested?.value ?? inspected.value ?? []; inputs.push({ kind: "zip", path, bytes: bytes.length, sha256: hash(bytes), files }); allFiles = allFiles.concat(files);
    } else {
      const name = basename(path); const file = { path: name, bytes: bytes.length, sha256: hash(bytes), content: bytes }; inputs.push({ kind: "directory", path, files: [file] }); allFiles.push(file);
    }
  }
  const primary = inputs.find((input) => input.path === resolve(options.source));
  if (primary === undefined) return result(findings);
  const classified = classifyInput(primary, allFiles);
  if (classified.sourceCandidates.length === 0) findings.push(failure("SFHS_GRAD_SOURCE_MISSING", options.source, "No readable source root containing sfhs.project.json or SOURCE-MANIFEST.json was found."));
  if (classified.sourceCandidates.filter((candidate) => candidate.authority === "AUTHORITATIVE").length === 0 && classified.sourceCandidates.length > 1) findings.push(failure("SFHS_GRAD_SOURCE_AUTHORITY_AMBIGUOUS", options.source, "Multiple valid source roots exist without a source-lineage authority record."));
  if (classified.canonicalArtifacts.length > 0) findings.push(warning("SFHS_GRAD_CANDIDATE_TOOLING_HISTORICAL_ONLY", "dist/index.html", "Supplied canonical-looking output is historical until a real current verifier binds it to the selected source."));
  const stage: GraduationStage = findings.some((finding) => finding.severity === "error") ? "GRADUATION_BLOCKED" : "GRADUATION_INSPECTED";
  const intake: GraduationIntake = { schema: "sfhs.graduation-intake@1", version: 1, stage, inputs: Object.freeze(inputs), sourceCandidates: classified.sourceCandidates, candidateArtifacts: classified.candidateArtifacts, canonicalArtifacts: classified.canonicalArtifacts, packetRecords: classified.packetRecords, evidenceCollections: classified.evidenceCollections, findings: sorted(findings) };
  const selected = classified.sourceCandidates.find((candidate) => candidate.authority === "AUTHORITATIVE");
  const lineage: SourceLineage = { schema: "sfhs.source-lineage@1", version: 1, ...(selected === undefined ? {} : { selectedSourceId: selected.id }), revisions: classified.sourceCandidates };
  if (options.outputPath !== undefined && !findings.some((finding) => finding.severity === "error")) { await writeChatJson(join(resolve(options.outputPath), "one-shot", "GRADUATION-INTAKE.json"), intake); await writeChatJson(join(resolve(options.outputPath), "one-shot", "SOURCE-LINEAGE.json"), lineage); }
  return result(findings, { intake, lineage });
}

function codeFiles(files: readonly GraduationFile[], root: string): readonly GraduationFile[] { return files.filter((file) => file.path.startsWith(root) && /(?:^|\/)src\/.+\.(?:ts|tsx|js|mjs)$/u.test(file.path)); }
function contains(files: readonly GraduationFile[], expression: RegExp): readonly string[] { return files.filter((file) => expression.test(text(file) ?? "")).map((file) => file.path); }
export function inspectGraduationArchitecture(files: readonly GraduationFile[], root = ""): ArchitectureInspection {
  const code = codeFiles(files, root); const detected = (expression: RegExp): ArchitectureFact => contains(code, expression).length > 0 ? "DETECTED" : code.length === 0 ? "UNKNOWN" : "NOT_DETECTED";
  const expressions: Record<string, RegExp> = {
    directPixiApplication: /new\s+(?:PIXI\.)?Application\s*\(/u, pixiTickerGameplay: /\.ticker\.add\s*\(/u, customAnimationLoop: /requestAnimationFrame\s*\(/u,
    customResizeListener: /addEventListener\s*\(\s*["']resize/u, customVisibilityListener: /addEventListener\s*\(\s*["']visibilitychange/u,
    namespaceGlobals: /\b(?:namespace|module)\s+[A-Za-z_$][\w$]*/u, semanticActions: /(?:dispatch\(|actions?\.|semantic)/iu,
    directEventStateMutation: /addEventListener[\s\S]{0,400}(?:state\.|gameState\.)/u, canvasCreation: /(?:createElement\s*\(\s*["']canvas|<canvas)/u,
    hardCodedRuntimeUrl: /https?:\/\/(?!localhost)/u, candidateTooling: /candidate\/index\.unverified\.html|esbuild|rollup/iu
  };
  const facts = Object.fromEntries(Object.entries(expressions).map(([key, expression]) => [key, detected(expression)]));
  const evidence = Object.fromEntries(Object.entries(expressions).map(([key, expression]) => [key, contains(code, expression)]));
  return { facts, evidence };
}

export function createGraduationPlan(intake: GraduationIntake, lineage: SourceLineage, files: readonly GraduationFile[]): GraduationResult<{ readonly plan: MigrationPlan; readonly baseline: BehaviorBaseline }> {
  const findings: GraduationFinding[] = []; const sourceId = lineage.selectedSourceId;
  if (sourceId === undefined) return result([failure("SFHS_GRAD_SOURCE_AUTHORITY_AMBIGUOUS", "SOURCE-LINEAGE.json", "A migration plan requires exactly one authoritative selected source.")]);
  const selected = lineage.revisions.find((candidate) => candidate.id === sourceId)!; const inspection = inspectGraduationArchitecture(files, selected.root);
  let strategy: GraduationStrategy = "DIRECT_CANONICALIZATION"; const modifiers: string[] = []; const rewire: string[] = []; const historicalOnly: string[] = [];
  if (inspection.facts.directPixiApplication === "DETECTED") { strategy = "ADAPTER_REWIRE"; rewire.push("Pixi application, viewport, lifecycle, and present ownership"); findings.push(warning("SFHS_GRAD_ADAPTER_REWIRE_REQUIRED", selected.root, "The project directly constructs a Pixi Application; migrate ownership to the current adapter.")); }
  if (inspection.facts.namespaceGlobals === "DETECTED") { modifiers.push("MODULE_INTEGRATION_REQUIRED"); rewire.push("Cross-file namespace and global dependencies"); findings.push(warning("SFHS_GRAD_MODULE_INTEGRATION_REQUIRED", selected.root, "Cross-file namespaces or window-global dependencies require explicit module imports and exports.")); }
  if (inspection.facts.customAnimationLoop === "DETECTED" || inspection.facts.pixiTickerGameplay === "DETECTED") { rewire.push("Gameplay loop ownership"); findings.push(warning("SFHS_GRAD_LOOP_REWIRE_REQUIRED", selected.root, "Custom animation or ticker ownership must be reviewed before canonical runtime integration.")); }
  if (inspection.facts.directEventStateMutation === "DETECTED") { rewire.push("Raw event to semantic action boundary"); findings.push(warning("SFHS_GRAD_INPUT_REWIRE_REQUIRED", selected.root, "Raw input appears to mutate game state directly.")); }
  if (inspection.facts.hardCodedRuntimeUrl === "DETECTED") { rewire.push("Asset manifest ownership"); findings.push(warning("SFHS_GRAD_ASSET_PIPELINE_REWIRE_REQUIRED", selected.root, "Hard-coded external runtime URLs require asset-pipeline migration.")); }
  const projectManifest = files.find((file) => file.path === `${selected.root}sfhs.project.json`); let viewport: Record<string, unknown> | undefined;
  if (projectManifest !== undefined) try { viewport = asObject(asObject(JSON.parse(text(projectManifest) ?? "null"))?.viewport); } catch { findings.push(warning("SFHS_GRAD_SOURCE_MANIFEST_INVALID", projectManifest.path, "Project manifest could not be parsed during migration planning.")); }
  if (typeof viewport?.orientation === "string" && viewport.orientation !== "adaptive") {
    rewire.push("Current SFHS project manifest orientation contract");
    findings.push(warning("SFHS_GRAD_PROJECT_CONTRACT_REWIRE_REQUIRED", `${selected.root}sfhs.project.json`, "Legacy viewport orientation must be reconciled with the current SFHS project contract before canonical packing."));
  }
  if (inspection.facts.candidateTooling === "DETECTED" || intake.candidateArtifacts.length > 0) { historicalOnly.push("Candidate builder and candidate artifact"); findings.push(warning("SFHS_GRAD_CANDIDATE_TOOLING_HISTORICAL_ONLY", selected.root, "Candidate tooling is retained as historical evidence and cannot become canonical.")); }
  if (files.filter((file) => sourceFile.test(file.path)).length === 0) { strategy = "ARCHITECTURE_MISMATCH"; findings.push(failure("SFHS_GRAD_STRATEGY_UNSUPPORTED", selected.root, "The selected source root lacks readable project source files.")); }
  const baselineEntries = [
    { id: "source-readable", description: "Readable editable source remains authoritative.", classification: "PRESERVE" as const, migrationRequirement: "Source manifest and source hash remain bound.", evidence: [selected.manifestPath ?? selected.root] },
    { id: "candidate-boundary", description: "Historical candidate output is never canonical.", classification: "KNOWN_DEFECT" as const, migrationRequirement: "Only real SFHS pack and verify may establish canonical output.", evidence: intake.candidateArtifacts.map((file) => file.path) }
  ];
  const baseline: BehaviorBaseline = { schema: "sfhs.graduation-behavior-baseline@1", version: 1, entries: baselineEntries };
  const plan: MigrationPlan = { schema: "sfhs.migration-plan@1", version: 1, sourceId, strategy, modifiers, targetLane: "pixi-v8", inspection, preserve: ["Game rules, source history, issue records, decisions, tests, and evidence"], rewire, replace: ["Canonical pack, verifier, browser runner, and adapter lifecycle only when migration requires it"], historicalOnly, productRepairs: [], forbidden: ["Automatic source-code migration", "Candidate promotion", "Remote repository actions"], remoteAuthorized: false };
  return result(findings, { plan, baseline });
}

function safeCopyFilter(source: string): boolean { return !historicalDirectoryNames.has(basename(source)); }
async function ensureMissing(path: string): Promise<boolean> { return !(await stat(path).then(() => true).catch(() => false)); }
async function atomicDirectory(destination: string, writer: (staging: string) => Promise<void>): Promise<void> {
  if (!(await ensureMissing(destination))) throw new Error("exists");
  const staging = join(dirname(destination), `.${basename(destination)}.graduation-${randomUUID()}`);
  try { await writer(staging); await rename(staging, destination); } catch (error) { await rm(staging, { recursive: true, force: true }).catch(() => undefined); throw error; }
}
function authoritativeTreeFiles(files: readonly GraduationFile[]): readonly GraduationFile[] { return files.filter((file) => !historicalDirectoryNames.has(file.path.split("/")[0]!) && file.path !== "MATERIALIZATION.json"); }
function treeIdentity(files: readonly GraduationFile[]): string { return hash(files.map((file) => `${file.path}\0${file.sha256}\0${file.bytes}`).sort().join("\n")); }

export async function importGraduationProject(options: { readonly sourceRoot: string; readonly destination: string; readonly plan: MigrationPlan; readonly revision: string }): Promise<GraduationResult<{ readonly state: GraduationState }>> {
  const findings: GraduationFinding[] = []; const sourceRoot = resolve(options.sourceRoot); const destination = resolve(options.destination);
  if (options.plan.remoteAuthorized !== false) return result([failure("SFHS_GRAD_ARGUMENT_INVALID", "MIGRATION-PLAN.json", "Graduation import never authorizes remote actions.")]);
  if (options.plan.strategy === "ARCHITECTURE_MISMATCH") return result([failure("SFHS_GRAD_STRATEGY_UNSUPPORTED", "MIGRATION-PLAN.json", "Architecture mismatch cannot be imported without an explicit migration decision.")]);
  if (!(await ensureMissing(destination))) return result([failure("SFHS_GRAD_IO_FAILURE", destination, "Graduation import never overwrites an existing destination.")]);
  try {
    const sourceFiles = authoritativeTreeFiles(await listDirectory(sourceRoot)); const sourceHash = treeIdentity(sourceFiles);
    await atomicDirectory(destination, async (staging) => {
      await cp(sourceRoot, staging, { recursive: true, filter: safeCopyFilter });
      const recordRoot = join(staging, "one-shot"); await mkdir(recordRoot, { recursive: true });
      const records = {
        source: { path: "SOURCE-IDENTITY.json", sha256: hash(stableJson({ root: ".", treeSha256: sourceHash })) },
        plan: { path: "one-shot/MIGRATION-PLAN.json", sha256: hash(stableJson(options.plan)) }
      };
      await writeChatJson(join(staging, "SOURCE-IDENTITY.json"), { schema: "sfhs.graduation-source-identity@1", treeSha256: sourceHash, sourceRoot: "." });
      await writeChatJson(join(recordRoot, "GRADUATION-INTAKE.json"), { schema: "sfhs.graduation-intake@1", version: 1, stage: "GRADUATION_IMPORTED", inputs: [], sourceCandidates: [{ id: options.plan.sourceId, root: ".", authority: "AUTHORITATIVE", input: "SOURCE-IDENTITY.json", reason: "Imported source identity selected by the validated migration plan." }], findings: [] });
      await writeChatJson(join(recordRoot, "SOURCE-LINEAGE.json"), { schema: "sfhs.source-lineage@1", version: 1, selectedSourceId: options.plan.sourceId, revisions: [{ id: options.plan.sourceId, root: ".", authority: "AUTHORITATIVE", input: "SOURCE-IDENTITY.json", reason: "Imported source identity selected by the validated migration plan." }] });
      await writeChatJson(join(recordRoot, "BEHAVIOR-BASELINE.json"), { schema: "sfhs.graduation-behavior-baseline@1", version: 1, entries: [{ id: "migration-plan-preservation", description: "Preserve the behavior listed in the validated migration plan.", classification: "PRESERVE", migrationRequirement: "Execute source, canonical browser, and physical evidence required by the plan.", evidence: ["one-shot/MIGRATION-PLAN.json"] }] });
      await writeChatJson(join(recordRoot, "MIGRATION-PLAN.json"), options.plan);
      await writeChatJson(join(recordRoot, "EVIDENCE-SUPERSESSION.json"), { schema: "sfhs.graduation-evidence-supersession@1", records: [] });
      await writeChatJson(join(recordRoot, "SFHS-PIN.json"), { schema: "sfhs.graduation-sfhs-pin@1", sfhsRepository: "falloutmule/single-file-html-software", sfhsCommit: options.revision, node: ">=24", pnpm: "11.9.0", adapter: "pixi-v8", sourceProductIdentity: sourceHash, workspacePackages: ["@sfhs/adapter-pixi-v8", "@sfhs/pixi-runtime"] });
      const state: GraduationState = { schema: "sfhs.graduation-state@1", version: 1, stage: "GRADUATION_IMPORTED", sourceId: options.plan.sourceId, projectRoot: ".", strategy: options.plan.strategy, records, productStatus: "PRODUCT_INCOMPLETE", sfhsStatus: "SFHS_SOURCE_ONLY", evidenceStatus: "UNTESTED", physicalStatus: "UNTESTED", requiredRepairs: options.plan.rewire, deferredWork: [], nextAction: "Perform the agent-authored migration plan, then materialize for canonical SFHS verification." };
      await writeChatJson(join(recordRoot, "GRADUATION-STATE.json"), state);
    });
    const state = JSON.parse(await readFile(join(destination, "one-shot", "GRADUATION-STATE.json"), "utf8")) as GraduationState;
    return result(findings, { state });
  } catch (error) { return result([failure("SFHS_GRAD_IO_FAILURE", destination, error instanceof Error && error.message === "exists" ? "Graduation import never overwrites an existing destination." : "Graduation import failed transactionally; the destination was left unchanged.")]); }
}

export async function materializeGraduationProject(options: { readonly sourceRoot: string; readonly workspaceRoot: string; readonly projectId: string; readonly revision: string }): Promise<GraduationResult<{ readonly path: string; readonly treeSha256: string }>> {
  const sourceRoot = resolve(options.sourceRoot); const workspaceRoot = resolve(options.workspaceRoot); const files = authoritativeTreeFiles(await listDirectory(sourceRoot)); const sourceHash = treeIdentity(files);
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/u.test(options.projectId)) return result([failure("SFHS_GRAD_ARGUMENT_INVALID", "/projectId", "Materialized project id must be portable lowercase kebab-case.")]);
  const destination = join(workspaceRoot, "examples", `.sfhs-grad-${options.projectId}-${sourceHash.slice(0, 12)}`);
  if (!(await ensureMissing(destination))) return result([], { path: destination, treeSha256: sourceHash });
  try {
    await atomicDirectory(destination, async (staging) => {
      await cp(sourceRoot, staging, { recursive: true, filter: safeCopyFilter });
      const packageJson = await readJson(join(staging, "package.json")); const dependencies = { ...asObject(packageJson?.dependencies), ...asObject(packageJson?.devDependencies) };
      const pin = await readJson(join(staging, "one-shot", "SFHS-PIN.json"));
      const pinnedWorkspacePackages = Array.isArray(pin?.workspacePackages) ? pin.workspacePackages.filter((value): value is string => typeof value === "string" && /^@sfhs\/[a-z0-9-]+$/u.test(value)) : [];
      const workspacePackages = new Set<string>([...Object.entries(dependencies).filter(([name, specifier]) => name.startsWith("@sfhs/") && specifier === "workspace:*").map(([name]) => name), ...pinnedWorkspacePackages]);
      const linkedPackages: string[] = [];
      for (const name of workspacePackages) {
        const packagePath = name === "@sfhs/adapter-pixi-v8" ? join(options.workspaceRoot, "adapters", "pixi-v8") : join(options.workspaceRoot, "packages", name.slice("@sfhs/".length));
        if (!(await stat(packagePath).then((entry) => entry.isDirectory()).catch(() => false))) throw new Error("workspace dependency unavailable");
        const target = join(staging, "node_modules", "@sfhs", name.slice("@sfhs/".length)); await mkdir(dirname(target), { recursive: true });
        await symlink(packagePath, target, process.platform === "win32" ? "junction" : "dir"); linkedPackages.push(name);
      }
      const overlay = { schema: "sfhs.graduation-materialization@1", sourceRoot, sourceTreeSha256: sourceHash, sfhsCommit: options.revision, generatedWorkspacePath: relative(workspaceRoot, destination).replaceAll("\\", "/"), copiedFiles: files.filter((file) => !historicalDirectoryNames.has(file.path.split("/")[0]!)).map((file) => file.path), excludedFiles: [...historicalDirectoryNames].sort(), workspaceLinks: linkedPackages.sort(), cleanup: "safe-to-delete" };
      await writeChatJson(join(staging, "MATERIALIZATION.json"), overlay);
    });
    return result([], { path: destination, treeSha256: sourceHash });
  } catch { return result([failure("SFHS_GRAD_IO_FAILURE", destination, "Materialization failed transactionally; no partial workspace project remains.")]); }
}

async function readJson(path: string): Promise<Record<string, unknown> | undefined> { try { return asObject(JSON.parse(await readFile(path, "utf8"))); } catch { return undefined; } }
async function validateGraduationRecordReferences(root: string, state: Record<string, unknown> | undefined): Promise<readonly GraduationFinding[]> {
  const records = asObject(state?.records); const findings: GraduationFinding[] = []; const seen = new Set<string>();
  if (records === undefined) return [failure("SFHS_GRAD_MATERIALIZATION_INVALID", "one-shot/GRADUATION-STATE.json", "Graduation state must retain hashed authoritative record references.")];
  for (const [name, raw] of Object.entries(records)) {
    const reference = asObject(raw); const recordPath = typeof reference?.path === "string" ? reference.path : undefined; const expected = typeof reference?.sha256 === "string" ? reference.sha256 : undefined;
    if (recordPath === undefined || expected === undefined || seen.has(recordPath) || !inside(root, resolve(root, recordPath))) { findings.push(failure("SFHS_GRAD_MATERIALIZATION_INVALID", `one-shot/GRADUATION-STATE.json#${name}`, "Graduation records must be unique, project-contained, hashed paths.")); continue; }
    seen.add(recordPath);
    try { if (hash(await readFile(resolve(root, recordPath))) !== expected) findings.push(failure("SFHS_GRAD_MATERIALIZATION_STALE", recordPath, "Graduation record bytes differ from the state-bound hash; reopen graduation completion.")); } catch { findings.push(failure("SFHS_GRAD_MATERIALIZATION_INVALID", recordPath, "A graduation record referenced by state is unreadable.")); }
  }
  return findings;
}

async function writeGraduationCompletionRecords(root: string, records: Readonly<Record<string, string>>): Promise<void> {
  const token = randomUUID(); const originals = new Map<string, Uint8Array | undefined>(); const temporary: string[] = []; const written: string[] = [];
  try {
    for (const [relativePath, content] of Object.entries(records)) {
      const target = resolve(root, relativePath); if (!inside(root, target)) throw new Error("unsafe");
      originals.set(target, await readFile(target).then((value) => new Uint8Array(value)).catch(() => undefined));
      await mkdir(dirname(target), { recursive: true }); const staged = `${target}.graduation-${token}`; await writeFile(staged, content, "utf8"); temporary.push(staged);
    }
    for (const target of originals.keys()) { await rename(`${target}.graduation-${token}`, target); written.push(target); }
  } catch (error) {
    for (const target of written.reverse()) { const original = originals.get(target); if (original === undefined) await rm(target, { force: true }).catch(() => undefined); else await writeFile(target, original).catch(() => undefined); }
    throw error;
  } finally { await Promise.all(temporary.map((path) => rm(path, { force: true }).catch(() => undefined))); }
}

export async function auditGraduationProject(projectRoot: string): Promise<GraduationResult<{ readonly stage: GraduationStage; readonly inspection: ArchitectureInspection }>> {
  const root = resolve(projectRoot); const findings: GraduationFinding[] = []; const files = await listDirectory(root); const state = await readJson(join(root, "one-shot", "GRADUATION-STATE.json"));
  const legacyStatus = await readFile(join(root, "one-shot", "GRADUATION-STATUS.md"), "utf8").catch(() => undefined);
  const inspection = inspectGraduationArchitecture(files);
  if (state !== undefined) findings.push(...await validateGraduationRecordReferences(root, state));
  if (inspection.facts.directPixiApplication === "DETECTED") findings.push(warning("SFHS_GRAD_ADAPTER_REWIRE_REQUIRED", "src", "Direct Pixi Application ownership remains detected."));
  if (inspection.facts.namespaceGlobals === "DETECTED") findings.push(warning("SFHS_GRAD_MODULE_INTEGRATION_REQUIRED", "src", "Namespace/global integration assumptions remain detected."));
  const materialization = await readJson(join(root, "MATERIALIZATION.json"));
  if (state === undefined && legacyStatus === undefined && materialization === undefined) findings.push(failure("SFHS_GRAD_MATERIALIZATION_INVALID", "one-shot/GRADUATION-STATE.json", "Graduation state is missing; run graduation inspect and plan before audit."));
  let stage: GraduationStage = "GRADUATION_BLOCKED";
  if (typeof state?.stage === "string") stage = state.stage as GraduationStage;
  else if (legacyStatus !== undefined && legacyStatus.includes("GRADUATION_COMPLETE")) stage = "GRADUATION_COMPLETE";
  else if (materialization !== undefined) stage = "GRADUATION_MIGRATING";
  if (materialization !== undefined && typeof materialization.sourceRoot === "string" && typeof materialization.sourceTreeSha256 === "string") {
    const current = treeIdentity(authoritativeTreeFiles(files));
    if (current === materialization.sourceTreeSha256) { /* Materialized overlays include the source payload only. */ }
    else findings.push(failure("SFHS_GRAD_MATERIALIZATION_STALE", "MATERIALIZATION.json", "Materialized project content differs from its recorded source identity; re-materialize before relying on it."));
  }
  return result(findings, { stage, inspection });
}

export async function completeGraduationProject(projectRoot: string, options: { readonly canonicalArtifact?: { readonly path: string; readonly sha256: string; readonly bytes: number; readonly buildId: string; readonly verifier: string }; readonly browserEvidence?: string; readonly physical: "REPORTED" | "UNTESTED" | "BLOCKED" }): Promise<GraduationResult<{ readonly outcome: GraduationStage }>> {
  const root = resolve(projectRoot); const audited = await auditGraduationProject(root); const findings = [...audited.findings];
  if (options.canonicalArtifact === undefined) findings.push(failure("SFHS_GRAD_CANONICAL_EVIDENCE_REQUIRED", "dist/index.html", "Graduation completion requires an exact canonical verifier identity."));
  else if (options.canonicalArtifact.path.replaceAll("\\", "/") !== "dist/index.html" || !/^[a-f0-9]{64}$/u.test(options.canonicalArtifact.sha256) || !Number.isSafeInteger(options.canonicalArtifact.bytes) || options.canonicalArtifact.bytes <= 0 || options.canonicalArtifact.buildId.length === 0 || options.canonicalArtifact.verifier !== "sfhs verify") findings.push(failure("SFHS_GRAD_CANONICAL_EVIDENCE_REQUIRED", "dist/index.html", "Canonical completion identity must bind the real verifier to dist/index.html, a SHA-256, bytes, and build id."));
  if (options.browserEvidence === undefined) findings.push(failure("SFHS_GRAD_BROWSER_EVIDENCE_REQUIRED", "one-shot", "Graduation completion requires retained canonical browser evidence."));
  else if (!inside(root, resolve(root, options.browserEvidence))) findings.push(failure("SFHS_GRAD_BROWSER_EVIDENCE_REQUIRED", options.browserEvidence, "Canonical browser evidence must be retained inside the project."));
  if (options.physical === "UNTESTED") findings.push(warning("SFHS_GRAD_PHYSICAL_EVIDENCE_INCOMPLETE", "one-shot", "Canonical physical testing remains pending."));
  const errors = findings.some((finding) => finding.severity === "error"); const outcome: GraduationStage = errors ? "GRADUATION_BLOCKED" : options.physical === "REPORTED" ? "GRADUATION_COMPLETE" : "GRADUATION_PHYSICAL_PENDING";
  if (!errors) {
    const artifact = options.canonicalArtifact!;
    const seed = { schema: "sfhs.graduation-physical-test-seed@1", classification: "canonical", artifact, required: ["device model", "Android version", "numeric Chrome version", "portrait and landscape viewport dimensions and DPR", "screenshots", "primary workflow", "background/return", "audio", "performance and heat"], resultVocabulary: ["REPORTED PASS", "REPORTED FAIL"] };
    const report = { schema: "sfhs.graduation-report@1", stage: outcome, canonicalArtifact: artifact, browserEvidence: options.browserEvidence, physical: options.physical, remoteActions: "not-authorized" };
    const state = await readJson(join(root, "one-shot", "GRADUATION-STATE.json"));
    const recordValues = {
      physicalSeed: { path: "one-shot/GRADUATION-PHYSICAL-TEST-SEED.json", sha256: hash(stableJson(seed)) },
      report: { path: "one-shot/GRADUATION-REPORT.json", sha256: hash(stableJson(report)) }
    };
    const updatedState = { ...state, stage: outcome, physicalStatus: options.physical, records: { ...asObject(state?.records), ...recordValues }, nextAction: outcome === "GRADUATION_COMPLETE" ? "Graduation complete; move optional work into a separately authorized backlog." : "Collect canonical physical evidence and formal device metadata." };
    await writeGraduationCompletionRecords(root, {
      "one-shot/GRADUATION-PHYSICAL-TEST-SEED.json": stableJson(seed),
      "one-shot/GRADUATION-PHYSICAL-TEST-INSTRUCTIONS.md": `# Graduation Physical Test\n\nTest canonical ${artifact.path} (${artifact.bytes} bytes, SHA-256 ${artifact.sha256}, build ${artifact.buildId}). Record device model, Android and numeric Chrome versions, portrait/landscape viewport dimensions and DPR, required screenshots, workflow, lifecycle, audio, performance/heat, and **REPORTED PASS** or **REPORTED FAIL**.\n`,
      "one-shot/GRADUATION-REPORT.json": stableJson(report),
      "one-shot/GRADUATION-STATE.json": stableJson(updatedState)
    });
  }
  return result(findings, { outcome });
}
