import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

import { decodeRgbaPng, encodeRgbaPng, type RgbaImage } from "./png.ts";

export const packageIdentity = "@sfhs/godot-animation" as const;
export const supportedGodotVersion = "4.7.1.stable" as const;

export type GodotAnimationJsonValue = null | boolean | number | string | readonly GodotAnimationJsonValue[] | { readonly [key: string]: GodotAnimationJsonValue };

export interface GodotAnimationExportDescriptor {
  readonly schema: "sfhs.godot-animation-export@1";
  readonly godotProject: string;
  readonly scene: string;
  readonly animationPlayer: string;
  readonly workingFrame: { readonly width: number; readonly height: number };
  readonly scale: number;
  readonly sheet: { readonly columns: number; readonly rows: number };
  readonly anchor: { readonly x: number; readonly y: number; readonly groundedTolerance: number };
  readonly border: { readonly transparentPixels: number };
  readonly variantAlphaParity?: boolean;
  readonly samples: readonly GodotAnimationSampleDescriptor[];
  readonly variants: readonly GodotAnimationVariantDescriptor[];
  readonly metadataOutput: string;
  readonly validationOutput: string;
}

export interface GodotAnimationSampleDescriptor {
  readonly id: string;
  readonly animation: string;
  readonly timeSeconds: number;
  readonly grounded?: boolean;
}

export interface GodotAnimationVariantDescriptor {
  readonly id: string;
  readonly parameters: Readonly<Record<string, GodotAnimationJsonValue>>;
  readonly output: string;
}

export type GodotAnimationFindingCode =
  | "SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID"
  | "SFHS_GODOT_ANIMATION_EXECUTABLE_INVALID"
  | "SFHS_GODOT_ANIMATION_GODOT_UNSUPPORTED"
  | "SFHS_GODOT_ANIMATION_NETWORK_CONTENT"
  | "SFHS_GODOT_ANIMATION_OUTPUT_DRIFT"
  | "SFHS_GODOT_ANIMATION_PATH_INVALID"
  | "SFHS_GODOT_ANIMATION_RENDER_FAILED"
  | "SFHS_GODOT_ANIMATION_VALIDATION_FAILED";

export interface GodotAnimationFinding {
  readonly code: GodotAnimationFindingCode;
  readonly severity: "error";
  readonly path: string;
  readonly message: string;
}

export interface GodotAnimationFrameResult {
  readonly index: number;
  readonly id: string;
  readonly animation: string;
  readonly timeSeconds: number;
  readonly bounds: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };
  readonly alphaPixels: number;
  readonly rgbaSha256: string;
  readonly alphaSha256: string;
}

export interface GodotAnimationVariantResult {
  readonly id: string;
  readonly output: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly disposition: "verified" | "written";
  readonly frames: readonly GodotAnimationFrameResult[];
}

export interface GodotAnimationExportResult {
  readonly schema: "sfhs.godot-animation-export-result@1";
  readonly valid: true;
  readonly godot: { readonly executable: string; readonly executableSha256: string; readonly version: string; readonly supportedVersion: typeof supportedGodotVersion };
  readonly descriptor: { readonly path: string; readonly sha256: string };
  readonly outputs: readonly GodotAnimationVariantResult[];
  readonly metadataOutput: string;
  readonly validationOutput: string;
}

export interface ExportGodotAnimationOptions {
  readonly projectRoot: string;
  readonly descriptorPath: string;
  readonly godotExecutable?: string;
  readonly timeoutMilliseconds?: number;
  readonly commandRunner?: GodotAnimationCommandRunner;
}

export type GodotAnimationCommandRunner = (executable: string, arguments_: readonly string[], options: { readonly cwd?: string; readonly timeoutMilliseconds: number; readonly environment: NodeJS.ProcessEnv }) => Promise<{ readonly stdout: string; readonly stderr: string }>;

