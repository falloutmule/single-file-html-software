import {
  validateControlPreset,
  type ActivationRippleEffect,
  type ControlCueMap,
  type ControlEffect,
  type ControlInteractionState,
  type ControlLayerStyle,
  type ControlPreset,
  type ControlVisualState
} from "@sfhs/control-feedback-contract";
import {
  controlFeedbackEventSchema,
  controlFeedbackStateSchema,
  type ControlFeedbackActivationProposal,
  type ControlFeedbackCancelReason,
  type ControlFeedbackCueRole,
  type ControlFeedbackDispatchResult,
  type ControlFeedbackEvent,
  type ControlFeedbackListener,
  type ControlFeedbackModel,
  type ControlFeedbackOrigin,
  type ControlFeedbackOwner,
  type ControlFeedbackPresentation,
  type ControlFeedbackRippleInstance,
  type ControlFeedbackRuntime,
  type ControlFeedbackSignal,
  type ControlFeedbackSnapshot,
  type ControlFeedbackSource,
  type CreateControlFeedbackRuntimeOptions
} from "./types.ts";

const centerOrigin = Object.freeze({ x: 0.5, y: 0.5 });
const cueKeys = {
  press: "press",
  activate: "activate",
  cancel: "cancel",
  "select-on": "selectOn",
  "select-off": "selectOff",
  success: "success",
  error: "error"
} as const satisfies Record<ControlFeedbackCueRole, keyof ControlCueMap>;

interface MutableRuntimeState {
  model: ControlFeedbackModel;
  interaction: ControlInteractionState;
  owner: ControlFeedbackOwner | undefined;
  origin: ControlFeedbackOrigin | undefined;
  reducedMotion: boolean;
  stateSequence: number;
  eventSequence: number;
  transitionRevision: number;
  transitionStartedAtMs: number;
  lastAtMs: number;
  nextRippleId: number;
  activationRipples: ControlFeedbackRippleInstance[];
  disposed: boolean;
}

function freezeOrigin(origin: ControlFeedbackOrigin | undefined, source?: ControlFeedbackSource): ControlFeedbackOrigin {
  if (source === "keyboard" || origin === undefined) return centerOrigin;
  if (!Number.isFinite(origin.x) || !Number.isFinite(origin.y)) throw new Error("Control feedback origin must contain finite coordinates.");
  return Object.freeze({ x: Math.min(1, Math.max(0, origin.x)), y: Math.min(1, Math.max(0, origin.y)) });
}

function validateTime(atMs: number, lastAtMs: number): void {
  if (!Number.isFinite(atMs) || atMs < 0) throw new Error("Control feedback signal time must be a finite non-negative number.");
  if (atMs < lastAtMs) throw new Error(`Control feedback signal time moved backwards (${atMs} < ${lastAtMs}).`);
}

function mergeLayers(base: readonly ControlLayerStyle[], overlay: readonly ControlLayerStyle[] | undefined): readonly ControlLayerStyle[] {
  if (overlay === undefined) return base;
  const byRole = new Map(overlay.map((layer) => [layer.role, layer]));
  const merged = base.map((layer) => byRole.get(layer.role) ?? layer);
  for (const layer of overlay) {
    if (!base.some((candidate) => candidate.role === layer.role)) merged.push(layer);
  }
  return Object.freeze(merged);
}

function applyVisualState(
  current: { layers: readonly ControlLayerStyle[]; effects: readonly ControlEffect[] },
  visual: ControlVisualState | undefined
): { layers: readonly ControlLayerStyle[]; effects: readonly ControlEffect[] } {
  if (visual === undefined) return current;
  return {
    layers: mergeLayers(current.layers, visual.layers),
    effects: visual.effects === undefined ? current.effects : Object.freeze([...visual.effects])
  };
}

