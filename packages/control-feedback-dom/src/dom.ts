import type { ControlLayerStyle } from "@sfhs/control-feedback-contract";
import type {
  ControlFeedbackCancelReason,
  ControlFeedbackDispatchResult,
  ControlFeedbackOrigin,
  ControlFeedbackSignal,
  ControlFeedbackSnapshot
} from "@sfhs/control-feedback-runtime";
import { createControlFeedbackRuntime as createTrustedControlFeedbackRuntime } from "@sfhs/control-feedback-runtime/trusted";

import { applyStyle, ensureDomControlStyles, layerStyleToCss } from "./styles.ts";
import {
  semanticElementForPreset,
  type DomControlController,
  type DomControlModelUpdate,
  type MountDomControlOptions
} from "./types.ts";

function originForEvent(event: PointerEvent, target: HTMLElement): ControlFeedbackOrigin {
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return { x: 0.5, y: 0.5 };
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height
  };
}

function eventInside(event: PointerEvent, target: HTMLElement): boolean {
  const rect = target.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

function statusText(status: ControlFeedbackSnapshot["model"]["status"]): string {
  if (status === "loading") return "Loading";
  if (status === "success") return "Success";
  if (status === "error") return "Error";
  return "";
}

function createInteractive(options: MountDomControlOptions): {
  root: HTMLElement;
  interactive: HTMLButtonElement | HTMLInputElement;
  visual: HTMLSpanElement;
  layers: HTMLSpanElement;
  effects: HTMLSpanElement;
  content: HTMLSpanElement;
  status: HTMLSpanElement;
} {
  const documentValue = options.container.ownerDocument;
  const accessibleLabel = options.label ?? options.preset.content?.label ?? options.preset.title;
  const semantic = semanticElementForPreset(options.preset);
  const root = documentValue.createElement(semantic === "button" ? "span" : "label");
  root.className = "sfhs-cf-root";
  root.dataset.sfhsControlId = options.controlId;
  root.dataset.sfhsSemantic = semantic;

  const interactive = documentValue.createElement(semantic === "button" ? "button" : "input");
  interactive.className = "sfhs-cf-interactive";
  interactive.setAttribute("aria-label", accessibleLabel);
  if (interactive instanceof HTMLButtonElement) interactive.type = "button";
  else if (semantic === "checkbox-switch") {
    interactive.type = "checkbox";
    interactive.setAttribute("role", "switch");
  } else if (semantic === "checkbox") {
    interactive.type = "checkbox";
  } else {
    interactive.type = "radio";
    if (options.preset.semantic.kind !== "choice") throw new Error("Choice semantic mismatch.");
    interactive.name = options.preset.semantic.groupId;
    interactive.value = options.preset.semantic.value;
  }

  const visual = documentValue.createElement("span");
  visual.className = "sfhs-cf-visual";
  const inset = options.visualInsetPx ?? 0;
  visual.style.inset = `${inset}px`;
  const layers = documentValue.createElement("span");
  layers.className = "sfhs-cf-layers";
  const effects = documentValue.createElement("span");
  effects.className = "sfhs-cf-effects";
  visual.append(layers, effects);
  const content = documentValue.createElement("span");
  content.className = "sfhs-cf-content";
  const contentValue = options.preset.content;
  const visualLabel = options.visualLabel ?? contentValue?.label ?? accessibleLabel;
  content.textContent = contentValue?.icon === undefined
    ? visualLabel
    : contentValue.iconSlot === "trailing"
      ? `${visualLabel} ${contentValue.icon}`
      : `${contentValue.icon} ${visualLabel}`;
  if (contentValue !== undefined) {
    content.style.fontFamily = contentValue.fontFamily;
    content.style.fontSize = `${contentValue.fontSizePx}px`;
    content.style.fontWeight = String(contentValue.fontWeight);
    content.style.letterSpacing = `${contentValue.letterSpacingPx}px`;
    content.style.color = contentValue.textColor;
  }
  const status = documentValue.createElement("span");
  status.className = "sfhs-cf-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  root.append(interactive, visual, content, status);
  return { root, interactive, visual, layers, effects, content, status };
}

function setLayerStyles(element: HTMLElement, layer: ControlLayerStyle): void {
  applyStyle(element, layerStyleToCss(layer));
  element.className = `sfhs-cf-layer sfhs-cf-layer-${layer.role}`;
  element.dataset.role = layer.role;
  if (layer.contentSlot !== undefined) element.dataset.contentSlot = layer.contentSlot;
}

export function mountDomControlUnchecked(options: MountDomControlOptions): DomControlController {
  if (options.container.ownerDocument.defaultView === null) throw new Error("DOM control requires a live Window.");
  ensureDomControlStyles(options.container.ownerDocument);
  const view = options.container.ownerDocument.defaultView;
  const elements = createInteractive(options);
  const geometry = options.preset.geometry;
  if (geometry !== undefined) {
    const hitWidth = Math.max(geometry.widthPx, geometry.minimumHitTargetPx ?? 0);
    const hitHeight = Math.max(geometry.heightPx, geometry.minimumHitTargetPx ?? 0);
    elements.root.style.width = `${hitWidth}px`;
    elements.root.style.height = `${hitHeight}px`;
    for (const element of [elements.visual, elements.content]) {
      element.style.inset = "auto";
      element.style.left = "50%";
      element.style.top = "50%";
      element.style.width = `${geometry.widthPx}px`;
      element.style.height = `${geometry.heightPx}px`;
      element.style.transform = "translate(-50%,-50%)";
    }
  }
  const runtime = createTrustedControlFeedbackRuntime({
    controlId: options.controlId,
    preset: options.preset,
    initialModel: {
      enabled: options.enabled ?? true,
      selected: options.selected ?? false,
      status: options.status ?? "idle"
    },
    reducedMotion: options.reducedMotion ?? view.matchMedia("(prefers-reduced-motion: reduce)").matches
  });
  let destroyed = false;
  let suppressClick = false;
  let lastTime = 0;
  const removers: Array<() => void> = [];
  const clock = options.clock ?? (() => view.performance.now());
  const layerElements = new Map<string, HTMLSpanElement>();
  const effectElements = new Map<string, HTMLSpanElement>();

  const now = (): number => {
    const measured = clock();
    if (!Number.isFinite(measured)) throw new Error("DOM control clock must be finite.");
    lastTime = Math.max(lastTime, measured);
    return lastTime;
  };

  const listen = (
    target: HTMLElement | Window | Document,
    type: string,
    listener: (event: Event) => void,
    optionsValue?: AddEventListenerOptions
  ): void => {
    target.addEventListener(type, listener, optionsValue);
    removers.push(() => target.removeEventListener(type, listener, optionsValue));
  };

  const render = (snapshot: ControlFeedbackSnapshot): void => {
    elements.root.dataset.interaction = snapshot.interaction;
    elements.root.dataset.disabled = String(!snapshot.model.enabled);
    elements.root.dataset.selected = String(snapshot.model.selected);
    elements.root.dataset.status = snapshot.model.status;
    elements.root.dataset.focusVisible = String(snapshot.model.focused && snapshot.model.focusVisible);
    elements.root.dataset.reducedMotion = String(snapshot.reducedMotion);
    elements.interactive.disabled = !snapshot.model.enabled;
    elements.interactive.setAttribute("aria-busy", String(snapshot.model.status === "loading"));
    if (elements.interactive instanceof HTMLInputElement) elements.interactive.checked = snapshot.model.selected;
    elements.status.textContent = statusText(snapshot.model.status);

    const activeLayerKeys = new Set<string>();
    const roleCounts = new Map<string, number>();
    for (const layer of snapshot.presentation.layers) {
      const occurrence = roleCounts.get(layer.role) ?? 0;
      roleCounts.set(layer.role, occurrence + 1);
      const key = `${layer.role}:${occurrence}`;
      activeLayerKeys.add(key);
      let layerElement = layerElements.get(key);
      if (layerElement === undefined) {
        layerElement = options.container.ownerDocument.createElement("span");
        layerElements.set(key, layerElement);
      }
      setLayerStyles(layerElement, layer);
      elements.layers.append(layerElement);
    }
    if (snapshot.presentation.toggleVisual !== undefined) {
      const trackKey = "toggle-track:0";
      activeLayerKeys.add(trackKey);
      let trackElement = layerElements.get(trackKey);
      if (trackElement === undefined) {
        trackElement = options.container.ownerDocument.createElement("span");
        layerElements.set(trackKey, trackElement);
      }
      setLayerStyles(trackElement, snapshot.presentation.toggleVisual.track);
      elements.layers.append(trackElement);

      const thumbKey = "toggle-thumb:0";
      activeLayerKeys.add(thumbKey);
      let thumbElement = layerElements.get(thumbKey);
      if (thumbElement === undefined) {
        thumbElement = options.container.ownerDocument.createElement("span");
        layerElements.set(thumbKey, thumbElement);
      }
      setLayerStyles(thumbElement, snapshot.presentation.toggleVisual.thumb);
      const thumbTransform = snapshot.model.selected
        ? snapshot.presentation.toggleVisual.selectedThumbTransform
        : snapshot.presentation.toggleVisual.thumb.transform;
      const translateX = thumbTransform?.translateX;
      const leftOffset = translateX === undefined
        ? "0%"
        : translateX.unit === "ratio"
          ? `${translateX.value * 57}%`
          : `${translateX.value}px`;
      thumbElement.style.width = "35%";
      thumbElement.style.height = "70%";
      thumbElement.style.inset = `15% auto auto calc(8% + ${leftOffset})`;
      elements.layers.append(thumbElement);
    }
    for (const [key, element] of layerElements) {
      if (activeLayerKeys.has(key)) continue;
      element.remove();
      layerElements.delete(key);
    }

    const activeEffectKeys = new Set<string>();
    if (snapshot.fieldRipple !== undefined) {
      const key = "field";
      activeEffectKeys.add(key);
      let field = effectElements.get(key);
      if (field === undefined) {
        field = options.container.ownerDocument.createElement("span");
        effectElements.set(key, field);
      }
      field.className = "sfhs-cf-effect sfhs-cf-field";
      field.style.left = `${snapshot.fieldRipple.origin.x * 100}%`;
      field.style.top = `${snapshot.fieldRipple.origin.y * 100}%`;
      elements.effects.append(field);
    }
    for (const ripple of snapshot.activationRipples) {
      const key = `activation:${ripple.id}`;
      activeEffectKeys.add(key);
      const effect = snapshot.presentation.effects.find((candidate) => candidate.kind === "activation-ripple");
      let rippleElement = effectElements.get(key);
      if (rippleElement === undefined) {
        rippleElement = options.container.ownerDocument.createElement("span");
        effectElements.set(key, rippleElement);
      }
      rippleElement.className = "sfhs-cf-effect sfhs-cf-activation";
      rippleElement.dataset.effectId = String(ripple.id);
      rippleElement.style.left = `${ripple.origin.x * 100}%`;
      rippleElement.style.top = `${ripple.origin.y * 100}%`;
      rippleElement.style.setProperty("--sfhs-cf-ripple-ms", `${effect?.kind === "activation-ripple" ? effect.durationMs : 0}ms`);
      rippleElement.style.animationDelay = `${-Math.max(0, lastTime - ripple.startedAtMs)}ms`;
      elements.effects.append(rippleElement);
    }
    for (const [key, element] of effectElements) {
      if (activeEffectKeys.has(key)) continue;
      element.remove();
      effectElements.delete(key);
    }
  };

  const handleResult = (result: ControlFeedbackDispatchResult): void => {
    render(result.snapshot);
    for (const event of result.events) {
      if (event.kind === "activate" && event.proposal !== undefined) options.onActivate?.(event.proposal);
      if (event.kind === "cue" && event.cueRole !== undefined) options.onCue?.({ role: event.cueRole, ...(event.cueId === undefined ? {} : { cueId: event.cueId }) });
    }
    options.onDispatch?.(result);
  };

  const dispatchResult = (signal: Parameters<typeof runtime.dispatch>[0]): ControlFeedbackDispatchResult => {
    const result = runtime.dispatch(signal);
    handleResult(result);
    return result;
  };
  const dispatch = (signal: Parameters<typeof runtime.dispatch>[0]): void => { dispatchResult(signal); };
  const pointerSourceId = (event: PointerEvent): string => `pointer:${event.pointerId}`;
  const keyboardSourceId = (event: KeyboardEvent): string => `key:${event.code}`;
  const suppressImminentClick = (): void => {
    suppressClick = true;
    view.setTimeout(() => { suppressClick = false; }, 0);
  };
  const cancel = (reason: ControlFeedbackCancelReason): void => {
    if (runtime.read().owner !== undefined) dispatch({ kind: "contact-cancel", reason, atMs: now() });
  };

  listen(elements.root, "contextmenu", (event) => event.preventDefault());
  listen(elements.interactive, "pointerdown", (rawEvent) => {
    const event = rawEvent as PointerEvent;
    if (!runtime.read().model.enabled || event.button !== 0) return;
    event.preventDefault();
    elements.interactive.focus({ preventScroll: true });
    try { elements.interactive.setPointerCapture(event.pointerId); } catch { /* capture is best-effort; global cancellation still applies */ }
    dispatch({ kind: "contact-begin", source: "pointer", sourceId: pointerSourceId(event), origin: originForEvent(event, elements.interactive), atMs: now() });
  });
  listen(elements.interactive, "pointermove", (rawEvent) => {
    const event = rawEvent as PointerEvent;
    dispatch({ kind: "contact-update", sourceId: pointerSourceId(event), inside: eventInside(event, elements.interactive), origin: originForEvent(event, elements.interactive), atMs: now() });
  });
  listen(elements.interactive, "pointerup", (rawEvent) => {
    const event = rawEvent as PointerEvent;
    if (runtime.read().owner?.sourceId !== pointerSourceId(event)) return;
    event.preventDefault();
    suppressImminentClick();
    dispatch({ kind: "contact-end", sourceId: pointerSourceId(event), inside: eventInside(event, elements.interactive), origin: originForEvent(event, elements.interactive), atMs: now() });
    try { elements.interactive.releasePointerCapture(event.pointerId); } catch { /* already released */ }
  });
  listen(elements.interactive, "pointercancel", (rawEvent) => {
    const event = rawEvent as PointerEvent;
    dispatch({ kind: "contact-cancel", sourceId: pointerSourceId(event), reason: "pointer-cancel", atMs: now() });
  });
  listen(elements.interactive, "lostpointercapture", (rawEvent) => {
    const event = rawEvent as PointerEvent;
    if (runtime.read().owner?.sourceId === pointerSourceId(event)) dispatch({ kind: "contact-cancel", sourceId: pointerSourceId(event), reason: "capture-lost", atMs: now() });
  });
  listen(elements.interactive, "pointerenter", () => dispatch({ kind: "hover-set", hovered: true, atMs: now() }));
  listen(elements.interactive, "pointerleave", () => dispatch({ kind: "hover-set", hovered: false, atMs: now() }));
  listen(elements.interactive, "focus", () => dispatch({ kind: "focus-set", focused: true, focusVisible: elements.interactive.matches(":focus-visible"), atMs: now() }));
  listen(elements.interactive, "blur", () => {
    cancel("focus-lost");
    dispatch({ kind: "focus-set", focused: false, focusVisible: false, atMs: now() });
  });
  listen(elements.interactive, "keydown", (rawEvent) => {
    const event = rawEvent as KeyboardEvent;
    if ((event.code !== "Space" && event.code !== "Enter") || event.repeat || !runtime.read().model.enabled) return;
    event.preventDefault();
    dispatch({ kind: "contact-begin", source: "keyboard", sourceId: keyboardSourceId(event), atMs: now() });
  });
  listen(elements.interactive, "keyup", (rawEvent) => {
    const event = rawEvent as KeyboardEvent;
    if (event.code !== "Space" && event.code !== "Enter") return;
    if (runtime.read().owner?.sourceId !== keyboardSourceId(event)) return;
    event.preventDefault();
    suppressImminentClick();
    dispatch({ kind: "contact-end", sourceId: keyboardSourceId(event), inside: true, atMs: now() });
  });
  listen(elements.interactive, "click", (event) => {
    event.preventDefault();
    if (suppressClick) {
      suppressClick = false;
      render(runtime.read());
      return;
    }
    if (!runtime.read().model.enabled) return;
    const atMs = now();
    dispatch({ kind: "contact-begin", source: "keyboard", sourceId: "assistive:click", atMs });
    dispatch({ kind: "contact-end", sourceId: "assistive:click", inside: true, atMs });
  });
  listen(view, "blur", () => cancel("window-blur"));
  listen(options.container.ownerDocument, "visibilitychange", () => {
    if (options.container.ownerDocument.visibilityState === "hidden") cancel("document-hidden");
  });

  options.container.append(elements.root);
  render(runtime.read());

  return Object.freeze({
    root: elements.root,
    interactive: elements.interactive,
    read: runtime.read,
    dispatchNormalized(signal: ControlFeedbackSignal) {
      if (destroyed) throw new Error("DOM control is destroyed.");
      return dispatchResult(signal);
    },
    setModel(update: DomControlModelUpdate): ControlFeedbackSnapshot {
      if (destroyed) throw new Error("DOM control is destroyed.");
      const result = runtime.dispatch({ kind: "model-set", ...update, atMs: now() });
      handleResult(result);
      return result.snapshot;
    },
    setReducedMotion(reducedMotion: boolean): ControlFeedbackSnapshot {
      if (destroyed) throw new Error("DOM control is destroyed.");
      const result = runtime.dispatch({ kind: "reduced-motion-set", reducedMotion, atMs: now() });
      handleResult(result);
      return result.snapshot;
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      const result = runtime.dispose(now());
      options.onDispatch?.(result);
      for (const remove of removers.splice(0)) remove();
      elements.root.remove();
    }
  });
}