export class GodotAnimationExportError extends Error {
  readonly findings: readonly GodotAnimationFinding[];
  constructor(findings: readonly GodotAnimationFinding[]) {
    super(findings.map((finding) => finding.message).join("\n"));
    this.name = "GodotAnimationExportError";
    this.findings = findings;
  }
}

const execFileAsync = promisify(execFile);
const defaultCommandRunner: GodotAnimationCommandRunner = async (executable, arguments_, options) => {
  const result = await execFileAsync(executable, [...arguments_], { encoding: "utf8", timeout: options.timeoutMilliseconds, windowsHide: true, env: options.environment, ...(options.cwd === undefined ? {} : { cwd: options.cwd }), maxBuffer: 4 * 1024 * 1024 });
  return { stdout: result.stdout, stderr: result.stderr };
};
const idPattern = /^[a-z0-9][a-z0-9._-]{0,95}$/u;
const sourceExtensions = new Set([".gd", ".godot", ".tscn", ".tres", ".cs", ".gdshader", ".shader", ".json", ".cfg"]);
const networkApiPattern = /\b(?:HTTPRequest|HTTPClient|WebSocketPeer|WebSocketMultiplayerPeer|ENetMultiplayerPeer|PacketPeerUDP|TCPServer|StreamPeerTCP|UPNP|MultiplayerAPI|IP\s*\.|OS\s*\.\s*shell_open)\b/u;
const urlSchemePattern = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"')\]}]+/giu;