function resolvePresentation(
  preset: ControlPreset,
  state: MutableRuntimeState
): ControlFeedbackPresentation {
  let resolved = applyVisualState({ layers: Object.freeze([]), effects: Object.freeze([]) }, preset.visuals.base);
  if (state.model.selected) resolved = applyVisualState(resolved, preset.visuals.selected);
  resolved = applyVisualState(resolved, preset.visuals.status?.[state.model.status]);
  if (state.model.hovered) resolved = applyVisualState(resolved, preset.visuals.hover);
  if (state.model.focused && state.model.focusVisible) resolved = applyVisualState(resolved, preset.visuals.focus);
  if (state.interaction === "pressed-inside") resolved = applyVisualState(resolved, preset.visuals.pressedInside);
  if (state.interaction === "pressed-outside") resolved = applyVisualState(resolved, preset.visuals.pressedOutside);
  if (!state.model.enabled) resolved = applyVisualState(resolved, preset.visuals.disabled);
  if (state.reducedMotion) resolved = applyVisualState(resolved, preset.visuals.reducedMotion);

  return Object.freeze({
    layers: resolved.layers,
    effects: resolved.effects,
    transition: Object.freeze({
      revision: state.transitionRevision,
      fromRevision: Math.max(0, state.transitionRevision - 1),
      startedAtMs: state.transitionStartedAtMs,
      mode: "retarget-current" as const,
      interaction: state.interaction
    }),
    ...(preset.toggleVisual === undefined ? {} : { toggleVisual: preset.toggleVisual })
  });
}

function activationProposal(preset: ControlPreset, selected: boolean): ControlFeedbackActivationProposal {
  if (preset.semantic.kind === "toggle") return Object.freeze({ kind: "toggle", proposedSelected: !selected });
  if (preset.semantic.kind === "choice") {
    return Object.freeze({ kind: "choice", groupId: preset.semantic.groupId, value: preset.semantic.value });
  }
  return Object.freeze({ kind: "momentary" });
}

function activationRippleEffect(effects: readonly ControlEffect[]): ActivationRippleEffect | undefined {
  return effects.find((effect): effect is ActivationRippleEffect => effect.kind === "activation-ripple");
}

