import { p0ControlPresets, type ControlPreset } from "@sfhs/control-feedback-contract";
import type { ControlFeedbackSignal } from "@sfhs/control-feedback-runtime";
import { Container, Rectangle } from "pixi.js";
import { describe, expect, it } from "vitest";

import { createPixiV8Control, packageIdentity, pixiV8ControlApproximations } from "./index.ts";

describe("PixiJS v8 control feedback adapter", () => {
  it("keeps repeated-role layer occurrences distinct across state changes", () => {
    const repeated: ControlPreset = {
      schema: "sfhs.control-preset@0", id: "pixi-occurrence-test", title: "Pixi Occurrence Test", semantic: { kind: "momentary" },
      visuals: {
        base: { layers: [{ role: "content", shape: "rect", transform: { translateX: { value: 0, unit: "px" } } }, { role: "content", shape: "rect", transform: { translateX: { value: 10, unit: "px" } } }] },
        hover: { layers: [{ role: "content", shape: "rect", transform: { translateX: { value: 20, unit: "px" } } }, { role: "content", shape: "rect", transform: { translateX: { value: 30, unit: "px" } } }] }
      },
      provenance: { origin: "sfhs-original" }
    };
    const control = createPixiV8Control({ parent: new Container(), controlId: "occurrence", preset: repeated, label: "Test", geometry: { x: 0, y: 0, width: 100, height: 40 }, clock: () => 1 });
    control.dispatchNormalized({ kind: "hover-set", hovered: true, atMs: 1 });
    const layerRoot = control.root.children[0] as Container;
    expect(layerRoot.children).toHaveLength(2);
    expect(layerRoot.children.map((child) => child.position.x)).toEqual([20, 30]);
  });

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

  it("uses portable preset geometry and content when adapter overrides are absent", () => {
    const preset: ControlPreset = { ...p0ControlPresets[0], id: "portable-pixi-control", provenance: { origin: "sfhs-original" }, geometry: { widthPx: 24, heightPx: 24, minimumHitTargetPx: 44 }, content: { label: "Launch", icon: "◆", iconSlot: "leading", fontFamily: "system-ui", fontSizePx: 17, fontWeight: 700, letterSpacingPx: 1, textColor: "#FFFFFFFF" } };
    const control = createPixiV8Control({ parent: new Container(), controlId: "portable", preset });
    expect(control.root.hitArea).toEqual(new Rectangle(-10, -10, 44, 44));
    expect((control.root.children[2] as { text?: string }).text).toBe("◆ Launch");
  });

  it("renders bounded content slots with equivalent pivot geometry and no legacy duplicate", () => {
    const preset: ControlPreset = {
      schema: "sfhs.control-preset@0", id: "pixi-bounded-slot", title: "Bounded Slot", semantic: { kind: "momentary" },
      content: { label: "Launch", icon: "→", iconSlot: "leading", fontFamily: "system-ui", fontSizePx: 14, fontWeight: 600, letterSpacingPx: 0, textColor: "#FFFFFFFF" },
      visuals: { base: { layers: [{ role: "surface", shape: "capsule", fill: "#111827FF" }, { role: "content", shape: "circle", fill: "#FFFFFFFF", contentSlot: "icon-leading", bounds: { x: { value: 0.2, unit: "ratio" }, y: { value: 0.5, unit: "ratio" }, width: { value: 36, unit: "px" }, height: { value: 36, unit: "px" }, anchorX: 0.5, anchorY: 0.5 } }] } },
      provenance: { origin: "sfhs-original" }
    };
    const control = createPixiV8Control({ parent: new Container(), controlId: "bounded", preset, geometry: { x: 0, y: 0, width: 200, height: 60 }, clock: () => 0 });
    const layerRoot = control.root.children[0] as Container;
    const slotLayer = layerRoot.children[1] as Container;
    expect({ x: slotLayer.position.x, y: slotLayer.position.y, pivotX: slotLayer.pivot.x, pivotY: slotLayer.pivot.y }).toEqual({ x: 40, y: 30, pivotX: 18, pivotY: 18 });
    expect((slotLayer.children[0] as { text?: string }).text).toBe("→");
    expect((control.root.children[2] as { visible?: boolean }).visible).toBe(false);
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
    expect(pixiV8ControlApproximations.map((entry) => entry.id)).toEqual(["gradient-fill", "layer-shadow", "content-slot", "focus-accessibility"]);
    expect(JSON.stringify(pixiV8ControlApproximations)).not.toContain("silent");
  });
});
