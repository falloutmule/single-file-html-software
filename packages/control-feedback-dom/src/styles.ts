import type { ControlGradient, ControlLayerStyle, ControlLength, ControlShadow, ControlTransform } from "@sfhs/control-feedback-contract";

export const domControlStyleText = `
.sfhs-cf-root{position:relative;display:inline-grid;isolation:isolate;box-sizing:border-box;min-width:44px;min-height:44px;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;cursor:pointer}
.sfhs-cf-root[data-disabled="true"]{cursor:not-allowed}
.sfhs-cf-interactive{position:absolute;inset:0;z-index:20;width:100%;height:100%;margin:0;border:0;padding:0;opacity:.001;cursor:inherit;touch-action:none}
button.sfhs-cf-interactive{appearance:none;background:transparent;color:transparent}
.sfhs-cf-visual{position:absolute;z-index:1;pointer-events:none;overflow:visible}
.sfhs-cf-layers,.sfhs-cf-effects{position:absolute;inset:0;pointer-events:none}
.sfhs-cf-layer{position:absolute;inset:0;display:grid;place-items:center;box-sizing:border-box;will-change:transform,box-shadow,opacity}
.sfhs-cf-content{position:absolute;inset:0;z-index:10;display:grid;place-items:center;pointer-events:none;font:600 14px/1.1 system-ui,sans-serif;color:#fff}
.sfhs-cf-effect{position:absolute;z-index:8;border-radius:999px;pointer-events:none;background:currentColor;opacity:.22;transform:translate(-50%,-50%) scale(0)}
.sfhs-cf-field{width:200%;aspect-ratio:1;animation:sfhs-cf-field-in 250ms ease-out forwards}
.sfhs-cf-activation{width:18px;height:18px;animation:sfhs-cf-ripple var(--sfhs-cf-ripple-ms) ease-out forwards}
.sfhs-cf-status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.sfhs-cf-root[data-focus-visible="true"]{outline:2px solid #fff;outline-offset:3px}
.sfhs-cf-root[data-reduced-motion="true"] .sfhs-cf-layer{transition-duration:0ms!important}
.sfhs-cf-root[data-reduced-motion="true"] .sfhs-cf-effect{animation:none!important;display:none!important}
@keyframes sfhs-cf-field-in{to{transform:translate(-50%,-50%) scale(1)}}
@keyframes sfhs-cf-ripple{0%{opacity:.28;transform:translate(-50%,-50%) scale(.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(9)}}
@media (prefers-reduced-motion:reduce){.sfhs-cf-layer{transition-duration:0ms!important}.sfhs-cf-effect{animation:none!important;display:none!important}}
`;

export function controlLengthCss(length: ControlLength): string {
  return length.unit === "px" ? `${length.value}px` : `${length.value * 100}%`;
}

function transformCss(transform: ControlTransform | undefined): string | undefined {
  if (transform === undefined) return undefined;
  const parts: string[] = [];
  if (transform.translateX !== undefined || transform.translateY !== undefined) {
    parts.push(`translate(${transform.translateX === undefined ? "0" : controlLengthCss(transform.translateX)}, ${transform.translateY === undefined ? "0" : controlLengthCss(transform.translateY)})`);
  }
  if (transform.scaleX !== undefined || transform.scaleY !== undefined) parts.push(`scale(${transform.scaleX ?? 1}, ${transform.scaleY ?? 1})`);
  if (transform.rotationDeg !== undefined) parts.push(`rotate(${transform.rotationDeg}deg)`);
  return parts.length === 0 ? undefined : parts.join(" ");
}

function shadowCss(shadow: ControlShadow): string {
  return `${shadow.inset ? "inset " : ""}${controlLengthCss(shadow.x)} ${controlLengthCss(shadow.y)} ${controlLengthCss(shadow.blur)} ${controlLengthCss(shadow.spread)} ${shadow.color}`;
}

function gradientCss(gradient: ControlGradient): string {
  const stops = gradient.stops.map((stop) => `${stop.color} ${stop.offset * 100}%`).join(", ");
  if (gradient.kind === "radial") return `radial-gradient(circle, ${stops})`;
  if (gradient.kind === "conic") return `conic-gradient(from ${gradient.angleDeg ?? 0}deg, ${stops})`;
  return `linear-gradient(${gradient.angleDeg ?? 180}deg, ${stops})`;
}

export function layerStyleToCss(layer: ControlLayerStyle): Readonly<Record<string, string>> {
  const style: Record<string, string> = {};
  if (layer.fill !== undefined) style.background = layer.fill;
  if (layer.gradient !== undefined) style.background = gradientCss(layer.gradient);
  if (layer.opacity !== undefined) style.opacity = String(layer.opacity);
  if (layer.shape === "circle") style.borderRadius = "50%";
  if (layer.shape === "capsule") style.borderRadius = "999px";
  if (layer.shape === "round-rect" && layer.border === undefined) style.borderRadius = "8px";
  if (layer.border !== undefined) {
    style.border = `${controlLengthCss(layer.border.width)} solid ${layer.border.color}`;
    style.borderRadius = controlLengthCss(layer.border.radius);
  }
  if (layer.shadows !== undefined) style.boxShadow = layer.shadows.map(shadowCss).join(", ");
  const transform = transformCss(layer.transform);
  if (transform !== undefined) style.transform = transform;
  if (layer.transition !== undefined) {
    style.transition = `transform ${layer.transition.durationMs}ms ${layer.transition.easing} ${layer.transition.delayMs ?? 0}ms, left ${layer.transition.durationMs}ms ${layer.transition.easing} ${layer.transition.delayMs ?? 0}ms, box-shadow ${layer.transition.durationMs}ms ${layer.transition.easing} ${layer.transition.delayMs ?? 0}ms, opacity ${layer.transition.durationMs}ms ${layer.transition.easing} ${layer.transition.delayMs ?? 0}ms, background ${layer.transition.durationMs}ms ${layer.transition.easing} ${layer.transition.delayMs ?? 0}ms`;
  }
  return Object.freeze(style);
}

export function applyStyle(element: HTMLElement, style: Readonly<Record<string, string>>): void {
  element.removeAttribute("style");
  for (const [property, value] of Object.entries(style)) element.style.setProperty(property.replace(/[A-Z]/gu, (match) => `-${match.toLowerCase()}`), value);
}

export function ensureDomControlStyles(documentValue: Document): void {
  if (documentValue.querySelector("style[data-sfhs-control-feedback-dom]") !== null) return;
  const style = documentValue.createElement("style");
  style.dataset.sfhsControlFeedbackDom = "v0";
  style.textContent = domControlStyleText;
  documentValue.head.append(style);
}
