import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

export const packageIdentity = "@sfhs/canvas-capability-analyzer" as const;

export const canvasMethods = [
  "save", "restore", "beginPath", "closePath", "moveTo", "lineTo", "rect", "roundRect", "arc", "ellipse",
  "quadraticCurveTo", "bezierCurveTo", "fill", "stroke", "clip", "isPointInPath", "isPointInStroke",
  "fillRect", "strokeRect", "clearRect", "drawImage", "fillText", "strokeText", "measureText",
  "createLinearGradient", "createRadialGradient", "createConicGradient", "createPattern", "getImageData",
  "putImageData", "createImageData", "setLineDash", "getLineDash", "translate", "rotate", "scale",
  "transform", "setTransform", "resetTransform", "drawFocusIfNeeded", "scrollPathIntoView", "toDataURL", "toBlob"
] as const;

export const canvasProperties = [
  "fillStyle", "strokeStyle", "globalAlpha", "globalCompositeOperation", "lineWidth", "lineCap", "lineJoin",
  "miterLimit", "lineDashOffset", "font", "textAlign", "textBaseline", "direction", "fontKerning", "fontStretch",
  "fontVariantCaps", "letterSpacing", "wordSpacing", "textRendering", "imageSmoothingEnabled", "imageSmoothingQuality",
  "shadowBlur", "shadowColor", "shadowOffsetX", "shadowOffsetY", "filter"
] as const;

export type CanvasMethod = typeof canvasMethods[number];
export type CanvasProperty = typeof canvasProperties[number];
export type CanvasOperationKind = "method" | "property-read" | "property-write" | "unknown-context-alias";
export type CapabilityClassification = "SUPPORTED_EXACT" | "SUPPORTED_APPROXIMATION" | "REQUIRES_NATIVE_PIXI" | "BLOCKING_UNSUPPORTED" | "NOT_OBSERVED" | "UNKNOWN";

export interface SourceLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

export interface StaticCanvasOperation {
  readonly operation: string;
  readonly kind: CanvasOperationKind;
  readonly staticLocations: readonly SourceLocation[];
  readonly unknownContextAlias: boolean;
}

export interface StaticCanvasAnalysis {
  readonly schema: "sfhs.canvas-static-analysis@1";
  readonly files: readonly string[];
  readonly canvasCreationLocations: readonly SourceLocation[];
  readonly contextAcquisitionLocations: readonly SourceLocation[];
  readonly offscreenCanvasLocations: readonly SourceLocation[];
  readonly canvasToCanvasDrawLocations: readonly SourceLocation[];
  readonly unbalancedRestoreLocations: readonly SourceLocation[];
  readonly operations: readonly StaticCanvasOperation[];
  readonly unknownContextAliases: readonly SourceLocation[];
}

export interface RuntimeCanvasOperation {
  readonly operation: string;
  readonly kind: "method" | "property-read" | "property-write";
  readonly totalCalls: number;
  readonly maximumCallsPerFrame: number;
  readonly scenes: readonly string[];
  readonly argumentCategories: readonly string[];
  readonly values: readonly string[];
  readonly exceptions: readonly string[];
}

export interface RuntimeCanvasContext {
  readonly id: string;
  readonly sourceKind: "HTMLCanvasElement" | "OffscreenCanvas" | "UNKNOWN";
  readonly visible: boolean;
  readonly width: number;
  readonly height: number;
  readonly operations: readonly RuntimeCanvasOperation[];
  readonly saveDepthAtEnd: number;
  readonly maximumSaveDepth: number;
}

export interface RuntimeCanvasTrace {
  readonly schema: "sfhs.canvas-runtime-trace@1";
  readonly contexts: readonly RuntimeCanvasContext[];
  readonly scenes: readonly string[];
}

