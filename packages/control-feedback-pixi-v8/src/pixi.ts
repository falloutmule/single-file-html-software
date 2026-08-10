import type {
  ControlEasing,
  ControlLayerStyle,
  ControlLength,
  ControlShadow,
  ControlTransform
} from "@sfhs/control-feedback-contract";
import {
  createControlFeedbackRuntime,
  type ControlFeedbackCancelReason,
  type ControlFeedbackDispatchResult,
  type ControlFeedbackOrigin,
  type ControlFeedbackSignal,
  type ControlFeedbackSnapshot
} from "@sfhs/control-feedback-runtime";
import {
  Container,
  Graphics,
  Rectangle,
  Text
} from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";

import type {
  CreatePixiV8ControlOptions,
  PixiControlGeometry,
  PixiControlModelUpdate,
  PixiV8ControlController
} from "./types.ts";

interface RgbaColor {
  readonly color: number;
  readonly alpha: number;
}

interface NumericTransform {
  readonly x: number;
  readonly y: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly rotation: number;
}

interface LayerMotion {
  readonly display: Graphics;
  current: NumericTransform;
  from: NumericTransform;
  target: NumericTransform;
  startedAtMs: number;
  durationMs: number;
  easing: ControlEasing;
}

function rgba(value: string): RgbaColor {
  const body = value.slice(1);
  const alpha = body.length === 8 ? Number.parseInt(body.slice(6, 8), 16) / 255 : 1;
  return Object.freeze({ color: Number.parseInt(body.slice(0, 6), 16), alpha });
}

function lengthValue(length: ControlLength | undefined, axis: number): number {
  if (length === undefined) return 0;
  return length.unit === "px" ? length.value : length.value * axis;
}

function numericTransform(transform: ControlTransform | undefined, geometry: PixiControlGeometry): NumericTransform {
  return Object.freeze({
    x: lengthValue(transform?.translateX, geometry.width),
    y: lengthValue(transform?.translateY, geometry.height),
    scaleX: transform?.scaleX ?? 1,
    scaleY: transform?.scaleY ?? 1,
    rotation: ((transform?.rotationDeg ?? 0) * Math.PI) / 180
  });
}

function numericToggleThumbTransform(transform: ControlTransform | undefined, geometry: PixiControlGeometry, size: number): NumericTransform {
  const padding = (geometry.height - size) / 2;
  const travelX = Math.max(0, geometry.width - size - (padding * 2));
  const translateX = transform?.translateX;
  const translateY = transform?.translateY;
  return Object.freeze({
    x: padding + (translateX === undefined ? 0 : translateX.unit === "ratio" ? translateX.value * travelX : translateX.value),
    y: padding + (translateY === undefined ? 0 : translateY.unit === "ratio" ? translateY.value * Math.max(0, geometry.height - size) : translateY.value),
    scaleX: transform?.scaleX ?? 1,
    scaleY: transform?.scaleY ?? 1,
    rotation: ((transform?.rotationDeg ?? 0) * Math.PI) / 180
  });
}

function ease(value: number, easing: ControlEasing): number {
  if (easing === "linear") return value;
  if (easing === "ease-in") return value * value;
  if (easing === "ease-out") return 1 - ((1 - value) * (1 - value));
  return value < 0.5 ? 2 * value * value : 1 - ((-2 * value + 2) ** 2) / 2;
}

function mix(from: NumericTransform, target: NumericTransform, amount: number): NumericTransform {
  const interpolate = (left: number, right: number): number => left + ((right - left) * amount);
  return Object.freeze({
    x: interpolate(from.x, target.x),
    y: interpolate(from.y, target.y),
    scaleX: interpolate(from.scaleX, target.scaleX),
    scaleY: interpolate(from.scaleY, target.scaleY),
    rotation: interpolate(from.rotation, target.rotation)
  });
}

function applyTransform(display: Graphics, transform: NumericTransform): void {
  display.position.set(transform.x, transform.y);
  display.scale.set(transform.scaleX, transform.scaleY);
  display.rotation = transform.rotation;
}

