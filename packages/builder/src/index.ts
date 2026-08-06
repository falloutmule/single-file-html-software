import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";

import { type BuildResult, build, transform } from "esbuild";

import {
  canonicalJsonStringify,
  type SfhsProjectManifest,
  validateProjectManifest
} from "@sfhs/contracts";
import { discoverProject, resolveProjectPath, sha256Bytes } from "@sfhs/core";

export const packageIdentity = "@sfhs/builder" as const;

export type BuildErrorCode =
  | "SFHS_BUILD_ASSET_INVALID"
  | "SFHS_BUILD_ASSET_UNSUPPORTED"
  | "SFHS_BUILD_ASSET_TOO_LARGE"
  | "SFHS_BUILD_BUNDLE_FAILED"
  | "SFHS_BUILD_INPUT_MISSING"
  | "SFHS_BUILD_MANIFEST_INVALID"
  | "SFHS_BUILD_OUTPUT_INVALID";

export class SfhsBuildError extends Error {
  readonly code: BuildErrorCode;

  constructor(code: BuildErrorCode, message: string) {
    super(message);
    this.name = "SfhsBuildError";
    this.code = code;
  }
}

export interface BuildPlan {
  readonly schema: "sfhs.build-plan@1";
  readonly projectRoot: string;
  readonly manifestPath: string;
  readonly manifest: SfhsProjectManifest;
  readonly htmlPath: string;
  readonly entryPath: string;
  readonly stylePaths: readonly string[];
  readonly publicDirectoryPath: string;
  readonly assetManifestPath: string;
  readonly outputPath: string;
}

export interface IntermediateAsset {
  readonly projectPath: string;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
}

export interface IntermediateOutputAsset {
  readonly fileName: string;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
}

export interface IntermediateBundle {
  readonly schema: "sfhs.intermediate@1";
  readonly projectId: string;
  readonly projectRoot: string;
  readonly outputPath: string;
  readonly htmlTemplate: string;
  readonly javascript: string;
  readonly stylesheet: string;
  readonly declaredAssets: readonly IntermediateAsset[];
  readonly emittedAssets: readonly IntermediateOutputAsset[];
  readonly moduleInputs: readonly string[];
  readonly sourceSha256: string;
}

interface AssetManifestEntry {
  readonly alias: string;
  readonly src: string;
}

interface AssetManifest {
  readonly bundles: ReadonlyArray<{
    readonly name: string;
    readonly assets: readonly AssetManifestEntry[];
  }>;
}