export interface CapabilityRecord {
  readonly operation: string;
  readonly kind: CanvasOperationKind;
  readonly observed: boolean;
  readonly productionObserved: boolean;
  readonly staticLocations: readonly SourceLocation[];
  readonly runtime: {
    readonly totalCalls: number;
    readonly maximumCallsPerFrame: number;
    readonly scenes: readonly string[];
    readonly argumentCategories: readonly string[];
    readonly values: readonly string[];
  };
  readonly classification: CapabilityClassification;
  readonly pixiStrategy: string;
  readonly stateDependencies: readonly string[];
  readonly testsRequired: readonly string[];
  readonly notes: readonly string[];
}

export interface CanvasCapabilityReport {
  readonly schema: "sfhs.canvas-capability-report@1";
  readonly operations: readonly CapabilityRecord[];
  readonly unknownProductionPaths: readonly string[];
  readonly verdict: "ANALYSIS_PASS" | "BLOCKED_ON_INCOMPLETE_CANVAS_ANALYSIS" | "BLOCKED_ON_UNSUPPORTED_CANVAS_FEATURES";
}

const methodSet = new Set<string>(canvasMethods);
const propertySet = new Set<string>(canvasProperties);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

function location(source: ts.SourceFile, node: ts.Node, root: string): SourceLocation {
  const point = source.getLineAndCharacterOfPosition(node.getStart(source));
  return Object.freeze({ file: relative(root, source.fileName).replaceAll("\\", "/"), line: point.line + 1, column: point.character + 1 });
}