function drawShape(graphic: Graphics, layer: ControlLayerStyle, geometry: PixiControlGeometry, offsetX = 0, offsetY = 0, spread = 0): Graphics {
  const width = geometry.width + (spread * 2);
  const height = geometry.height + (spread * 2);
  const x = offsetX - spread;
  const y = offsetY - spread;
  if (layer.shape === "circle") return graphic.circle(x + width / 2, y + height / 2, Math.min(width, height) / 2);
  if (layer.shape === "capsule") return graphic.roundRect(x, y, width, height, Math.min(width, height) / 2);
  if (layer.shape === "round-rect") {
    const radius = layer.border === undefined ? 8 : lengthValue(layer.border.radius, Math.min(width, height));
    return graphic.roundRect(x, y, width, height, radius);
  }
  return graphic.rect(x, y, width, height);
}

function drawShadow(graphic: Graphics, layer: ControlLayerStyle, shadow: ControlShadow, geometry: PixiControlGeometry, opacity: number): void {
  if (shadow.inset) return;
  const color = rgba(shadow.color);
  drawShape(
    graphic,
    layer,
    geometry,
    lengthValue(shadow.x, geometry.width),
    lengthValue(shadow.y, geometry.height),
    lengthValue(shadow.spread, Math.min(geometry.width, geometry.height))
  ).fill({ color: color.color, alpha: color.alpha * opacity });
}

function redrawLayer(graphic: Graphics, layer: ControlLayerStyle, geometry: PixiControlGeometry): void {
  graphic.clear();
  const opacity = layer.opacity ?? 1;
  for (const shadow of layer.shadows ?? []) drawShadow(graphic, layer, shadow, geometry, opacity);
  if (layer.fill !== undefined) {
    const fill = rgba(layer.fill);
    drawShape(graphic, layer, geometry).fill({ color: fill.color, alpha: fill.alpha * opacity });
  }
  if (layer.gradient !== undefined) {
    const representative = layer.gradient.stops[Math.floor(layer.gradient.stops.length / 2)];
    if (representative !== undefined) {
      const fill = rgba(representative.color);
      drawShape(graphic, layer, geometry).fill({ color: fill.color, alpha: fill.alpha * opacity });
    }
  }
  if (layer.border !== undefined) {
    const border = rgba(layer.border.color);
    drawShape(graphic, layer, geometry).stroke({
      color: border.color,
      alpha: border.alpha * opacity,
      width: lengthValue(layer.border.width, Math.min(geometry.width, geometry.height))
    });
  }
  graphic.alpha = opacity;
}

function inside(event: FederatedPointerEvent, root: Container, geometry: PixiControlGeometry): boolean {
  const local = root.toLocal(event.global);
  return local.x >= 0 && local.x <= geometry.width && local.y >= 0 && local.y <= geometry.height;
}

function origin(event: FederatedPointerEvent, root: Container, geometry: PixiControlGeometry): ControlFeedbackOrigin {
  const local = root.toLocal(event.global);
  return { x: local.x / geometry.width, y: local.y / geometry.height };
}

