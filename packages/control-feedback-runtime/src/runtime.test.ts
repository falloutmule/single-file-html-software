import { p0ControlPresets, type ControlPreset } from "@sfhs/control-feedback-contract";
import { describe, expect, it } from "vitest";

import { createControlFeedbackRuntime } from "./runtime.ts";
import type { ControlFeedbackEvent, ControlFeedbackRuntime } from "./types.ts";

function preset(id: string): ControlPreset {
  const match = p0ControlPresets.find((candidate) => candidate.id === id);
  if (match === undefined) throw new Error(`Missing fixture ${id}`);
  return match;
}

function runtime(id = "uv-plastic-inset-press"): ControlFeedbackRuntime {
  return createControlFeedbackRuntime({ controlId: "test-control", preset: preset(id) });
}

function kinds(events: readonly ControlFeedbackEvent[]): string[] {
  return events.map((event) => event.kind);
}

function activation(events: readonly ControlFeedbackEvent[]): ControlFeedbackEvent | undefined {
  return events.find((event) => event.kind === "activate");
}

describe("control feedback runtime", () => {
  it("activates once for press and release inside and rebounds to rest", () => {
    const control = runtime();
    const down = control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "7", origin: { x: 0.2, y: 0.8 }, atMs: 1 });
    expect(down.snapshot.interaction).toBe("pressed-inside");
    expect(down.snapshot.owner).toEqual({ source: "pointer", sourceId: "7" });
    expect(kinds(down.events)).toEqual(["contact", "cue", "state-changed"]);

    const up = control.dispatch({ kind: "contact-end", sourceId: "7", inside: true, atMs: 2 });
    expect(up.snapshot.interaction).toBe("rest");
    expect(up.snapshot.owner).toBeUndefined();
    expect(up.events.filter((event) => event.kind === "activate")).toHaveLength(1);
    expect(activation(up.events)?.proposal).toEqual({ kind: "momentary" });
  });

  it("cancels release outside without activation", () => {
    const control = runtime();
    control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "1", atMs: 1 });
    control.dispatch({ kind: "contact-update", sourceId: "1", inside: false, atMs: 2 });
    const up = control.dispatch({ kind: "contact-end", sourceId: "1", inside: false, atMs: 3 });
    expect(up.events.some((event) => event.kind === "activate")).toBe(false);
    expect(up.events.find((event) => event.kind === "cancel")?.reason).toBe("release-outside");
  });

  it("allows drag out, re-entry, then one release-inside activation", () => {
    const control = runtime();
    control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "1", atMs: 1 });
    expect(control.dispatch({ kind: "contact-update", sourceId: "1", inside: false, atMs: 2 }).snapshot.interaction).toBe("pressed-outside");
    expect(control.dispatch({ kind: "contact-update", sourceId: "1", inside: true, atMs: 3 }).snapshot.interaction).toBe("pressed-inside");
    expect(control.dispatch({ kind: "contact-end", sourceId: "1", inside: true, atMs: 4 }).events.filter((event) => event.kind === "activate")).toHaveLength(1);
  });

  it.each([
    "pointer-cancel",
    "capture-lost",
    "focus-lost",
    "window-blur",
    "document-hidden",
    "adapter-reset"
  ] as const)("safely cancels active ownership on %s", (reason) => {
    const control = runtime();
    control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "1", atMs: 1 });
    const cancelled = control.dispatch({ kind: "contact-cancel", reason, atMs: 2 });
    expect(cancelled.snapshot.owner).toBeUndefined();
    expect(cancelled.snapshot.interaction).toBe("rest");
    expect(cancelled.events.find((event) => event.kind === "cancel")?.reason).toBe(reason);
    expect(cancelled.events.some((event) => event.kind === "activate")).toBe(false);
  });

  it("ignores contact while disabled and cancels before applying disable while pressed", () => {
    const disabled = createControlFeedbackRuntime({ controlId: "disabled", preset: preset("uv-plastic-inset-press"), initialModel: { enabled: false } });
    expect(disabled.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "1", atMs: 1 }).events).toEqual([]);

    const control = runtime();
    control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "1", atMs: 1 });
    const result = control.dispatch({ kind: "model-set", enabled: false, atMs: 2 });
    expect(result.snapshot.model.enabled).toBe(false);
    expect(result.snapshot.owner).toBeUndefined();
    expect(result.events.find((event) => event.kind === "cancel")?.reason).toBe("disabled");
    expect(result.events.some((event) => event.kind === "activate")).toBe(false);
  });

  it("retargets rapid taps without a queued-animation backlog", () => {
    const control = runtime();
    for (let index = 0; index < 20; index += 1) {
      const atMs = index * 2 + 1;
      control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: String(index), atMs });
      control.dispatch({ kind: "contact-end", sourceId: String(index), inside: true, atMs: atMs + 1 });
    }
    const snapshot = control.read();
    expect(snapshot.presentation.transition.mode).toBe("retarget-current");
    expect(snapshot.presentation.transition.revision).toBe(40);
    expect(snapshot.interaction).toBe("rest");
  });

  it("protects against duplicate ups", () => {
    const control = runtime();
    control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "1", atMs: 1 });
    expect(activation(control.dispatch({ kind: "contact-end", sourceId: "1", inside: true, atMs: 2 }).events)).toBeDefined();
    expect(control.dispatch({ kind: "contact-end", sourceId: "1", inside: true, atMs: 3 }).events).toEqual([]);
  });

  it("keeps deterministic ownership when another pointer attempts contact", () => {
    const control = runtime();
    control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "first", atMs: 1 });
    expect(control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "second", atMs: 2 }).events).toEqual([]);
    expect(control.dispatch({ kind: "contact-end", sourceId: "second", inside: true, atMs: 3 }).events).toEqual([]);
    expect(control.read().owner?.sourceId).toBe("first");
    expect(activation(control.dispatch({ kind: "contact-end", sourceId: "first", inside: true, atMs: 4 }).events)).toBeDefined();
  });

  it("supports keyboard activation at a deterministic center origin", () => {
    const control = runtime();
    control.dispatch({ kind: "contact-begin", source: "keyboard", sourceId: "Space", origin: { x: 0, y: 0 }, atMs: 1 });
    const result = control.dispatch({ kind: "contact-end", sourceId: "Space", inside: true, atMs: 2 });
    expect(activation(result.events)?.origin).toEqual({ x: 0.5, y: 0.5 });
  });

  it("uses the reduced-motion state and suppresses ripple instances", () => {
    const control = createControlFeedbackRuntime({ controlId: "reduced", preset: preset("mu-multi-activation-ripple"), reducedMotion: true });
    control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "1", atMs: 1 });
    const result = control.dispatch({ kind: "contact-end", sourceId: "1", inside: true, atMs: 2 });
    expect(result.snapshot.reducedMotion).toBe(true);
    expect(result.snapshot.activationRipples).toEqual([]);
    expect(result.events.some((event) => event.kind === "effect-spawn")).toBe(false);
  });

  it("proposes toggle and choice changes while retaining external authority", () => {
    const toggle = runtime("uv-basic-toggle");
    toggle.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "1", atMs: 1 });
    expect(activation(toggle.dispatch({ kind: "contact-end", sourceId: "1", inside: true, atMs: 2 }).events)?.proposal).toEqual({ kind: "toggle", proposedSelected: true });
    expect(toggle.read().model.selected).toBe(false);
    toggle.dispatch({ kind: "model-set", selected: true, atMs: 3 });
    expect(toggle.read().model.selected).toBe(true);

    const choice = runtime("uv-skeuo-icon-choice");
    choice.dispatch({ kind: "contact-begin", source: "keyboard", sourceId: "Enter", atMs: 1 });
    expect(activation(choice.dispatch({ kind: "contact-end", sourceId: "Enter", inside: true, atMs: 2 }).events)?.proposal).toEqual({ kind: "choice", groupId: "tool-mode", value: "primary" });
    expect(choice.read().model.selected).toBe(false);
  });

  it("presents externally driven loading, success, and error without owning status", () => {
    const control = runtime("an-status-cycle");
    expect(control.dispatch({ kind: "model-set", status: "loading", atMs: 1 }).snapshot.model.status).toBe("loading");
    const success = control.dispatch({ kind: "model-set", status: "success", atMs: 2 });
    expect(success.events.find((event) => event.cueRole === "success")?.cueId).toBe("success");
    const error = control.dispatch({ kind: "model-set", status: "error", atMs: 3 });
    expect(error.events.find((event) => event.cueRole === "error")?.cueId).toBe("error");
  });

  it("bounds activation ripples, assigns monotonic IDs, and expires them on tick", () => {
    const control = runtime("mu-multi-activation-ripple");
    for (let index = 0; index < 6; index += 1) {
      const atMs = index * 2 + 1;
      control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: String(index), atMs });
      control.dispatch({ kind: "contact-end", sourceId: String(index), inside: true, atMs: atMs + 1 });
    }
    expect(control.read().activationRipples.map((ripple) => ripple.id)).toEqual([3, 4, 5, 6]);
    expect(control.dispatch({ kind: "tick", atMs: 500 }).snapshot.activationRipples).toEqual([]);
  });

  it("tracks a field ripple from pointer origin only during active contact", () => {
    const control = runtime("an-pointer-field-ripple");
    expect(control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "1", origin: { x: 0.1, y: 0.9 }, atMs: 1 }).snapshot.fieldRipple?.origin).toEqual({ x: 0.1, y: 0.9 });
    expect(control.dispatch({ kind: "contact-end", sourceId: "1", inside: true, atMs: 2 }).snapshot.fieldRipple).toBeUndefined();
  });

  it("emits monotonically ordered events and fails closed on decreasing time", () => {
    const control = runtime();
    const down = control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "1", atMs: 10 });
    const up = control.dispatch({ kind: "contact-end", sourceId: "1", inside: true, atMs: 11 });
    const sequences = [...down.events, ...up.events].map((event) => event.sequence);
    expect(sequences).toEqual([...sequences].sort((left, right) => left - right));
    expect(new Set(sequences).size).toBe(sequences.length);
    expect(() => control.dispatch({ kind: "tick", atMs: 10 })).toThrow(/moved backwards/u);
  });

  it("notifies subscribers for changes and safely cancels on disposal", () => {
    const control = runtime();
    const observed: number[] = [];
    control.subscribe((value) => observed.push(value.snapshot.sequence));
    control.dispatch({ kind: "contact-begin", source: "pointer", sourceId: "1", atMs: 1 });
    const disposed = control.dispose(2);
    expect(disposed.events.find((event) => event.kind === "cancel")?.reason).toBe("disposed");
    expect(observed).toEqual([1]);
    expect(() => control.dispatch({ kind: "tick", atMs: 3 })).toThrow(/disposed/u);
  });
});
