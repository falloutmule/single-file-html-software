export const packageIdentity = "@sfhs/renderer-classifier" as const;

export interface RendererAnalysisPage {
  addInitScript(script: () => void): Promise<unknown>;
  evaluate<Result>(script: () => Result): Promise<Result>;
}

export type RendererKind = "CANVAS_2D" | "PIXI" | "DOM" | "SVG" | "WEBGL_GENERIC" | "UNKNOWN";
export type RendererClassification = RendererKind | "MIXED_INTENTIONAL" | "MIXED_REDUNDANT";
export type RendererVerdict = "BLOCKED_ON_ADAPTER_MISMATCH" | "BLOCKED_ON_RENDERER_AMBIGUITY" | "BLOCKED_ON_UNSUPPORTED_RENDERER" | "MIGRATION_REQUIRED" | "ANALYSIS_PASS";

export interface StaticRendererEvidence {
  readonly canvas2d: number;
  readonly webgl: number;
  readonly pixi: number;
  readonly svg: number;
  readonly domAnimation: number;
  readonly canvasCreation: number;
  readonly animationFrames: number;
  readonly renderIntervals: number;
  readonly entrypoints: readonly string[];
}

export interface RuntimeSurfaceEvidence {
  readonly id: string;
  readonly tag: "CANVAS" | "SVG" | "DOM";
  readonly contextType: "2d" | "webgl" | "webgl2" | null;
  readonly pixiOwned?: boolean;
  readonly creationOrder: number;
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly backingWidth: number;
  readonly backingHeight: number;
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
  readonly opacity: number;
  readonly display: string;
  readonly zIndex: string;
  readonly pointerEvents: string;
  readonly domOrder: number;
  readonly changedPixels: number;
  readonly drawCount: number;
  readonly clearCount: number;
  readonly eventCount: number;
  readonly hitTest: boolean;
  readonly resized: boolean;
  readonly frameCallbacks: number;
}

export interface RendererClassificationReport {
  readonly schema: "sfhs.renderer-classification@1";
  readonly classification: RendererClassification;
  readonly primary: ClassifiedSurface | null;
  readonly secondary: readonly ClassifiedSurface[];
  readonly confidence: number;
  readonly evidence: readonly string[];
  readonly blockingFindings: readonly string[];
  readonly verdict: RendererVerdict;
}

export interface ClassifiedSurface extends RuntimeSurfaceEvidence {
  readonly kind: RendererKind;
  readonly meaningful: boolean;
}

const count = (source: string, expression: RegExp): number => [...source.matchAll(expression)].length;

