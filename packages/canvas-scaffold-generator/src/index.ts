import type { CanvasCapabilityReport } from "@sfhs/canvas-capability-analyzer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

export const packageIdentity = "@sfhs/canvas-scaffold-generator" as const;
export class SfhsScaffoldBlockedError extends Error { readonly code = "MIGRATION_BLOCKED" as const; constructor(message: string) { super(message); this.name = "SfhsScaffoldBlockedError"; } }
export interface SfhsScaffold { readonly verdict: "MIGRATION_REQUIRED"; readonly files: Readonly<Record<string, string>>; readonly capabilityManifest: Readonly<Record<string, unknown>>; }

export function generateSfhsCanvasScaffold(input: { readonly projectId: string; readonly report: CanvasCapabilityReport; readonly referenceStates: readonly string[] }): SfhsScaffold {
  if (input.report.verdict !== "ANALYSIS_PASS") throw new SfhsScaffoldBlockedError(`Canvas analysis is not complete: ${input.report.verdict}.`);
  const blocking = input.report.operations.filter((operation) => operation.productionObserved && (operation.classification === "UNKNOWN" || operation.classification === "BLOCKING_UNSUPPORTED"));
  if (blocking.length > 0) throw new SfhsScaffoldBlockedError(`Unsupported production operations: ${blocking.map((operation) => operation.operation).join(", ")}.`);
  const operations = input.report.operations.filter((operation) => operation.productionObserved);
  const nativeTodos = operations.filter((operation) => operation.classification === "REQUIRES_NATIVE_PIXI").map((operation) => operation.operation);
  const manifest = Object.freeze({ schema: "sfhs.canvas-migration@1", verdict: "MIGRATION_REQUIRED", sourceAnalysis: input.report.schema, operations: operations.map((operation) => ({ operation: operation.operation, classification: operation.classification, strategy: operation.pixiStrategy })), nativeTodos, referenceStates: input.referenceStates });
  const files: Record<string, string> = {
    "package.json": JSON.stringify({ name: `@sfhs/generated-${input.projectId}`, private: true, type: "module", dependencies: { "@sfhs/pixi-runtime": "workspace:*", "@sfhs/adapter-pixi-v8": "workspace:*", "@sfhs/pixi-canvas-compat": "workspace:*" } }, null, 2) + "\n",
    "sfhs.project.json": JSON.stringify({ schema: "sfhs.project@1", project: { id: input.projectId, title: input.projectId, version: "0.1.0" }, adapter: { id: "pixi-v8", versionRange: "^8.19.0", renderer: { required: "webgl", webgpu: "disabled", unsupportedBehavior: "show-capability-page" } }, source: { html: "src/index.html", entry: "src/main.ts", styles: ["src/styles.css"], publicDir: "public" }, viewport: { mode: "adaptive", logicalWidth: 960, logicalHeight: 540, maxDevicePixelRatio: 2, orientation: "adaptive" }, assets: { manifest: "src/assets/manifest.json", runtimeExternalUrls: [], inline: "all", maximumSingleAssetBytes: 4194304 }, runtime: { simulationHz: 60, maximumFrameDeltaMs: 250, pauseWhenHidden: true, domOverlay: true }, storage: { localStorage: "optional", exportImportFallback: true }, build: { output: "dist/index.html", minify: true, sourceMaps: "external-evidence-only", canonicalLineEnding: "lf", failOnExternalReference: true, failOnDynamicChunk: true }, test: { baseURL: "http://127.0.0.1:4173", browsers: ["chromium"], viewports: ["desktop"], screenshots: input.referenceStates, fileProtocolSmoke: true } }, null, 2) + "\n",
    "src/index.html": "<!doctype html><main id=\"pixi-host\"></main><script type=\"module\" src=\"./main.ts\"></script>\n",
    "src/main.ts": "// Generated shell: preserve simulation modules; route presentation through SFHSPixiCanvasCompat.\n// TODO: bind isolated simulation snapshots; do not create a Canvas2D surface.\nexport const migrationVerdict = 'MIGRATION_REQUIRED' as const;\n",
    "src/styles.css": "#pixi-host { min-height: 100dvh; }\n",
    "src/assets/manifest.json": "{ \"bundles\": [] }\n",
    "public/.gitkeep": "",
    "src/presentation/compat-renderer.ts": "// TODO: invoke @sfhs/pixi-canvas-compat only for operations listed in migration-capabilities.json.\n",
    "src/game/simulation.ts": "// TODO: import or preserve renderer-neutral simulation modules here.\n",
    "tests/visual-parity.spec.ts": `export const referenceStates = ${JSON.stringify(input.referenceStates)} as const;\n`,
    "evidence/migration-capabilities.json": JSON.stringify(manifest, null, 2) + "\n",
    "README.md": "# SFHS generated Canvas migration\n\nVerdict: MIGRATION_REQUIRED. This scaffold has no Canvas2D presentation and is not a release.\n"
  };
  return Object.freeze({ verdict: "MIGRATION_REQUIRED", files: Object.freeze(files), capabilityManifest: manifest });
}

export async function writeSfhsCanvasScaffold(outputDirectory: string, scaffold: SfhsScaffold): Promise<readonly string[]> {
  const root = resolve(outputDirectory); const written: string[] = [];
  for (const [relativePath, content] of Object.entries(scaffold.files).sort(([left], [right]) => left.localeCompare(right))) {
    if (isAbsolute(relativePath) || relativePath.includes("..")) throw new SfhsScaffoldBlockedError(`Unsafe generated path: ${relativePath}.`);
    const target = resolve(root, relativePath); const targetRelativeToRoot = relative(root, target);
    if (targetRelativeToRoot === ".." || targetRelativeToRoot.startsWith(`..${sep}`) || isAbsolute(targetRelativeToRoot)) throw new SfhsScaffoldBlockedError(`Generated path escaped output root: ${relativePath}.`);
    await mkdir(dirname(target), { recursive: true }); await writeFile(target, content, "utf8"); written.push(relativePath);
  }
  return Object.freeze(written);
}