export function createPixiV8Control(options: CreatePixiV8ControlOptions): PixiV8ControlController {
  let geometry = { ...options.geometry };
  if (geometry.width <= 0 || geometry.height <= 0) throw new Error("Pixi control geometry must have positive dimensions.");
  const root = new Container({ label: `sfhs-control:${options.controlId}` });
  const layerRoot = root.addChild(new Container({ label: "layers" }));
  const effectRoot = root.addChild(new Container({ label: "effects" }));
  const content = root.addChild(new Text({ text: options.label, style: { fontFamily: "system-ui", fontSize: 14, fontWeight: "600", fill: 0xffffff, align: "center" } }));
  content.anchor.set(0.5);
  root.eventMode = "static";
  root.cursor = "pointer";
  options.parent.addChild(root);

  const runtime = createControlFeedbackRuntime({
    controlId: options.controlId,
    preset: options.preset,
    initialModel: { enabled: options.enabled ?? true, selected: options.selected ?? false, status: options.status ?? "idle" },
    reducedMotion: options.reducedMotion ?? false
  });
  const motions = new Map<string, LayerMotion>();
  const ripples = new Map<number, Graphics>();
  let fieldRipple: Graphics | undefined;
  let lastSnapshot = runtime.read();
  let lastTime = 0;
  let destroyed = false;
  const removers: Array<() => void> = [];
  const clock = options.clock ?? (() => performance.now());

  const now = (): number => {
    const measured = clock();
    if (!Number.isFinite(measured)) throw new Error("Pixi control clock must be finite.");
    lastTime = Math.max(lastTime, measured);
    return lastTime;
  };

  const applyGeometry = (): void => {
    root.position.set(geometry.x, geometry.y);
    root.hitArea = new Rectangle(0, 0, geometry.width, geometry.height);
    content.position.set(geometry.width / 2, geometry.height / 2);
  };

  const updateMotion = (motion: LayerMotion, atMs: number): void => {
    const progress = motion.durationMs <= 0 ? 1 : Math.min(1, Math.max(0, (atMs - motion.startedAtMs) / motion.durationMs));
    motion.current = mix(motion.from, motion.target, ease(progress, motion.easing));
    applyTransform(motion.display, motion.current);
  };

  const update = (atMs = now()): void => {
    if (destroyed) return;
    const effectiveAtMs = Math.max(lastTime, atMs);
    lastTime = effectiveAtMs;
    for (const motion of motions.values()) updateMotion(motion, effectiveAtMs);
    for (const ripple of lastSnapshot.activationRipples) {
      const graphic = ripples.get(ripple.id);
      if (graphic === undefined) continue;
      const progress = Math.min(1, Math.max(0, (effectiveAtMs - ripple.startedAtMs) / (ripple.expiresAtMs - ripple.startedAtMs)));
      graphic.scale.set(0.2 + (progress * 8.8));
      graphic.alpha = (1 - progress) * 0.28;
    }
  };

  const present = (snapshot: ControlFeedbackSnapshot, atMs: number): void => {
    update(atMs);
    atMs = lastTime;
    lastSnapshot = snapshot;
    root.eventMode = snapshot.model.enabled ? "static" : "none";
    root.cursor = snapshot.model.enabled ? "pointer" : "default";
    root.alpha = snapshot.model.enabled ? 1 : 0.55;
    const activeKeys = new Set<string>();
    const roleCounts = new Map<string, number>();
    for (const layer of snapshot.presentation.layers) {
      const occurrence = roleCounts.get(layer.role) ?? 0;
      roleCounts.set(layer.role, occurrence + 1);
      const key = `${layer.role}:${occurrence}`;
      activeKeys.add(key);
      let motion = motions.get(key);
      if (motion === undefined) {
        const display = layerRoot.addChild(new Graphics({ label: key }));
        const initial = numericTransform(layer.transform, geometry);
        motion = { display, current: initial, from: initial, target: initial, startedAtMs: atMs, durationMs: 0, easing: "linear" };
        motions.set(key, motion);
      }
      redrawLayer(motion.display, layer, geometry);
      motion.from = motion.current;
      motion.target = numericTransform(layer.transform, geometry);
      motion.startedAtMs = atMs;
      motion.durationMs = snapshot.reducedMotion ? 0 : (layer.transition?.durationMs ?? 0);
      motion.easing = layer.transition?.easing ?? "linear";
      updateMotion(motion, atMs);
      layerRoot.addChild(motion.display);
    }
    if (snapshot.presentation.toggleVisual !== undefined) {
      const track = snapshot.presentation.toggleVisual.track;
      const thumb = snapshot.presentation.toggleVisual.thumb;
      const trackKey = "toggle-track:0";
      activeKeys.add(trackKey);
      let trackMotion = motions.get(trackKey);
      if (trackMotion === undefined) {
        const display = layerRoot.addChild(new Graphics({ label: trackKey }));
        const initial = numericTransform(track.transform, geometry);
        trackMotion = { display, current: initial, from: initial, target: initial, startedAtMs: atMs, durationMs: 0, easing: "linear" };
        motions.set(trackKey, trackMotion);
      }
      redrawLayer(trackMotion.display, track, geometry);
      trackMotion.from = trackMotion.current;
      trackMotion.target = numericTransform(track.transform, geometry);
      trackMotion.startedAtMs = atMs;
      trackMotion.durationMs = snapshot.reducedMotion ? 0 : (track.transition?.durationMs ?? 0);
      trackMotion.easing = track.transition?.easing ?? "linear";
      updateMotion(trackMotion, atMs);
      layerRoot.addChild(trackMotion.display);

      const thumbKey = "toggle-thumb:0";
      const thumbSize = Math.min(geometry.width, geometry.height) * 0.72;
      const thumbGeometry = { ...geometry, x: 0, y: 0, width: thumbSize, height: thumbSize };
      const thumbTransform = snapshot.model.selected
        ? { ...thumb.transform, ...snapshot.presentation.toggleVisual.selectedThumbTransform }
        : thumb.transform;
      activeKeys.add(thumbKey);
      let thumbMotion = motions.get(thumbKey);
      if (thumbMotion === undefined) {
        const display = layerRoot.addChild(new Graphics({ label: thumbKey }));
        const initial = numericToggleThumbTransform(thumbTransform, geometry, thumbSize);
        thumbMotion = { display, current: initial, from: initial, target: initial, startedAtMs: atMs, durationMs: 0, easing: "linear" };
        motions.set(thumbKey, thumbMotion);
      }
      redrawLayer(thumbMotion.display, thumb, thumbGeometry);
      thumbMotion.from = thumbMotion.current;
      thumbMotion.target = numericToggleThumbTransform(thumbTransform, geometry, thumbSize);
      thumbMotion.startedAtMs = atMs;
      thumbMotion.durationMs = snapshot.reducedMotion ? 0 : (thumb.transition?.durationMs ?? 0);
      thumbMotion.easing = thumb.transition?.easing ?? "linear";
      updateMotion(thumbMotion, atMs);
      layerRoot.addChild(thumbMotion.display);
    }
    for (const [key, motion] of motions) {
      if (activeKeys.has(key)) continue;
      motion.display.destroy();
      motions.delete(key);
    }

    const fieldEffect = snapshot.presentation.effects.find((effect) => effect.kind === "field-ripple");
    if (snapshot.fieldRipple !== undefined && fieldEffect?.kind === "field-ripple") {
      fieldRipple ??= effectRoot.addChild(new Graphics({ label: "field-ripple" }));
      fieldRipple.clear().circle(0, 0, Math.max(geometry.width, geometry.height) * fieldEffect.diameterFactor / 2).fill({ color: 0xffffff, alpha: 0.2 });
      fieldRipple.position.set(snapshot.fieldRipple.origin.x * geometry.width, snapshot.fieldRipple.origin.y * geometry.height);
    } else if (fieldRipple !== undefined) {
      fieldRipple.destroy();
      fieldRipple = undefined;
    }

    const activeRippleIds = new Set(snapshot.activationRipples.map((ripple) => ripple.id));
    for (const [id, graphic] of ripples) {
      if (activeRippleIds.has(id)) continue;
      graphic.destroy();
      ripples.delete(id);
    }
    for (const ripple of snapshot.activationRipples) {
      let graphic = ripples.get(ripple.id);
      if (graphic === undefined) {
        graphic = effectRoot.addChild(new Graphics({ label: `activation-ripple:${ripple.id}` }));
        graphic.circle(0, 0, 9).fill({ color: 0xffffff, alpha: 0.28 });
        ripples.set(ripple.id, graphic);
      }
      graphic.position.set(ripple.origin.x * geometry.width, ripple.origin.y * geometry.height);
    }
    content.text = snapshot.model.status === "loading" ? "…" : snapshot.model.status === "success" ? "✓" : snapshot.model.status === "error" ? "!" : options.label;
    content.alpha = snapshot.model.enabled ? 1 : 0.65;
    update(atMs);
  };

  const handle = (result: ControlFeedbackDispatchResult): ControlFeedbackDispatchResult => {
    present(result.snapshot, result.events.at(-1)?.atMs ?? lastTime);
    for (const event of result.events) {
      if (event.kind === "activate" && event.proposal !== undefined) options.onActivate?.(event.proposal);
      if (event.kind === "cue" && event.cueRole !== undefined) options.onCue?.({ role: event.cueRole, ...(event.cueId === undefined ? {} : { cueId: event.cueId }) });
    }
    options.onDispatch?.(result);
    return result;
  };

  const dispatchNormalized = (signal: ControlFeedbackSignal): ControlFeedbackDispatchResult => handle(runtime.dispatch(signal));
  const sourceId = (event: FederatedPointerEvent): string => `pointer:${event.pointerId}`;
  const cancel = (reason: ControlFeedbackCancelReason): void => {
    if (runtime.read().owner !== undefined) dispatchNormalized({ kind: "contact-cancel", reason, atMs: now() });
  };
  const on = (type: string, listener: (event: FederatedPointerEvent) => void): void => {
    root.on(type, listener);
    removers.push(() => root.off(type, listener));
  };

  on("pointerdown", (event) => {
    if (event.button !== 0 || !runtime.read().model.enabled) return;
    dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId: sourceId(event), origin: origin(event, root, geometry), atMs: now() });
  });
  on("globalpointermove", (event) => {
    dispatchNormalized({ kind: "contact-update", sourceId: sourceId(event), inside: inside(event, root, geometry), origin: origin(event, root, geometry), atMs: now() });
  });
  on("pointerup", (event) => {
    dispatchNormalized({ kind: "contact-end", sourceId: sourceId(event), inside: inside(event, root, geometry), origin: origin(event, root, geometry), atMs: now() });
  });
  on("pointerupoutside", (event) => {
    dispatchNormalized({ kind: "contact-end", sourceId: sourceId(event), inside: false, origin: origin(event, root, geometry), atMs: now() });
  });
  on("pointercancel", (event) => {
    dispatchNormalized({ kind: "contact-cancel", sourceId: sourceId(event), reason: "pointer-cancel", atMs: now() });
  });
  on("pointerover", () => { dispatchNormalized({ kind: "hover-set", hovered: true, atMs: now() }); });
  on("pointerout", () => { dispatchNormalized({ kind: "hover-set", hovered: false, atMs: now() }); });

  const keyDown = (code: "Space" | "Enter", repeat = false): ControlFeedbackDispatchResult | undefined => {
    if (repeat || !runtime.read().model.enabled) return undefined;
    return dispatchNormalized({ kind: "contact-begin", source: "keyboard", sourceId: `key:${code}`, atMs: now() });
  };
  const keyUp = (code: "Space" | "Enter"): ControlFeedbackDispatchResult | undefined => {
    if (runtime.read().owner?.sourceId !== `key:${code}`) return undefined;
    return dispatchNormalized({ kind: "contact-end", sourceId: `key:${code}`, inside: true, atMs: now() });
  };

  if (options.keyboardTarget !== undefined) {
    const keydown = (event: KeyboardEvent): void => {
      if (event.code !== "Space" && event.code !== "Enter") return;
      event.preventDefault();
      keyDown(event.code, event.repeat);
    };
    const keyup = (event: KeyboardEvent): void => {
      if (event.code !== "Space" && event.code !== "Enter") return;
      event.preventDefault();
      keyUp(event.code);
    };
    const focus = (): void => { dispatchNormalized({ kind: "focus-set", focused: true, focusVisible: options.keyboardTarget?.matches(":focus-visible") ?? true, atMs: now() }); };
    const blur = (): void => { cancel("focus-lost"); dispatchNormalized({ kind: "focus-set", focused: false, focusVisible: false, atMs: now() }); };
    options.keyboardTarget.addEventListener("keydown", keydown);
    options.keyboardTarget.addEventListener("keyup", keyup);
    options.keyboardTarget.addEventListener("focus", focus);
    options.keyboardTarget.addEventListener("blur", blur);
    removers.push(() => options.keyboardTarget?.removeEventListener("keydown", keydown));
    removers.push(() => options.keyboardTarget?.removeEventListener("keyup", keyup));
    removers.push(() => options.keyboardTarget?.removeEventListener("focus", focus));
    removers.push(() => options.keyboardTarget?.removeEventListener("blur", blur));
  }
  if (options.lifecycleWindow !== undefined) {
    const blur = (): void => cancel("window-blur");
    const visibility = (): void => { if (options.lifecycleWindow?.document.visibilityState === "hidden") cancel("document-hidden"); };
    options.lifecycleWindow.addEventListener("blur", blur);
    options.lifecycleWindow.document.addEventListener("visibilitychange", visibility);
    removers.push(() => options.lifecycleWindow?.removeEventListener("blur", blur));
    removers.push(() => options.lifecycleWindow?.document.removeEventListener("visibilitychange", visibility));
  }

  applyGeometry();
  present(lastSnapshot, 0);

  return Object.freeze({
    root,
    read: runtime.read,
    dispatchNormalized,
    keyDown,
    keyUp,
    setModel(updateValue: PixiControlModelUpdate) {
      return dispatchNormalized({ kind: "model-set", ...updateValue, atMs: now() }).snapshot;
    },
    setReducedMotion(reducedMotion: boolean) {
      return dispatchNormalized({ kind: "reduced-motion-set", reducedMotion, atMs: now() }).snapshot;
    },
    setGeometry(nextGeometry: PixiControlGeometry): void {
      if (nextGeometry.width <= 0 || nextGeometry.height <= 0) throw new Error("Pixi control geometry must have positive dimensions.");
      geometry = { ...nextGeometry };
      applyGeometry();
      present(runtime.read(), now());
    },
    update,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      const result = runtime.dispose(now());
      options.onDispatch?.(result);
      for (const remove of removers.splice(0)) remove();
      root.destroy({ children: true });
    }
  });
}