function uniqueLocations(locations: readonly SourceLocation[]): readonly SourceLocation[] {
  const seen = new Set<string>();
  return Object.freeze(locations.filter((candidate) => {
    const key = `${candidate.file}:${candidate.line}:${candidate.column}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }));
}

function expressionKey(node: ts.Expression): string | undefined {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) {
    const base = expressionKey(node.expression);
    return base === undefined ? undefined : `${base}.${node.name.text}`;
  }
  return undefined;
}

function propertyName(node: ts.PropertyAccessExpression | ts.ElementAccessExpression): string | undefined {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  return ts.isStringLiteral(node.argumentExpression) ? node.argumentExpression.text : undefined;
}

function isTwoDGetContext(node: ts.Expression): boolean {
  return ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression)
    && node.expression.name.text === "getContext"
    && node.arguments[0] !== undefined
    && ts.isStringLiteral(node.arguments[0])
    && node.arguments[0].text === "2d";
}

async function filesBelow(root: string): Promise<readonly string[]> {
  const found: string[] = [];
  async function visit(path: string): Promise<void> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const candidate = join(path, entry.name);
      if (entry.isDirectory()) await visit(candidate);
      else if (sourceExtensions.has(entry.name.slice(entry.name.lastIndexOf("."))) && !entry.name.includes(".test.")) found.push(candidate);
    }
  }
  await visit(root);
  return Object.freeze(found.sort());
}

export async function analyzeCanvasProject(rootPath: string): Promise<StaticCanvasAnalysis> {
  const root = resolve(rootPath);
  const files = await filesBelow(root);
  const sources = await Promise.all(files.map(async (file) => Object.freeze({ file, source: ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true) })));
  return analyzeCanvasSources(root, sources);
}

export function analyzeCanvasSources(root: string, sources: readonly { readonly file: string; readonly source: ts.SourceFile }[]): StaticCanvasAnalysis {
  const known = new Set<string>();
  const knownCanvases = new Set<string>();
  const functionParameters = new Map<string, readonly ts.ParameterDeclaration[]>();
  const operations = new Map<string, { kind: CanvasOperationKind; locations: SourceLocation[]; unknown: boolean }>();
  const canvases: SourceLocation[] = [];
  const contexts: SourceLocation[] = [];
  const offscreen: SourceLocation[] = [];
  const canvasToCanvas: SourceLocation[] = [];
  const unbalancedRestore: SourceLocation[] = [];
  const unknownAliases: SourceLocation[] = [];
  const add = (operation: string, kind: CanvasOperationKind, source: ts.SourceFile, node: ts.Node, unknown = false): void => {
    const key = `${kind}:${operation}`;
    const entry = operations.get(key) ?? { kind, locations: [], unknown: false };
    entry.locations.push(location(source, node, root)); entry.unknown ||= unknown;
    operations.set(key, entry);
  };
  const knownExpression = (node: ts.Expression): boolean => {
    const key = expressionKey(node);
    return key !== undefined && known.has(key);
  };
  const mark = (node: ts.Expression): boolean => {
    const key = expressionKey(node);
    if (key === undefined || known.has(key)) return false;
    known.add(key); return true;
  };

  for (const { source } of sources) {
    const visit = (node: ts.Node): void => {
      if (ts.isFunctionLike(node) && node.name !== undefined && ts.isIdentifier(node.name)) functionParameters.set(node.name.text, node.parameters);
      if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && ts.isIdentifier(node.expression) && node.expression.text === "OffscreenCanvas") offscreen.push(location(source, node, root));
      const firstArgument = ts.isCallExpression(node) ? node.arguments[0] : undefined;
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "createElement" && firstArgument !== undefined && ts.isStringLiteral(firstArgument) && firstArgument.text === "canvas") canvases.push(location(source, node, root));
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const { source } of sources) {
      const visit = (node: ts.Node): void => {
        if (ts.isVariableDeclaration(node) && node.initializer !== undefined && ts.isIdentifier(node.name)) {
          const firstArgument = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : undefined;
          if (ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression) && node.initializer.expression.name.text === "createElement" && firstArgument !== undefined && ts.isStringLiteral(firstArgument) && firstArgument.text === "canvas") { if (!knownCanvases.has(node.name.text)) { knownCanvases.add(node.name.text); changed = true; } }
          else if (ts.isNewExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === "OffscreenCanvas") { if (!knownCanvases.has(node.name.text)) { knownCanvases.add(node.name.text); changed = true; } }
          else if (isTwoDGetContext(node.initializer)) { contexts.push(location(source, node, root)); changed ||= mark(node.name); }
          else if (knownExpression(node.initializer)) changed ||= mark(node.name);
          else if (ts.isObjectLiteralExpression(node.initializer)) {
            for (const property of node.initializer.properties) {
              if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && knownExpression(property.initializer)) {
                const key = `${node.name.text}.${property.name.text}`;
                if (!known.has(key)) { known.add(key); changed = true; }
              }
            }
          }
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isExpression(node.left) && knownExpression(node.right)) changed ||= mark(node.left);
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
          const parameters = functionParameters.get(node.expression.text);
          if (parameters !== undefined) node.arguments.forEach((argument, index) => {
            const parameter = parameters[index];
            if (parameter !== undefined && ts.isIdentifier(parameter.name) && knownExpression(argument) && !known.has(parameter.name.text)) { known.add(parameter.name.text); changed = true; }
          });
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left) && ts.isIdentifier(node.right) && knownCanvases.has(node.right.text) && !knownCanvases.has(node.left.text)) { knownCanvases.add(node.left.text); changed = true; }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }

  for (const { source } of sources) {
    let saveDepth = 0;
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
        const name = propertyName(node.expression);
        if (name !== undefined && methodSet.has(name)) {
          const base = node.expression.expression;
          const isKnownCanvasMethod = (name === "toDataURL" || name === "toBlob") && ts.isIdentifier(base) && knownCanvases.has(base.text);
          if (knownExpression(base) || isKnownCanvasMethod) add(name, "method", source, node.expression);
          else { add(name, "unknown-context-alias", source, node.expression, true); unknownAliases.push(location(source, node.expression, root)); }
          if (name === "save" && knownExpression(base)) saveDepth += 1;
          if (name === "restore" && knownExpression(base)) { if (saveDepth === 0) unbalancedRestore.push(location(source, node.expression, root)); else saveDepth -= 1; }
          if (name === "drawImage" && node.arguments[0] !== undefined && ts.isIdentifier(node.arguments[0]) && knownCanvases.has(node.arguments[0].text)) canvasToCanvas.push(location(source, node.expression, root));
        }
      }
      if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
        const name = propertyName(node);
        const isMethodCall = ts.isCallExpression(node.parent) && node.parent.expression === node;
        if (name !== undefined && propertySet.has(name) && !isMethodCall) {
          const isWrite = ts.isBinaryExpression(node.parent) && node.parent.left === node && node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
          if (knownExpression(node.expression)) add(name, isWrite ? "property-write" : "property-read", source, node);
          else if (isWrite) { add(name, "unknown-context-alias", source, node, true); unknownAliases.push(location(source, node, root)); }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return Object.freeze({
    schema: "sfhs.canvas-static-analysis@1",
    files: Object.freeze(sources.map(({ file }) => relative(root, file).replaceAll("\\", "/")).sort()),
    canvasCreationLocations: uniqueLocations(canvases), contextAcquisitionLocations: uniqueLocations(contexts), offscreenCanvasLocations: uniqueLocations(offscreen), canvasToCanvasDrawLocations: uniqueLocations(canvasToCanvas), unbalancedRestoreLocations: uniqueLocations(unbalancedRestore),
    operations: Object.freeze([...operations.entries()].map(([key, value]) => Object.freeze({ operation: key.slice(key.indexOf(":") + 1), kind: value.kind, staticLocations: uniqueLocations(value.locations), unknownContextAlias: value.unknown })).sort((a, b) => `${a.kind}:${a.operation}`.localeCompare(`${b.kind}:${b.operation}`))),
    unknownContextAliases: uniqueLocations(unknownAliases)
  });
}

export interface CanvasInstrumentationPage {
  addInitScript(script: () => void): Promise<unknown>;
  evaluate<Result>(script: () => Result): Promise<Result>;
}

export async function installRuntimeCanvasInstrumentation(page: CanvasInstrumentationPage): Promise<void> {
  await page.addInitScript(() => {
    type Operation = { kind: "method" | "property-read" | "property-write"; count: number; frames: Map<number, number>; scenes: Set<string>; args: Set<string>; values: Set<string>; exceptions: Set<string> };
    type Context = { id: string; sourceKind: "HTMLCanvasElement" | "OffscreenCanvas" | "UNKNOWN"; canvas: HTMLCanvasElement | OffscreenCanvas | null; operations: Map<string, Operation>; saveDepth: number; maximumSaveDepth: number };
    const contexts = new Map<CanvasRenderingContext2D, Context>(); let nextId = 1; let frame = 0; let scene = "title";
    const category = (value: unknown): string => {
      if (typeof value === "number") return Number.isFinite(value) ? "number" : "non-finite-number";
      if (typeof value === "string") return `string:${Math.min(value.length, 128)}`;
      if (value instanceof HTMLCanvasElement) return "HTMLCanvasElement";
      if (typeof OffscreenCanvas !== "undefined" && value instanceof OffscreenCanvas) return "OffscreenCanvas";
      if (typeof ImageBitmap !== "undefined" && value instanceof ImageBitmap) return "ImageBitmap";
      if (value instanceof HTMLImageElement) return "HTMLImageElement";
      if (value instanceof HTMLVideoElement) return "HTMLVideoElement";
      return value === null ? "null" : typeof value;
    };
    const textHash = (value: string): string => { let hash = 2166136261; for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619); return (hash >>> 0).toString(16); };
    const contextOf = (context: CanvasRenderingContext2D): Context => {
      const found = contexts.get(context); if (found !== undefined) return found;
      const rawCanvas: unknown = context.canvas;
      const canvas = rawCanvas instanceof HTMLCanvasElement ? rawCanvas : (typeof OffscreenCanvas !== "undefined" && rawCanvas instanceof OffscreenCanvas ? rawCanvas : null);
      const sourceKind: Context["sourceKind"] = canvas instanceof HTMLCanvasElement ? "HTMLCanvasElement" : (canvas === null ? "UNKNOWN" : "OffscreenCanvas");
      const created = { id: `canvas2d-${nextId++}`, sourceKind, canvas, operations: new Map<string, Operation>(), saveDepth: 0, maximumSaveDepth: 0 }; contexts.set(context, created); return created;
    };
    const record = (context: CanvasRenderingContext2D, name: string, kind: "method" | "property-read" | "property-write", args: readonly unknown[] = [], value?: unknown): void => {
      const holder = contextOf(context); const key = `${kind}:${name}`; const entry = holder.operations.get(key) ?? { kind, count: 0, frames: new Map<number, number>(), scenes: new Set<string>(), args: new Set<string>(), values: new Set<string>(), exceptions: new Set<string>() };
      entry.count += 1; entry.frames.set(frame, (entry.frames.get(frame) ?? 0) + 1); entry.scenes.add(scene); args.forEach((argument) => entry.args.add(category(argument)));
      if (name === "fillText" || name === "strokeText") { const text = typeof args[0] === "string" ? args[0] : ""; entry.values.add(`text:length=${text.length}:hash=${textHash(text)}`); }
      else if (value !== undefined) entry.values.add(typeof value === "string" ? `string:${value.slice(0, 128)}` : category(value)); holder.operations.set(key, entry);
    };
    const prototype = CanvasRenderingContext2D.prototype as unknown as Record<string, unknown>;
    const methods = ["save", "restore", "beginPath", "closePath", "moveTo", "lineTo", "rect", "roundRect", "arc", "ellipse", "quadraticCurveTo", "bezierCurveTo", "fill", "stroke", "clip", "isPointInPath", "isPointInStroke", "fillRect", "strokeRect", "clearRect", "drawImage", "fillText", "strokeText", "measureText", "createLinearGradient", "createRadialGradient", "createConicGradient", "createPattern", "getImageData", "putImageData", "createImageData", "setLineDash", "getLineDash", "translate", "rotate", "scale", "transform", "setTransform", "resetTransform"];
    for (const name of methods) {
      const original = prototype[name]; if (typeof original !== "function") continue;
      prototype[name] = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        record(this, name, "method", args); const holder = contextOf(this); if (name === "save") { holder.saveDepth += 1; holder.maximumSaveDepth = Math.max(holder.maximumSaveDepth, holder.saveDepth); } if (name === "restore") holder.saveDepth = Math.max(0, holder.saveDepth - 1);
        try { const result = Reflect.apply(original, this, args); if ((name === "createLinearGradient" || name === "createRadialGradient" || name === "createConicGradient") && result !== null && typeof (result as CanvasGradient).addColorStop === "function") { const gradient = result as CanvasGradient; const add = gradient.addColorStop.bind(gradient); gradient.addColorStop = (offset: number, color: string): void => { record(this, "addColorStop", "method", [offset, color]); add(offset, color); }; } return result; }
        catch (error) { const entry = holder.operations.get(`method:${name}`); entry?.exceptions.add(error instanceof Error ? error.name : "unknown"); throw error; }
      };
    }
    const properties = ["fillStyle", "strokeStyle", "globalAlpha", "globalCompositeOperation", "lineWidth", "lineCap", "lineJoin", "miterLimit", "lineDashOffset", "font", "textAlign", "textBaseline", "direction", "fontKerning", "fontStretch", "fontVariantCaps", "letterSpacing", "wordSpacing", "textRendering", "imageSmoothingEnabled", "imageSmoothingQuality", "shadowBlur", "shadowColor", "shadowOffsetX", "shadowOffsetY", "filter"];
    for (const name of properties) {
      const descriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, name); if (descriptor === undefined) continue;
      Object.defineProperty(CanvasRenderingContext2D.prototype, name, { configurable: true, enumerable: descriptor.enumerable ?? false, get(this: CanvasRenderingContext2D) { const value = descriptor.get?.call(this); record(this, name, "property-read", [], value); return value; }, set(this: CanvasRenderingContext2D, value: unknown) { record(this, name, "property-write", [], value); descriptor.set?.call(this, value); } });
    }
    const request = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (callback: FrameRequestCallback): number => request((time) => { frame += 1; callback(time); });
    Object.defineProperty(window, "__SFHS_CANVAS_CAPABILITY__", { value: Object.freeze({
      setScene(label: string) { scene = label; },
      snapshot(): RuntimeCanvasTrace {
        const sceneNames = [...new Set([...contexts.values()].flatMap((context) => [...context.operations.values()].flatMap((operation) => [...operation.scenes])))].sort();
        const serializedContexts = [...contexts.values()].map((context) => {
          const operations = [...context.operations.entries()].map(([key, operation]) => Object.freeze({
            operation: key.slice(key.indexOf(":") + 1), kind: operation.kind, totalCalls: operation.count,
            maximumCallsPerFrame: Math.max(0, ...operation.frames.values()), scenes: Object.freeze([...operation.scenes].sort()),
            argumentCategories: Object.freeze([...operation.args].sort()), values: Object.freeze([...operation.values].sort()), exceptions: Object.freeze([...operation.exceptions].sort())
          })).sort((left, right) => `${left.kind}:${left.operation}`.localeCompare(`${right.kind}:${right.operation}`));
          return Object.freeze({ id: context.id, sourceKind: context.sourceKind, visible: context.canvas instanceof HTMLCanvasElement && context.canvas.getBoundingClientRect().width > 0 && context.canvas.getBoundingClientRect().height > 0, width: context.canvas?.width ?? 0, height: context.canvas?.height ?? 0, operations: Object.freeze(operations), saveDepthAtEnd: context.saveDepth, maximumSaveDepth: context.maximumSaveDepth });
        }).sort((left, right) => left.id.localeCompare(right.id));
        return Object.freeze({ schema: "sfhs.canvas-runtime-trace@1", scenes: Object.freeze(sceneNames), contexts: Object.freeze(serializedContexts) });
      }
    }) });
  });
}

export async function captureRuntimeCanvasTrace(page: CanvasInstrumentationPage): Promise<RuntimeCanvasTrace> {
  return page.evaluate(() => (window as unknown as { __SFHS_CANVAS_CAPABILITY__: { snapshot(): RuntimeCanvasTrace } }).__SFHS_CANVAS_CAPABILITY__.snapshot());
}

function strategy(operation: string): { classification: CapabilityClassification; pixiStrategy: string; dependencies: readonly string[]; tests: readonly string[]; notes: readonly string[] } {
  if (["createConicGradient", "createPattern", "getImageData", "putImageData", "createImageData", "isPointInPath", "isPointInStroke", "drawFocusIfNeeded", "scrollPathIntoView"].includes(operation)) return { classification: "BLOCKING_UNSUPPORTED", pixiStrategy: "No approved compatibility strategy", dependencies: [], tests: ["explicit-block"], notes: ["Requires a separately approved implementation before migration."] };
  if (["createLinearGradient", "createRadialGradient", "fillText", "strokeText", "measureText", "font", "textAlign", "textBaseline"].includes(operation)) return { classification: "SUPPORTED_APPROXIMATION", pixiStrategy: operation.includes("Gradient") ? "Cached Pixi texture or approved shader" : "Pixi Text with packaged font/fallback", dependencies: ["transform", "globalAlpha"], tests: ["declared-visual-tolerance"], notes: ["Visual or measurement tolerance must be approved in the later compatibility contract."] };
  if (["drawImage"].includes(operation)) return { classification: "SUPPORTED_EXACT", pixiStrategy: "Texture registry Sprite; offscreen canvas becomes attributed texture", dependencies: ["transform", "globalAlpha"], tests: ["source-destination-rectangles", "texture-cache"], notes: [] };
  if (["globalCompositeOperation"].includes(operation)) return { classification: "SUPPORTED_EXACT", pixiStrategy: "Validate observed blend mode against Pixi blend table", dependencies: ["globalCompositeOperation"], tests: ["blend-mode"], notes: [] };
  if (operation === "UNKNOWN_CONTEXT_ALIAS") return { classification: "UNKNOWN", pixiStrategy: "Resolve source alias before conversion", dependencies: [], tests: ["alias-resolution"], notes: ["Unknown context ownership blocks complete analysis."] };
  return { classification: "SUPPORTED_EXACT", pixiStrategy: "Pixi Graphics/state command", dependencies: ["transform", "globalAlpha", "style"], tests: ["state-order", "command-conformance"], notes: [] };
}

export function buildCapabilityReport(staticAnalysis: StaticCanvasAnalysis, trace: RuntimeCanvasTrace, options: { readonly nonProductionOperations?: ReadonlySet<string> } = {}): CanvasCapabilityReport {
  const combined = new Map<string, { kinds: Set<CanvasOperationKind>; locations: SourceLocation[]; runtime: RuntimeCanvasOperation[] }>();
  for (const operation of staticAnalysis.operations) { const entry = combined.get(operation.operation) ?? { kinds: new Set(), locations: [], runtime: [] }; entry.kinds.add(operation.kind); entry.locations.push(...operation.staticLocations); combined.set(operation.operation, entry); }
  for (const context of trace.contexts) for (const operation of context.operations) { const entry = combined.get(operation.operation) ?? { kinds: new Set(), locations: [], runtime: [] }; entry.kinds.add(operation.kind); entry.runtime.push(operation); combined.set(operation.operation, entry); }
  for (const name of [...canvasMethods, ...canvasProperties]) if (!combined.has(name)) combined.set(name, { kinds: new Set(), locations: [], runtime: [] });
  if (staticAnalysis.unknownContextAliases.length > 0 && !combined.has("UNKNOWN_CONTEXT_ALIAS")) combined.set("UNKNOWN_CONTEXT_ALIAS", { kinds: new Set(["unknown-context-alias"]), locations: [...staticAnalysis.unknownContextAliases], runtime: [] });
  const operations = [...combined.entries()].map(([operation, entry]) => {
    const meta = strategy(operation); const runtime = entry.runtime;
    const totalCalls = runtime.reduce((total, candidate) => total + candidate.totalCalls, 0);
    const maximumCallsPerFrame = Math.max(0, ...runtime.map((candidate) => candidate.maximumCallsPerFrame));
    const scenes = [...new Set(runtime.flatMap((candidate) => candidate.scenes))].sort(); const args = [...new Set(runtime.flatMap((candidate) => candidate.argumentCategories))].sort(); const values = [...new Set(runtime.flatMap((candidate) => candidate.values))].sort();
    const unknown = entry.kinds.has("unknown-context-alias") || runtime.some((candidate) => candidate.exceptions.length > 0);
    const observed = entry.locations.length > 0 || totalCalls > 0;
    return Object.freeze({ operation, kind: entry.kinds.has("unknown-context-alias") ? "unknown-context-alias" : (entry.kinds.has("method") ? "method" : entry.kinds.has("property-write") ? "property-write" : "property-read"), observed, productionObserved: observed && !options.nonProductionOperations?.has(operation), staticLocations: Object.freeze(entry.locations), runtime: Object.freeze({ totalCalls, maximumCallsPerFrame, scenes: Object.freeze(scenes), argumentCategories: Object.freeze(args), values: Object.freeze(values) }), classification: unknown ? "UNKNOWN" : (entry.locations.length === 0 && totalCalls === 0 ? "NOT_OBSERVED" : meta.classification), pixiStrategy: meta.pixiStrategy, stateDependencies: meta.dependencies, testsRequired: meta.tests, notes: meta.notes });
  }).sort((left, right) => left.operation.localeCompare(right.operation));
  const unknownProductionPaths = operations.filter((operation) => operation.productionObserved && operation.classification === "UNKNOWN").map((operation) => operation.operation);
  const blocked = operations.filter((operation) => operation.productionObserved && operation.classification === "BLOCKING_UNSUPPORTED").map((operation) => operation.operation);
  return Object.freeze({ schema: "sfhs.canvas-capability-report@1", operations: Object.freeze(operations), unknownProductionPaths: Object.freeze(unknownProductionPaths), verdict: unknownProductionPaths.length > 0 ? "BLOCKED_ON_INCOMPLETE_CANVAS_ANALYSIS" : blocked.length > 0 ? "BLOCKED_ON_UNSUPPORTED_CANVAS_FEATURES" : "ANALYSIS_PASS" });
}