export function createControlFeedbackRuntime(options: CreateControlFeedbackRuntimeOptions): ControlFeedbackRuntime {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(options.controlId)) throw new Error("Control feedback controlId is invalid.");
  const validation = validateControlPreset(options.preset);
  if (!validation.valid) throw new Error(`Invalid control preset: ${validation.findings.map((finding) => `${finding.path}: ${finding.message}`).join("; ")}`);

  const preset = options.preset;
  const initial = options.initialModel ?? {};
  const state: MutableRuntimeState = {
    model: Object.freeze({
      enabled: initial.enabled ?? true,
      selected: initial.selected ?? false,
      status: initial.status ?? "idle",
      focused: initial.focused ?? false,
      focusVisible: initial.focusVisible ?? false,
      hovered: initial.hovered ?? false
    }),
    interaction: "rest",
    owner: undefined,
    origin: undefined,
    reducedMotion: options.reducedMotion ?? false,
    stateSequence: 0,
    eventSequence: 0,
    transitionRevision: 0,
    transitionStartedAtMs: 0,
    lastAtMs: 0,
    nextRippleId: 1,
    activationRipples: [],
    disposed: false
  };
  const listeners = new Set<ControlFeedbackListener>();

  const emit = (
    events: ControlFeedbackEvent[],
    atMs: number,
    kind: ControlFeedbackEvent["kind"],
    fields: Omit<ControlFeedbackEvent, "schema" | "sequence" | "atMs" | "controlId" | "kind"> = {}
  ): void => {
    state.eventSequence += 1;
    events.push(Object.freeze({
      schema: controlFeedbackEventSchema,
      sequence: state.eventSequence,
      atMs,
      controlId: options.controlId,
      kind,
      ...fields
    }));
  };

  const retarget = (events: ControlFeedbackEvent[], atMs: number): void => {
    state.stateSequence += 1;
    state.transitionRevision += 1;
    state.transitionStartedAtMs = atMs;
    emit(events, atMs, "state-changed", { interaction: state.interaction });
  };

  const cue = (events: ControlFeedbackEvent[], atMs: number, role: ControlFeedbackCueRole, owner?: ControlFeedbackOwner): void => {
    const cueId = preset.cues?.[cueKeys[role]];
    emit(events, atMs, "cue", {
      cueRole: role,
      ...(cueId === undefined ? {} : { cueId }),
      ...(owner === undefined ? {} : { source: owner.source, sourceId: owner.sourceId })
    });
  };

  const pruneRipples = (atMs: number): boolean => {
    const retained = state.activationRipples.filter((ripple) => ripple.expiresAtMs > atMs);
    const changed = retained.length !== state.activationRipples.length;
    state.activationRipples = retained;
    return changed;
  };

  const snapshot = (): ControlFeedbackSnapshot => {
    const presentation = resolvePresentation(preset, state);
    const hasFieldRipple = state.owner !== undefined
      && !state.reducedMotion
      && presentation.effects.some((effect) => effect.kind === "field-ripple");
    return Object.freeze({
      schema: controlFeedbackStateSchema,
      controlId: options.controlId,
      sequence: state.stateSequence,
      interaction: state.interaction,
      model: state.model,
      ...(state.owner === undefined ? {} : { owner: state.owner }),
      ...(state.origin === undefined ? {} : { origin: state.origin }),
      reducedMotion: state.reducedMotion,
      presentation,
      ...(hasFieldRipple ? { fieldRipple: Object.freeze({ kind: "field-ripple" as const, origin: state.origin ?? centerOrigin }) } : {}),
      activationRipples: Object.freeze([...state.activationRipples])
    });
  };

  const result = (events: ControlFeedbackEvent[]): ControlFeedbackDispatchResult => Object.freeze({
    snapshot: snapshot(),
    events: Object.freeze(events)
  });

  const finishCancel = (
    events: ControlFeedbackEvent[],
    atMs: number,
    reason: ControlFeedbackCancelReason,
    owner: ControlFeedbackOwner,
    origin: ControlFeedbackOrigin | undefined
  ): void => {
    state.owner = undefined;
    state.origin = undefined;
    state.interaction = "rest";
    emit(events, atMs, "cancel", {
      source: owner.source,
      sourceId: owner.sourceId,
      reason,
      ...(origin === undefined ? {} : { origin })
    });
    cue(events, atMs, "cancel", owner);
    retarget(events, atMs);
  };

  const dispatch = (signal: ControlFeedbackSignal): ControlFeedbackDispatchResult => {
    if (state.disposed) throw new Error("Control feedback runtime is disposed.");
    validateTime(signal.atMs, state.lastAtMs);
    state.lastAtMs = signal.atMs;
    const events: ControlFeedbackEvent[] = [];
    const pruned = pruneRipples(signal.atMs);

    if (signal.kind === "contact-begin") {
      if (state.model.enabled && state.owner === undefined) {
        const owner = Object.freeze({ source: signal.source, sourceId: signal.sourceId });
        const origin = freezeOrigin(signal.origin, signal.source);
        state.owner = owner;
        state.origin = origin;
        state.interaction = "pressed-inside";
        emit(events, signal.atMs, "contact", { source: owner.source, sourceId: owner.sourceId, origin, interaction: state.interaction });
        cue(events, signal.atMs, "press", owner);
        retarget(events, signal.atMs);
      }
    } else if (signal.kind === "contact-update") {
      if (state.owner?.sourceId === signal.sourceId) {
        const nextOrigin = freezeOrigin(signal.origin ?? state.origin, state.owner.source);
        const nextInteraction = signal.inside ? "pressed-inside" : "pressed-outside";
        if (nextInteraction !== state.interaction || nextOrigin.x !== state.origin?.x || nextOrigin.y !== state.origin?.y) {
          state.origin = nextOrigin;
          state.interaction = nextInteraction;
          emit(events, signal.atMs, "contact", { source: state.owner.source, sourceId: state.owner.sourceId, origin: nextOrigin, interaction: nextInteraction });
          retarget(events, signal.atMs);
        }
      }
    } else if (signal.kind === "contact-end") {
      if (state.owner?.sourceId === signal.sourceId) {
        const owner = state.owner;
        const origin = freezeOrigin(signal.origin ?? state.origin, owner.source);
        const inside = signal.inside && state.interaction === "pressed-inside";
        state.owner = undefined;
        state.origin = undefined;
        state.interaction = "rest";
        emit(events, signal.atMs, "contact", { source: owner.source, sourceId: owner.sourceId, origin, interaction: "rest" });
        if (inside) {
          const proposal = activationProposal(preset, state.model.selected);
          emit(events, signal.atMs, "activate", { source: owner.source, sourceId: owner.sourceId, origin, proposal });
          cue(events, signal.atMs, "activate", owner);
          if (proposal.kind === "toggle") cue(events, signal.atMs, proposal.proposedSelected ? "select-on" : "select-off", owner);
          if (proposal.kind === "choice") cue(events, signal.atMs, "select-on", owner);
          const effect = !state.reducedMotion ? activationRippleEffect(resolvePresentation(preset, state).effects) : undefined;
          if (effect !== undefined) {
            const ripple = Object.freeze({
              kind: "activation-ripple" as const,
              id: state.nextRippleId,
              origin,
              startedAtMs: signal.atMs,
              expiresAtMs: signal.atMs + effect.durationMs
            });
            state.nextRippleId += 1;
            state.activationRipples.push(ripple);
            while (state.activationRipples.length > effect.concurrentCap) state.activationRipples.shift();
            emit(events, signal.atMs, "effect-spawn", { source: owner.source, sourceId: owner.sourceId, origin, effectId: ripple.id });
          }
          retarget(events, signal.atMs);
        } else {
          emit(events, signal.atMs, "cancel", { source: owner.source, sourceId: owner.sourceId, origin, reason: "release-outside" });
          cue(events, signal.atMs, "cancel", owner);
          retarget(events, signal.atMs);
        }
      }
    } else if (signal.kind === "contact-cancel") {
      if (state.owner !== undefined && (signal.sourceId === undefined || signal.sourceId === state.owner.sourceId)) {
        finishCancel(events, signal.atMs, signal.reason, state.owner, state.origin);
      }
    } else if (signal.kind === "hover-set") {
      if (state.model.hovered !== signal.hovered) {
        state.model = Object.freeze({ ...state.model, hovered: signal.hovered });
        retarget(events, signal.atMs);
      }
    } else if (signal.kind === "focus-set") {
      if (state.model.focused !== signal.focused || state.model.focusVisible !== signal.focusVisible) {
        state.model = Object.freeze({ ...state.model, focused: signal.focused, focusVisible: signal.focusVisible });
        retarget(events, signal.atMs);
      }
    } else if (signal.kind === "model-set") {
      if (signal.enabled === false && state.model.enabled && state.owner !== undefined) {
        finishCancel(events, signal.atMs, "disabled", state.owner, state.origin);
      }
      const nextModel = Object.freeze({
        ...state.model,
        ...(signal.enabled === undefined ? {} : { enabled: signal.enabled }),
        ...(signal.selected === undefined ? {} : { selected: signal.selected }),
        ...(signal.status === undefined ? {} : { status: signal.status })
      });
      const changed = JSON.stringify(nextModel) !== JSON.stringify(state.model);
      const statusChanged = nextModel.status !== state.model.status;
      state.model = nextModel;
      if (statusChanged && (nextModel.status === "success" || nextModel.status === "error")) cue(events, signal.atMs, nextModel.status);
      if (changed) retarget(events, signal.atMs);
    } else if (signal.kind === "reduced-motion-set") {
      if (state.reducedMotion !== signal.reducedMotion) {
        state.reducedMotion = signal.reducedMotion;
        if (signal.reducedMotion) state.activationRipples = [];
        retarget(events, signal.atMs);
      }
    }

    if (pruned && events.every((event) => event.kind !== "state-changed")) retarget(events, signal.atMs);
    const dispatchResult = result(events);
    if (events.length > 0) for (const listener of listeners) listener(dispatchResult);
    return dispatchResult;
  };

  return Object.freeze({
    read: snapshot,
    dispatch,
    subscribe(listener: ControlFeedbackListener): () => void {
      if (state.disposed) throw new Error("Control feedback runtime is disposed.");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose(atMs: number): ControlFeedbackDispatchResult {
      if (state.disposed) return result([]);
      validateTime(atMs, state.lastAtMs);
      state.lastAtMs = atMs;
      const events: ControlFeedbackEvent[] = [];
      if (state.owner !== undefined) finishCancel(events, atMs, "disposed", state.owner, state.origin);
      state.disposed = true;
      listeners.clear();
      return result(events);
    }
  });
}