function deepFreeze<Value>(value: Value): Value {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function normalizeLineEndings(value: string): string {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function projectPath(projectRoot: string, absolutePath: string): string {
  return relative(projectRoot, absolutePath).split(sep).join("/");
}

function isInsideProject(projectRoot: string, candidatePath: string): boolean {
  const fromRoot = relative(projectRoot, candidatePath);
  return fromRoot === "" || (!fromRoot.startsWith(`..${sep}`) && fromRoot !== ".." && !isAbsolute(fromRoot));
}

function mediaTypeFor(pathValue: string): string {
  switch (extname(pathValue).toLowerCase()) {
    case ".json": return "application/json";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".svg": return "image/svg+xml";
    case ".wav": return "audio/wav";
    default: throw new SfhsBuildError(
      "SFHS_BUILD_ASSET_UNSUPPORTED",
      `Unsupported v0.1 asset extension: ${extname(pathValue).toLowerCase() || "<none>"}`
    );
  }
}

async function readRequired(pathValue: string): Promise<Uint8Array> {
  try {
    return await readFile(pathValue);
  } catch {
    throw new SfhsBuildError("SFHS_BUILD_INPUT_MISSING", `Required build input is missing: ${pathValue}`);
  }
}

async function readJson(pathValue: string): Promise<unknown> {
  const bytes = await readRequired(pathValue);
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8")) as unknown;
  } catch {
    throw new SfhsBuildError("SFHS_BUILD_MANIFEST_INVALID", `Build input is not valid JSON: ${pathValue}`);
  }
}

function cloneManifest(value: unknown): SfhsProjectManifest {
  return deepFreeze(JSON.parse(canonicalJsonStringify(value)) as SfhsProjectManifest);
}

export async function createBuildPlan(startPath: string): Promise<BuildPlan> {
  const discovery = await discoverProject(startPath);
  const manifestValue = await readJson(discovery.manifestPath);
  const validation = validateProjectManifest(manifestValue, { mode: "release" });
  if (!validation.valid) {
    const codes = validation.findings.map((finding) => finding.code).join(", ");
    throw new SfhsBuildError("SFHS_BUILD_MANIFEST_INVALID", `Project manifest failed release validation: ${codes}`);
  }
  const manifest = cloneManifest(manifestValue);
  const stylePaths = await Promise.all(
    manifest.source.styles.map((pathValue) => resolveProjectPath(discovery.projectRoot, pathValue))
  );
  const plan: BuildPlan = {
    schema: "sfhs.build-plan@1",
    projectRoot: discovery.projectRoot,
    manifestPath: discovery.manifestPath,
    manifest,
    htmlPath: await resolveProjectPath(discovery.projectRoot, manifest.source.html),
    entryPath: await resolveProjectPath(discovery.projectRoot, manifest.source.entry),
    stylePaths: Object.freeze(stylePaths),
    publicDirectoryPath: await resolveProjectPath(discovery.projectRoot, manifest.source.publicDir),
    assetManifestPath: await resolveProjectPath(discovery.projectRoot, manifest.assets.manifest),
    outputPath: await resolveProjectPath(discovery.projectRoot, manifest.build.output)
  };
  return Object.freeze(plan);
}

function asAssetManifest(value: unknown): AssetManifest {
  if (value === null || typeof value !== "object" || !Array.isArray((value as { bundles?: unknown }).bundles)) {
    throw new SfhsBuildError("SFHS_BUILD_ASSET_INVALID", "Asset manifest requires a bundles array.");
  }
  const manifest = value as AssetManifest;
  for (const bundle of manifest.bundles) {
    if (typeof bundle.name !== "string" || !Array.isArray(bundle.assets)) {
      throw new SfhsBuildError("SFHS_BUILD_ASSET_INVALID", "Every asset bundle requires a name and assets array.");
    }
    for (const asset of bundle.assets) {
      if (typeof asset.alias !== "string" || typeof asset.src !== "string" || asset.src.length === 0) {
        throw new SfhsBuildError("SFHS_BUILD_ASSET_INVALID", "Every declared asset requires an alias and local source.");
      }
      if (/^(?:[a-z]+:|\/\/)/iu.test(asset.src)) {
        throw new SfhsBuildError("SFHS_BUILD_ASSET_INVALID", `Asset source must be local: ${asset.src}`);
      }
    }
  }
  return manifest;
}

async function collectDeclaredAssets(plan: BuildPlan): Promise<readonly IntermediateAsset[]> {
  const assetManifest = asAssetManifest(await readJson(plan.assetManifestPath));
  const assets = new Map<string, IntermediateAsset>();
  for (const bundle of assetManifest.bundles) {
    for (const entry of bundle.assets) {
      const candidate = resolve(dirname(plan.assetManifestPath), entry.src);
      if (!isInsideProject(plan.projectRoot, candidate)) {
        throw new SfhsBuildError("SFHS_BUILD_ASSET_INVALID", `Asset escapes the project root: ${entry.src}`);
      }
      const resolvedAssetPath = await resolveProjectPath(plan.projectRoot, projectPath(plan.projectRoot, candidate));
      const bytes = await readRequired(resolvedAssetPath);
      if (bytes.byteLength > plan.manifest.assets.maximumSingleAssetBytes) {
        throw new SfhsBuildError("SFHS_BUILD_ASSET_TOO_LARGE", `Asset exceeds the configured size limit: ${entry.src}`);
      }
      const relativePath = projectPath(plan.projectRoot, resolvedAssetPath);
      assets.set(relativePath, Object.freeze({
        projectPath: relativePath,
        mediaType: mediaTypeFor(resolvedAssetPath),
        bytes: new Uint8Array(bytes),
        sha256: sha256Bytes(bytes)
      }));
    }
  }
  return Object.freeze([...assets.values()].sort((left, right) => left.projectPath.localeCompare(right.projectPath)));
}

function sourceHash(entries: ReadonlyMap<string, Uint8Array>): string {
  const hash = createHash("sha256");
  for (const [pathValue, bytes] of [...entries].sort(([left], [right]) => left.localeCompare(right))) {
    hash.update(pathValue, "utf8");
    hash.update("\0", "utf8");
    hash.update(bytes);
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

function outputImports(result: BuildResult): readonly string[] {
  const outputs = result.metafile?.outputs ?? {};
  return Object.values(outputs).flatMap((output) => output.imports
    .filter((entry) => entry.kind !== "file-loader")
    .map((entry) => entry.path));
}

export async function buildIntermediate(plan: BuildPlan): Promise<IntermediateBundle> {
  try {
    if (!(await stat(plan.publicDirectoryPath)).isDirectory()) {
      throw new SfhsBuildError("SFHS_BUILD_INPUT_MISSING", "The declared public directory is not a directory.");
    }
  } catch (error) {
    if (error instanceof SfhsBuildError) {
      throw error;
    }
    throw new SfhsBuildError("SFHS_BUILD_INPUT_MISSING", "The declared public directory is missing.");
  }

  const [htmlBytes, declaredAssets, ...styleBytes] = await Promise.all([
    readRequired(plan.htmlPath),
    collectDeclaredAssets(plan),
    ...plan.stylePaths.map(readRequired)
  ]);
  const intermediateDirectory = join(plan.projectRoot, ".sfhs-intermediate");
  let result: BuildResult;
  try {
    result = await build({
      absWorkingDir: plan.projectRoot,
      entryPoints: [plan.entryPath],
      bundle: true,
      platform: "browser",
      format: "iife",
      target: ["es2022"],
      write: false,
      metafile: true,
      splitting: false,
      sourcemap: false,
      minify: plan.manifest.build.minify,
      legalComments: "none",
      // Let esbuild serialize JavaScript syntax rather than carrying raw C0/C1 controls into HTML.
      // The packer remains fail-closed if an unsupported syntax context retains one.
      charset: "ascii",
      treeShaking: true,
      logLevel: "silent",
      outdir: intermediateDirectory,
      entryNames: "app",
      assetNames: "assets/[name]-[hash]",
      loader: {
        ".png": "file",
        ".jpg": "file",
        ".jpeg": "file",
        ".webp": "file",
        ".svg": "file",
        ".wav": "file"
      },
      define: {
        "process.env.NODE_ENV": '"production"'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown bundler failure.";
    throw new SfhsBuildError("SFHS_BUILD_BUNDLE_FAILED", message);
  }

  if (outputImports(result).length > 0) {
    throw new SfhsBuildError("SFHS_BUILD_OUTPUT_INVALID", "Bundled output retains runtime imports.");
  }
  const outputFiles = result.outputFiles ?? [];
  const javascriptFiles = outputFiles.filter((file) => extname(file.path) === ".js");
  if (javascriptFiles.length !== 1) {
    throw new SfhsBuildError("SFHS_BUILD_OUTPUT_INVALID", "The builder must emit exactly one JavaScript bundle.");
  }
  const javascriptFile = javascriptFiles[0];
  if (javascriptFile === undefined) {
    throw new SfhsBuildError("SFHS_BUILD_OUTPUT_INVALID", "The JavaScript bundle is missing.");
  }

  const transformedStyles = await Promise.all(styleBytes.map(async (bytes) => {
    const transformed = await transform(Buffer.from(bytes).toString("utf8"), {
      loader: "css",
      minify: plan.manifest.build.minify,
      legalComments: "none"
    });
    return normalizeLineEndings(transformed.code).trim();
  }));
  const javascript = normalizeLineEndings(javascriptFile.text).trim();
  const stylesheet = transformedStyles.filter(Boolean).join("\n");
  const emittedAssets = Object.freeze(outputFiles
    .filter((file) => file !== javascriptFile && extname(file.path) !== ".css" && extname(file.path) !== ".map")
    .map((file): IntermediateOutputAsset => {
      const fileName = relative(intermediateDirectory, file.path).split(sep).join("/");
      return Object.freeze({
        fileName,
        mediaType: mediaTypeFor(file.path),
        bytes: new Uint8Array(file.contents),
        sha256: sha256Bytes(file.contents)
      });
    })
    .sort((left, right) => left.fileName.localeCompare(right.fileName)));

  const moduleInputs = Object.keys(result.metafile?.inputs ?? {})
    .map((input) => resolve(plan.projectRoot, input))
    .filter((input) => isInsideProject(plan.projectRoot, input))
    .map((input) => projectPath(plan.projectRoot, input))
    .sort();
  const sourceEntries = new Map<string, Uint8Array>();
  const requiredPaths = [
    plan.manifestPath,
    plan.htmlPath,
    plan.assetManifestPath,
    ...plan.stylePaths,
    ...moduleInputs.map((input) => resolve(plan.projectRoot, input)),
    ...declaredAssets.map((asset) => resolve(plan.projectRoot, asset.projectPath))
  ];
  for (const pathValue of [...new Set(requiredPaths)]) {
    sourceEntries.set(projectPath(plan.projectRoot, pathValue), await readRequired(pathValue));
  }
  sourceEntries.set("@sfhs/intermediate/app.js", new Uint8Array(Buffer.from(javascript, "utf8")));
  sourceEntries.set("@sfhs/intermediate/styles.css", new Uint8Array(Buffer.from(stylesheet, "utf8")));

  return Object.freeze({
    schema: "sfhs.intermediate@1",
    projectId: plan.manifest.project.id,
    projectRoot: plan.projectRoot,
    outputPath: plan.outputPath,
    htmlTemplate: normalizeLineEndings(Buffer.from(htmlBytes).toString("utf8")),
    javascript,
    stylesheet,
    declaredAssets,
    emittedAssets,
    moduleInputs: Object.freeze(moduleInputs),
    sourceSha256: sourceHash(sourceEntries)
  });
}

export async function buildProject(startPath: string): Promise<IntermediateBundle> {
  return buildIntermediate(await createBuildPlan(startPath));
}