function sha256(bytes: Uint8Array): string { return createHash("sha256").update(bytes).digest("hex"); }
function asObject(value: unknown): Record<string, unknown> | undefined { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function isIntegerIn(value: unknown, minimum: number, maximum: number): value is number { return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum; }
function relativePath(value: unknown): value is string { return typeof value === "string" && value.length > 0 && !/[\0\r\n]/u.test(value) && !/^[a-z]:/iu.test(value) && !isAbsolute(value) && !value.replaceAll("\\", "/").split("/").includes(".."); }
function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean { return Object.keys(value).every((key) => allowed.includes(key)); }
function isJsonValue(value: unknown): value is GodotAnimationJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item));
  const object = asObject(value);
  if (object === undefined) return false;
  const prototype = Object.getPrototypeOf(object) as unknown;
  return (prototype === Object.prototype || prototype === null) && Object.values(object).every((item) => isJsonValue(item));
}
function canonical(value: GodotAnimationJsonValue): GodotAnimationJsonValue {
  if (Array.isArray(value)) return value.map((item) => canonical(item));
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
function canonicalJson(value: GodotAnimationJsonValue): string { return `${JSON.stringify(canonical(value), null, 2)}\n`; }
function finding(code: GodotAnimationFindingCode, path: string, message: string): GodotAnimationFinding { return { code, severity: "error", path, message }; }

export function validateGodotAnimationDescriptor(value: unknown): { readonly valid: boolean; readonly findings: readonly GodotAnimationFinding[]; readonly descriptor?: GodotAnimationExportDescriptor } {
  const root = asObject(value);
  const findings: GodotAnimationFinding[] = [];
  if (root === undefined) return { valid: false, findings: [finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/", "Descriptor must be a JSON object.")] };
  if (!hasOnlyKeys(root, ["schema", "godotProject", "scene", "animationPlayer", "workingFrame", "scale", "sheet", "anchor", "border", "variantAlphaParity", "samples", "variants", "metadataOutput", "validationOutput"])) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/", "Descriptor contains unknown properties."));
  if (root.schema !== "sfhs.godot-animation-export@1") findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/schema", "Descriptor schema must be sfhs.godot-animation-export@1."));
  if (!relativePath(root.godotProject)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/godotProject", "godotProject must be a project-relative path without traversal."));
  if (typeof root.scene !== "string" || !root.scene.startsWith("res://") || root.scene.includes("..")) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/scene", "scene must be a traversal-free res:// path."));
  if (typeof root.animationPlayer !== "string" || root.animationPlayer.length === 0 || root.animationPlayer.startsWith("/") || root.animationPlayer.split("/").includes("..")) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/animationPlayer", "animationPlayer must be a relative NodePath without traversal."));
  const frame = asObject(root.workingFrame);
  if (frame === undefined || !isIntegerIn(frame.width, 1, 4096) || !isIntegerIn(frame.height, 1, 4096)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/workingFrame", "workingFrame width and height must be integers from 1 through 4096."));
  else if (!hasOnlyKeys(frame, ["width", "height"])) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/workingFrame", "workingFrame contains unknown properties."));
  if (!isIntegerIn(root.scale, 1, 16)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/scale", "scale must be an integer from 1 through 16."));
  const sheet = asObject(root.sheet);
  if (sheet === undefined || !isIntegerIn(sheet.columns, 1, 64) || !isIntegerIn(sheet.rows, 1, 64)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/sheet", "sheet rows and columns must be integers from 1 through 64."));
  else if (!hasOnlyKeys(sheet, ["columns", "rows"])) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/sheet", "sheet contains unknown properties."));
  const anchor = asObject(root.anchor);
  if (anchor === undefined || !isIntegerIn(anchor.x, 0, 4096) || !isIntegerIn(anchor.y, 0, 4096) || !isIntegerIn(anchor.groundedTolerance, 0, 8)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/anchor", "anchor coordinates and groundedTolerance must be non-negative integers."));
  else if (!hasOnlyKeys(anchor, ["x", "y", "groundedTolerance"])) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/anchor", "anchor contains unknown properties."));
  const border = asObject(root.border);
  if (border === undefined || !isIntegerIn(border.transparentPixels, 0, 32)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/border", "border.transparentPixels must be an integer from 0 through 32."));
  else if (!hasOnlyKeys(border, ["transparentPixels"])) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/border", "border contains unknown properties."));
  if (root.variantAlphaParity !== undefined && typeof root.variantAlphaParity !== "boolean") findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/variantAlphaParity", "variantAlphaParity must be boolean when present."));
  const samples = Array.isArray(root.samples) ? root.samples : [];
  if (samples.length === 0) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/samples", "At least one ordered animation sample is required."));
  if (samples.length > 4096) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/samples", "No more than 4096 animation samples are allowed."));
  const sampleIds = new Set<string>();
  for (const [index, valueAtIndex] of samples.entries()) {
    const sample = asObject(valueAtIndex);
    if (sample === undefined || !hasOnlyKeys(sample, ["id", "animation", "timeSeconds", "grounded"]) || typeof sample.id !== "string" || !idPattern.test(sample.id) || typeof sample.animation !== "string" || sample.animation.length === 0 || /[\0\r\n]/u.test(sample.animation) || typeof sample.timeSeconds !== "number" || !Number.isFinite(sample.timeSeconds) || sample.timeSeconds < 0 || (sample.grounded !== undefined && typeof sample.grounded !== "boolean")) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", `/samples/${index}`, "Each sample requires only a safe id, animation, non-negative finite timeSeconds, and optional boolean grounded."));
    else if (sampleIds.has(sample.id)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", `/samples/${index}/id`, `Duplicate sample id: ${sample.id}.`)); else sampleIds.add(sample.id);
  }
  if (sheet !== undefined && typeof sheet.columns === "number" && typeof sheet.rows === "number" && samples.length !== sheet.columns * sheet.rows) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/samples", "Sample count must equal sheet columns multiplied by rows."));
  const variants = Array.isArray(root.variants) ? root.variants : [];
  if (variants.length === 0) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/variants", "At least one scene variant is required."));
  if (variants.length > 64) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/variants", "No more than 64 scene variants are allowed."));
  const variantIds = new Set<string>(); const outputs = new Set<string>();
  for (const [index, valueAtIndex] of variants.entries()) {
    const variant = asObject(valueAtIndex); const parameters = asObject(variant?.parameters);
    if (variant === undefined || !hasOnlyKeys(variant, ["id", "parameters", "output"]) || typeof variant.id !== "string" || !idPattern.test(variant.id) || parameters === undefined || !isJsonValue(parameters) || !relativePath(variant.output) || !variant.output.toLowerCase().endsWith(".png")) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", `/variants/${index}`, "Each variant requires only a safe id, JSON object parameters, and project-relative PNG output."));
    else {
      if (variantIds.has(variant.id)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", `/variants/${index}/id`, `Duplicate variant id: ${variant.id}.`));
      if (outputs.has(variant.output)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", `/variants/${index}/output`, `Duplicate output path: ${variant.output}.`));
      variantIds.add(variant.id); outputs.add(variant.output);
    }
  }
  if (!relativePath(root.metadataOutput) || !root.metadataOutput.toLowerCase().endsWith(".json")) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/metadataOutput", "metadataOutput must be a project-relative JSON path without traversal."));
  if (!relativePath(root.validationOutput) || !root.validationOutput.toLowerCase().endsWith(".json")) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/validationOutput", "validationOutput must be a project-relative JSON path without traversal."));
  if (typeof root.metadataOutput === "string" && outputs.has(root.metadataOutput)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/metadataOutput", "metadataOutput must not replace a sheet output."));
  if (typeof root.validationOutput === "string" && (outputs.has(root.validationOutput) || root.validationOutput === root.metadataOutput)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/validationOutput", "validationOutput must be unique."));
  if (frame !== undefined && anchor !== undefined && typeof frame.width === "number" && typeof frame.height === "number" && typeof anchor.x === "number" && typeof anchor.y === "number" && (anchor.x >= frame.width || anchor.y >= frame.height)) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/anchor", "anchor must lie inside the working frame."));
  if (frame !== undefined && sheet !== undefined && typeof frame.width === "number" && typeof frame.height === "number" && typeof sheet.columns === "number" && typeof sheet.rows === "number" && typeof root.scale === "number") {
    const sheetWidth = frame.width * root.scale * sheet.columns; const sheetHeight = frame.height * root.scale * sheet.rows;
    if (sheetWidth > 16_384 || sheetHeight > 16_384 || sheetWidth * sheetHeight > 67_108_864) findings.push(finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", "/sheet", "Scaled sheet dimensions exceed the bounded RGBA export limit."));
  }
  return findings.length === 0 ? { valid: true, findings, descriptor: value as GodotAnimationExportDescriptor } : { valid: false, findings };
}

function contained(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot));
}

async function assertSafeProjectPath(root: string, candidate: string, allowMissing: boolean): Promise<void> {
  if (!contained(root, candidate)) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_PATH_INVALID", candidate, "Path escapes the declared project root.")]);
  const segments = relative(root, candidate).split(sep).filter(Boolean);
  let current = root;
  for (const segment of segments) {
    current = join(current, segment);
    try {
      const details = await lstat(current);
      if (details.isSymbolicLink()) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_PATH_INVALID", current, "Symbolic links are rejected in Godot animation paths.")]);
    } catch (error) {
      if (error instanceof GodotAnimationExportError) throw error;
      if ((error as NodeJS.ErrnoException).code === "ENOENT" && allowMissing) return;
      throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_PATH_INVALID", current, "Required path is unreadable.")]);
    }
  }
}

async function scanGodotProject(root: string): Promise<void> {
  const findings: GodotAnimationFinding[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if ([".git", ".godot", "dist", "node_modules", "test-results"].includes(entry.name)) continue;
      const fullPath = join(directory, entry.name);
      if (entry.isSymbolicLink()) { findings.push(finding("SFHS_GODOT_ANIMATION_PATH_INVALID", fullPath, "Symbolic links are rejected during Godot project preflight.")); continue; }
      if (entry.isDirectory()) { await visit(fullPath); continue; }
      const extension = entry.name.includes(".") ? entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase() : "";
      if (!sourceExtensions.has(extension)) continue;
      const text = await readFile(fullPath, "utf8");
      for (const match of text.matchAll(urlSchemePattern)) if (!match[0].startsWith("res://") && !match[0].startsWith("user://")) findings.push(finding("SFHS_GODOT_ANIMATION_NETWORK_CONTENT", fullPath, `Network-capable URL scheme is not allowed: ${match[0]}`));
      if (networkApiPattern.test(text)) findings.push(finding("SFHS_GODOT_ANIMATION_NETWORK_CONTENT", fullPath, "Godot networking APIs/classes are not allowed in animation export projects."));
    }
  }
  await visit(root);
  if (findings.length > 0) throw new GodotAnimationExportError(findings);
}

function scrubbedEnvironment(): NodeJS.ProcessEnv {
  const output: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) if (!/(?:^|_)(?:http|https|all|no)_?proxy$/iu.test(key) && !/^GODOT_/u.test(key)) output[key] = value;
  output.HTTP_PROXY = ""; output.HTTPS_PROXY = ""; output.ALL_PROXY = ""; output.NO_PROXY = "*";
  return output;
}

function analyzeFrame(image: RgbaImage, sample: GodotAnimationSampleDescriptor, index: number, descriptor: GodotAnimationExportDescriptor): { readonly result: GodotAnimationFrameResult; readonly alpha: Uint8Array } {
  if (image.width !== descriptor.workingFrame.width || image.height !== descriptor.workingFrame.height) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_VALIDATION_FAILED", `/samples/${index}`, `Rendered frame is ${image.width}x${image.height}; expected ${descriptor.workingFrame.width}x${descriptor.workingFrame.height}.`)]);
  let minX = image.width; let minY = image.height; let maxX = -1; let maxY = -1; let alphaPixels = 0;
  const alpha = new Uint8Array(image.width * image.height);
  for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
    const value = image.pixels[(y * image.width + x) * 4 + 3]!; alpha[y * image.width + x] = value > 0 ? 1 : 0;
    if (value > 0) { alphaPixels += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  if (alphaPixels === 0) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_VALIDATION_FAILED", `/samples/${index}`, "Rendered frame is fully transparent.")]);
  const border = descriptor.border.transparentPixels;
  if (minX < border || minY < border || maxX >= image.width - border || maxY >= image.height - border) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_VALIDATION_FAILED", `/samples/${index}`, `Visible pixels violate the ${border}-pixel transparent border rule.`)]);
  if (sample.grounded === true && Math.abs(maxY - descriptor.anchor.y) > descriptor.anchor.groundedTolerance) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_VALIDATION_FAILED", `/samples/${index}`, `Grounded baseline ${maxY} is outside anchor ${descriptor.anchor.y} ± ${descriptor.anchor.groundedTolerance}.`)]);
  return { result: { index, id: sample.id, animation: sample.animation, timeSeconds: sample.timeSeconds, bounds: { minX, minY, maxX, maxY }, alphaPixels, rgbaSha256: sha256(image.pixels), alphaSha256: sha256(alpha) }, alpha };
}

function packSheet(frames: readonly RgbaImage[], descriptor: GodotAnimationExportDescriptor): RgbaImage {
  const cellWidth = descriptor.workingFrame.width * descriptor.scale; const cellHeight = descriptor.workingFrame.height * descriptor.scale;
  const width = cellWidth * descriptor.sheet.columns; const height = cellHeight * descriptor.sheet.rows; const pixels = new Uint8Array(width * height * 4);
  for (const [index, frame] of frames.entries()) {
    const originX = (index % descriptor.sheet.columns) * cellWidth; const originY = Math.floor(index / descriptor.sheet.columns) * cellHeight;
    for (let y = 0; y < cellHeight; y += 1) for (let x = 0; x < cellWidth; x += 1) {
      const sourceX = Math.floor(x / descriptor.scale); const sourceY = Math.floor(y / descriptor.scale);
      const sourceOffset = (sourceY * frame.width + sourceX) * 4; const targetOffset = ((originY + y) * width + originX + x) * 4;
      pixels.set(frame.pixels.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return { width, height, pixels };
}

async function writeOrVerify(path: string, bytes: Uint8Array): Promise<"verified" | "written"> {
  try {
    const existing = await readFile(path);
    if (!existing.equals(bytes)) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_OUTPUT_DRIFT", path, "Generated bytes differ from the existing output. Remove or deliberately replace the stale output before exporting.")]);
    return "verified";
  } catch (error) {
    if (error instanceof GodotAnimationExportError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    return "written";
  }
}

export async function exportGodotAnimation(options: ExportGodotAnimationOptions): Promise<GodotAnimationExportResult> {
  const projectRoot = await realpath(resolve(options.projectRoot)).catch(() => { throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_PATH_INVALID", options.projectRoot, "Project root does not exist.")]); });
  const descriptorPath = resolve(projectRoot, options.descriptorPath);
  await assertSafeProjectPath(projectRoot, descriptorPath, false);
  let descriptorBytes: Uint8Array; let parsed: unknown;
  try { descriptorBytes = await readFile(descriptorPath); parsed = JSON.parse(new TextDecoder().decode(descriptorBytes)); }
  catch { throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_DESCRIPTOR_INVALID", descriptorPath, "Descriptor is unreadable or invalid JSON.")]); }
  const validated = validateGodotAnimationDescriptor(parsed);
  if (!validated.valid || validated.descriptor === undefined) throw new GodotAnimationExportError(validated.findings);
  const descriptor = validated.descriptor;
  const godotProjectRoot = resolve(projectRoot, descriptor.godotProject);
  await assertSafeProjectPath(projectRoot, godotProjectRoot, false);
  if (!(await stat(join(godotProjectRoot, "project.godot")).then((entry) => entry.isFile()).catch(() => false))) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_PATH_INVALID", descriptor.godotProject, "godotProject must contain project.godot.")]);
  const scenePath = resolve(godotProjectRoot, descriptor.scene.slice("res://".length));
  await assertSafeProjectPath(godotProjectRoot, scenePath, false);
  await scanGodotProject(godotProjectRoot);
  const outputPaths = [...descriptor.variants.map((variant) => variant.output), descriptor.metadataOutput, descriptor.validationOutput];
  for (const output of outputPaths) await assertSafeProjectPath(projectRoot, resolve(projectRoot, output), true);

  const executable = options.godotExecutable ?? process.env.SFHS_GODOT_EXECUTABLE;
  if (executable === undefined || executable.length === 0) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_EXECUTABLE_INVALID", "/godotExecutable", "Pass --godot-executable or set SFHS_GODOT_EXECUTABLE.")]);
  const executablePath = resolve(executable);
  const executableDetails = await lstat(executablePath).catch(() => undefined);
  if (executableDetails === undefined || !executableDetails.isFile() || executableDetails.isSymbolicLink()) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_EXECUTABLE_INVALID", executablePath, "Godot executable must be a regular non-symlink file.")]);
  let version: string;
  const commandRunner = options.commandRunner ?? defaultCommandRunner;
  try { version = (await commandRunner(executablePath, ["--version"], { timeoutMilliseconds: 15_000, environment: scrubbedEnvironment() })).stdout.trim(); }
  catch { throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_EXECUTABLE_INVALID", executablePath, "Godot version invocation failed.")]); }
  if (version !== supportedGodotVersion && !version.startsWith(`${supportedGodotVersion}.official.`)) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_GODOT_UNSUPPORTED", executablePath, `Supported Godot version is ${supportedGodotVersion}; received ${version}.`)]);
  const executableSha256 = sha256(await readFile(executablePath));
  const temporaryRoot = await mkdtemp(join(tmpdir(), "sfhs-godot-animation-"));
  try {
    const renderDirectory = join(temporaryRoot, "frames"); await mkdir(renderDirectory);
    const renderReportPath = join(temporaryRoot, "render-report.json");
    const godotLogPath = join(temporaryRoot, "godot.log");
    const runConfigPath = join(temporaryRoot, "run-config.json");
    const runConfig = { scene: descriptor.scene, animationPlayer: descriptor.animationPlayer, workingFrame: descriptor.workingFrame, samples: descriptor.samples, variants: descriptor.variants.map((variant) => ({ id: variant.id, parameters: variant.parameters })), outputDirectory: renderDirectory };
    await writeFile(runConfigPath, canonicalJson(runConfig as unknown as GodotAnimationJsonValue));
    const driverPath = resolve(import.meta.dirname, "godot_export_driver.gd");
    try {
      await commandRunner(executablePath, ["--windowed", "--resolution", `${descriptor.workingFrame.width}x${descriptor.workingFrame.height}`, "--position", "-10000,-10000", "--audio-driver", "Dummy", "--rendering-method", "gl_compatibility", "--log-file", godotLogPath, "--path", godotProjectRoot, "--script", driverPath, "--", "--config", runConfigPath, "--report", renderReportPath], { cwd: godotProjectRoot, timeoutMilliseconds: options.timeoutMilliseconds ?? 120_000, environment: scrubbedEnvironment() });
    } catch (error) {
      const details = error as { stdout?: string; stderr?: string };
      throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_RENDER_FAILED", descriptor.scene, `Godot scene/animation export failed. ${details.stderr ?? details.stdout ?? ""}`.trim())]);
    }
    const renderReport = JSON.parse(await readFile(renderReportPath, "utf8")) as { ok?: boolean; frameCount?: number; renderer?: string };
    if (renderReport.ok !== true || renderReport.frameCount !== descriptor.samples.length * descriptor.variants.length) throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_RENDER_FAILED", descriptor.scene, "Godot render report is missing or incomplete.")]);

    const variantWork: { descriptor: GodotAnimationVariantDescriptor; frames: RgbaImage[]; frameResults: GodotAnimationFrameResult[]; alphaFrames: Uint8Array[] }[] = [];
    for (const [variantIndex, variant] of descriptor.variants.entries()) {
      const frames: RgbaImage[] = []; const frameResults: GodotAnimationFrameResult[] = []; const alphaFrames: Uint8Array[] = [];
      for (const [sampleIndex, sample] of descriptor.samples.entries()) {
        const frameBytes = await readFile(join(renderDirectory, `variant-${variantIndex}-frame-${sampleIndex}.png`)).catch(() => { throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_RENDER_FAILED", `/variants/${variantIndex}/samples/${sampleIndex}`, "Godot did not emit a required frame.")]); });
        let image: RgbaImage;
        try { image = decodeRgbaPng(frameBytes); } catch (error) { throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_VALIDATION_FAILED", `/variants/${variantIndex}/samples/${sampleIndex}`, `Rendered PNG is invalid: ${(error as Error).message}`)]); }
        const analysis = analyzeFrame(image, sample, sampleIndex, descriptor); frames.push(image); frameResults.push(analysis.result); alphaFrames.push(analysis.alpha);
      }
      variantWork.push({ descriptor: variant, frames, frameResults, alphaFrames });
    }
    if (descriptor.variantAlphaParity === true && variantWork.length > 1) for (let variantIndex = 1; variantIndex < variantWork.length; variantIndex += 1) for (let sampleIndex = 0; sampleIndex < descriptor.samples.length; sampleIndex += 1) {
      const expectedAlpha = variantWork[0]!.alphaFrames[sampleIndex]!; const actualAlpha = variantWork[variantIndex]!.alphaFrames[sampleIndex]!;
      const expectedAlphaSha256 = sha256(expectedAlpha); const actualAlphaSha256 = sha256(actualAlpha);
      if (expectedAlphaSha256 !== actualAlphaSha256) {
        let differingPixels = 0;
        for (let index = 0; index < expectedAlpha.length; index += 1) if (expectedAlpha[index] !== actualAlpha[index]) differingPixels += 1;
        throw new GodotAnimationExportError([finding("SFHS_GODOT_ANIMATION_VALIDATION_FAILED", `/variants/${variantIndex}/samples/${sampleIndex}`, `Variant alpha silhouettes differ while variantAlphaParity is required (${expectedAlphaSha256} != ${actualAlphaSha256}; ${differingPixels} pixels differ; expected ${JSON.stringify(variantWork[0]!.frameResults[sampleIndex]!.bounds)} with ${variantWork[0]!.frameResults[sampleIndex]!.alphaPixels} alpha pixels, received ${JSON.stringify(variantWork[variantIndex]!.frameResults[sampleIndex]!.bounds)} with ${variantWork[variantIndex]!.frameResults[sampleIndex]!.alphaPixels} alpha pixels).`)]);
      }
    }

    const outputResults: GodotAnimationVariantResult[] = [];
    for (const work of variantWork) {
      const outputPath = resolve(projectRoot, work.descriptor.output); const bytes = encodeRgbaPng(packSheet(work.frames, descriptor)); const disposition = await writeOrVerify(outputPath, bytes);
      outputResults.push({ id: work.descriptor.id, output: work.descriptor.output.replaceAll("\\", "/"), bytes: bytes.byteLength, sha256: sha256(bytes), disposition, frames: work.frameResults });
    }
    const descriptorSha256 = sha256(descriptorBytes);
    const metadata = { schema: "sfhs.godot-animation-export-metadata@1", descriptor: { path: relative(projectRoot, descriptorPath).replaceAll("\\", "/"), sha256: descriptorSha256 }, godot: { version, supportedVersion: supportedGodotVersion, executableSha256, renderer: renderReport.renderer ?? "unknown", executionMode: "noninteractive-offscreen-window", sourceGuard: "fail-closed textual preflight; not an OS syscall sandbox" }, workingFrame: descriptor.workingFrame, scale: descriptor.scale, sheet: descriptor.sheet, anchor: descriptor.anchor, samples: descriptor.samples, outputs: outputResults.map(({ id, output, bytes, sha256: outputSha256 }) => ({ id, output, bytes, sha256: outputSha256 })) };
    const validation = { schema: "sfhs.godot-animation-validation@1", valid: true, checks: ["descriptor", "path-and-symlink-guard", "network-source-guard", "godot-version", "rgba8", "alpha-nonempty", "transparent-border", "anchor-baseline", "nearest-integer-scaling", "row-major-sheet-packing", ...(descriptor.variantAlphaParity === true ? ["variant-alpha-parity"] : [])], outputs: outputResults.map(({ id, output, bytes, sha256: outputSha256, frames }) => ({ id, output, bytes, sha256: outputSha256, frames })) };
    await writeOrVerify(resolve(projectRoot, descriptor.metadataOutput), new TextEncoder().encode(canonicalJson(metadata as unknown as GodotAnimationJsonValue)));
    await writeOrVerify(resolve(projectRoot, descriptor.validationOutput), new TextEncoder().encode(canonicalJson(validation as unknown as GodotAnimationJsonValue)));
    return { schema: "sfhs.godot-animation-export-result@1", valid: true, godot: { executable: executablePath, executableSha256, version, supportedVersion: supportedGodotVersion }, descriptor: { path: descriptorPath, sha256: descriptorSha256 }, outputs: outputResults, metadataOutput: resolve(projectRoot, descriptor.metadataOutput), validationOutput: resolve(projectRoot, descriptor.validationOutput) };
  } finally { await rm(temporaryRoot, { recursive: true, force: true }); }
}
