import { p0ControlPresets } from "@sfhs/control-feedback-contract";
import type { ControlFeedbackSignal } from "@sfhs/control-feedback-runtime";
import { Container, Rectangle } from "pixi.js";
import { describe, expect, it } from "vitest";

import { createPixiV8Control, packageIdentity, pixiV8ControlApproximations } from "./index.ts";

describe("PixiJS v8 control feedback adapter", () => {
  it("mounts deterministic Graphics/Text state and hit geometry", () => {
    let time = 0;
    const parent = new Container();
    const control = createPixiV8Control({
      parent,
      controlId: "pixi-control",
      preset: p0ControlPresets[0],
      label: "Press",
      geometry: { x: 10, y: 20, width: 120, height: 52 },
      clock: () => time
    });
    expect(packageIdentity).toBe("@sfhs/control-feedback-pixi-v8");
    expect(parent.children).toContain(control.root);
    expect(control.root.hitArea).toEqual(new Rectangle(0, 0, 120, 52));
    time = 1;
    control.dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId: "1", atMs: time });
    expect(control.read().interaction).toBe("pressed-inside");
    control.update(36);
    expect(control.root.children[0]?.children.length).toBeGreaterThan(0);
    control.destroy();
  });

  it("retains external state authority and bounded ripple instances", () => {
    let time = 0;
    const activations: unknown[] = [];
    const control = createPixiV8Control({
      parent: new Container(), controlId: "ripple", preset: p0ControlPresets[7], label: "Ripple",
      geometry: { x: 0, y: 0, width: 100, height: 48 }, clock: () => time,
      onActivate: (proposal) => activations.push(proposal)
    });
    for (let index = 0; index < 6; index += 1) {
      time += 1;
      control.dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId: String(index), atMs: time });
      time += 1;
      control.dispatchNormalized({ kind: "contact-end", sourceId: String(index), inside: true, atMs: time });
    }
    expect(activations).toHaveLength(6);
    expect(control.read().activationRipples.map((ripple) => ripple.id)).toEqual([3, 4, 5, 6]);
  });

  it("accepts the same normalized trace deterministically", () => {
    const trace: readonly ControlFeedbackSignal[] = [
      { kind: "contact-begin", source: "pointer", sourceId: "7", origin: { x: 0.25, y: 0.75 }, atMs: 1 },
      { kind: "contact-update", sourceId: "7", inside: false, origin: { x: 1, y: 0.75 }, atMs: 2 },
      { kind: "contact-update", sourceId: "7", inside: true, origin: { x: 0.8, y: 0.5 }, atMs: 3 },
      { kind: "contact-end", sourceId: "7", inside: true, origin: { x: 0.8, y: 0.5 }, atMs: 4 }
    ];
    const outputs = ["left", "right"].map((id) => {
      const control = createPixiV8Control({ parent: new Container(), controlId: id, preset: p0ControlPresets[0], label: id, geometry: { x: 0, y: 0, width: 100, height: 50 } });
      return trace.map((signal) => control.dispatchNormalized(signal).events.map((event) => ({ kind: event.kind, interaction: event.interaction, proposal: event.proposal, cueRole: event.cueRole })));
    });
    expect(outputs[0]).toEqual(outputs[1]);
  });

  it("publishes explicit renderer approximations", () => {
    expect(pixiV8ControlApproximations.map((entry) => entry.id)).toEqual(["layer-shadow", "content-slot", "focus-accessibility"]);
    expect(JSON.stringify(pixiV8ControlApproximations)).not.toContain("silent");
  });
});