export function analyzeRendererSource(source: string): StaticRendererEvidence {
  const entrypoints = [
    ["canvas-2d", /getContext\s*\(\s*["']2d["']/],
    ["webgl", /getContext\s*\(\s*["']webgl2?["']/],
    ["pixi-application", /(?:new\s+PIXI\.Application|PIXI\.Application\.init|new\s+Application\s*\()/],
    ["animation-frame", /requestAnimationFrame\s*\(/],
    ["render-interval", /setInterval\s*\([^)]*(?:render|draw|paint)/s]
  ] as const;
  return Object.freeze({
    canvas2d: count(source, /getContext\s*\(\s*["']2d["']/g),
    webgl: count(source, /getContext\s*\(\s*["']webgl2?["']/g),
    pixi: count(source, /(?:new\s+PIXI\.Application|PIXI\.Application\.init|new\s+Application\s*\()/g),
    svg: count(source, /(?:createElementNS\s*\([^)]*["']svg["']|<svg\b)/gi),
    domAnimation: count(source, /(?:\.animate\s*\(|@keyframes\b|style\.(?:transform|left|top)\s*=)/g),
    canvasCreation: count(source, /createElement\s*\(\s*["']canvas["']/g),
    animationFrames: count(source, /requestAnimationFrame\s*\(/g),
    renderIntervals: count(source, /setInterval\s*\([^)]*(?:render|draw|paint)/gs),
    entrypoints: Object.freeze(entrypoints.filter(([, pattern]) => pattern.test(source)).map(([name]) => name))
  });
}

function kindOf(surface: RuntimeSurfaceEvidence, staticEvidence: StaticRendererEvidence): RendererKind {
  if (surface.tag === "SVG") return "SVG";
  if (surface.tag === "DOM") return "DOM";
  if (surface.contextType === "2d") return "CANVAS_2D";
  if (surface.contextType === "webgl" || surface.contextType === "webgl2") {
    return surface.pixiOwned === true || staticEvidence.pixi > 0 ? "PIXI" : "WEBGL_GENERIC";
  }
  return "UNKNOWN";
}

function score(surface: ClassifiedSurface): number {
  return (surface.visible ? 30 : 0) + (surface.meaningful ? 35 : 0) + (surface.hitTest ? 15 : 0)
    + Math.min(surface.changedPixels, 1000) / 100 + Math.min(surface.eventCount, 10) + surface.domOrder / 1000;
}

export function classifyRenderer(staticEvidence: StaticRendererEvidence, surfaces: readonly RuntimeSurfaceEvidence[]): RendererClassificationReport {
  const classified = surfaces.map((surface) => Object.freeze({
    ...surface,
    kind: kindOf(surface, staticEvidence),
    meaningful: surface.drawCount > surface.clearCount || surface.changedPixels > 8
  }));
  const candidates = classified.filter((surface) => surface.visible && surface.meaningful).sort((a, b) => score(b) - score(a));
  const primary = candidates[0] ?? null;
  const close = primary === null ? [] : candidates.filter((surface) => surface !== primary && score(primary) - score(surface) < 10);
  const secondary = classified.filter((surface) => surface !== primary);
  const emptyPixi = secondary.some((surface) => surface.kind === "PIXI" && surface.visible && !surface.meaningful);
  const ambiguous = close.length > 0;
  let classification: RendererClassification = primary?.kind ?? "UNKNOWN";
  let verdict: RendererVerdict = "ANALYSIS_PASS";
  const blockingFindings: string[] = [];
  if (ambiguous) {
    classification = "UNKNOWN";
    verdict = "BLOCKED_ON_RENDERER_AMBIGUITY";
    blockingFindings.push("Multiple meaningful visible surfaces have indistinguishable primary-presentation evidence.");
  } else if (primary?.kind === "CANVAS_2D" && emptyPixi) {
    classification = "MIXED_REDUNDANT";
    verdict = "BLOCKED_ON_ADAPTER_MISMATCH";
    blockingFindings.push("Visible Canvas2D presentation overlays an empty or non-meaningful Pixi surface.");
  } else if (primary?.kind === "CANVAS_2D") {
    verdict = "MIGRATION_REQUIRED";
  } else if (primary === null || primary.kind === "UNKNOWN") {
    verdict = "BLOCKED_ON_RENDERER_AMBIGUITY";
    blockingFindings.push("No meaningful primary presentation surface could be proven.");
  } else if (primary.kind === "DOM" || primary.kind === "SVG" || primary.kind === "WEBGL_GENERIC") {
    verdict = "BLOCKED_ON_UNSUPPORTED_RENDERER";
  } else if (secondary.some((surface) => surface.visible && surface.meaningful)) {
    classification = "MIXED_INTENTIONAL";
  }
  return Object.freeze({
    schema: "sfhs.renderer-classification@1",
    classification,
    primary,
    secondary: Object.freeze(secondary),
    confidence: primary === null ? 0 : ambiguous ? 0.45 : Math.min(0.99, 0.7 + score(primary) / 200),
    evidence: Object.freeze(classified.map((surface) => `${surface.id}:${surface.kind}:visible=${surface.visible}:meaningful=${surface.meaningful}:hit=${surface.hitTest}:draw=${surface.drawCount}:clear=${surface.clearCount}:pixels=${surface.changedPixels}:z=${surface.zIndex}:order=${surface.domOrder}`)),
    blockingFindings: Object.freeze(blockingFindings),
    verdict
  });
}

export async function installRuntimeRendererInstrumentation(page: RendererAnalysisPage): Promise<void> {
  await page.addInitScript(() => {
    type Counters = { contextType: string | null; drawCount: number; clearCount: number; eventCount: number };
    const records = new WeakMap<HTMLCanvasElement, Counters>();
    const frameCallbacks = new Set<FrameRequestCallback>();
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(window, "__SFHS_RENDERER_RECORDS__", { value: records });
    Object.defineProperty(window, "__SFHS_RENDERER_FRAME_CALLBACKS__", { value: frameCallbacks });
    const originalAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = function (callback: FrameRequestCallback): number {
      frameCallbacks.add(callback);
      return originalAnimationFrame.call(window, callback);
    };
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void {
      if (this instanceof HTMLCanvasElement) {
        const record = records.get(this) ?? { contextType: null, drawCount: 0, clearCount: 0, eventCount: 0 };
        record.eventCount += 1;
        records.set(this, record);
      }
      originalAddEventListener.call(this, type, listener, options);
    };
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      const result = Reflect.apply(original, this, args) as RenderingContext | null;
      const type = String(args[0]);
      const record = records.get(this) ?? { contextType: null, drawCount: 0, clearCount: 0, eventCount: 0 };
      record.contextType ??= type;
      records.set(this, record);
      if (result !== null && !("__sfhsWrapped" in result)) {
        const drawNames = type === "2d" ? ["fill", "stroke", "fillRect", "strokeRect", "drawImage", "fillText", "strokeText", "putImageData"] : ["drawArrays", "drawElements"];
        for (const name of drawNames) {
          const target = result as unknown as Record<string, unknown>;
          const method = target[name];
          if (typeof method === "function") target[name] = function (...methodArgs: unknown[]) { record.drawCount += 1; return Reflect.apply(method, result, methodArgs); };
        }
        const target = result as unknown as Record<string, unknown>;
        const clear = target.clearRect ?? target.clear;
        if (typeof clear === "function") {
          const clearName = type === "2d" ? "clearRect" : "clear";
          target[clearName] = function (...methodArgs: unknown[]) { record.clearCount += 1; return Reflect.apply(clear, result, methodArgs); };
        }
        Object.defineProperty(result, "__sfhsWrapped", { value: true });
      }
      return result;
    } as typeof original;
  });
}

export async function captureRuntimeSurfaces(page: RendererAnalysisPage): Promise<readonly RuntimeSurfaceEvidence[]> {
  return page.evaluate(() => {
    type Counters = { contextType: "2d" | "webgl" | "webgl2" | null; drawCount: number; clearCount: number; eventCount: number };
    const instrumentedWindow = window as unknown as { __SFHS_RENDERER_RECORDS__?: WeakMap<HTMLCanvasElement, Counters>; __SFHS_RENDERER_FRAME_CALLBACKS__?: Set<FrameRequestCallback> };
    const records = instrumentedWindow.__SFHS_RENDERER_RECORDS__;
    const elements = [...document.querySelectorAll("canvas,svg,[data-sfhs-presentation]")];
    return elements.map((element, index) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const canvas = element instanceof HTMLCanvasElement ? element : null;
      const record = canvas === null ? undefined : records?.get(canvas);
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      return {
        id: element.id || `surface-${index}`,
        tag: element instanceof HTMLCanvasElement ? "CANVAS" as const : element instanceof SVGElement ? "SVG" as const : "DOM" as const,
        contextType: record?.contextType ?? null,
        pixiOwned: element.hasAttribute("data-pixi") || element.classList.contains("pixi-canvas"),
        creationOrder: index,
        cssWidth: rect.width, cssHeight: rect.height,
        backingWidth: canvas?.width ?? Math.round(rect.width), backingHeight: canvas?.height ?? Math.round(rect.height),
        x: rect.x, y: rect.y,
        visible: style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0,
        opacity: Number(style.opacity), display: style.display, zIndex: style.zIndex, pointerEvents: style.pointerEvents,
        domOrder: index, changedPixels: Number(element.getAttribute("data-sfhs-changed-pixels") ?? 0),
        drawCount: record?.drawCount ?? Number(element.getAttribute("data-sfhs-draw-count") ?? 0),
        clearCount: record?.clearCount ?? Number(element.getAttribute("data-sfhs-clear-count") ?? 0),
        eventCount: record?.eventCount ?? Number(element.getAttribute("data-sfhs-event-count") ?? 0),
        hitTest: document.elementFromPoint(centerX, centerY) === element,
        resized: element.getAttribute("data-sfhs-resized") === "true", frameCallbacks: instrumentedWindow.__SFHS_RENDERER_FRAME_CALLBACKS__?.size ?? Number(element.getAttribute("data-sfhs-frame-callbacks") ?? 0)
      };
    });
  });
}
