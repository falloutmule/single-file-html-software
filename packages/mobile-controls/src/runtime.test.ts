import { describe, expect, it } from "vitest";

import { createMobileControls } from "./index.ts";
import type { MobileControlDeclaration } from "./types.ts";

const rect = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };
const controls: readonly MobileControlDeclaration[] = Object.freeze([
  { id: "move", type: "stick2d", label: "Move", layout: { portrait: rect, landscape: rect } },
  { id: "look", type: "relative1d", axis: "x", label: "Look", layout: { portrait: rect, landscape: rect } },
  { id: "hold", type: "hold", label: "Hold", layout: { portrait: rect, landscape: rect } },
  { id: "pulse", type: "pulse", label: "Pulse", layout: { portrait: rect, landscape: rect } },
  { id: "toggle", type: "toggle", label: "Toggle", layout: { portrait: rect, landscape: rect } }
]);

describe("@sfhs/mobile-controls controller", () => {
  it("exposes one neutral output surface for all v1 primitives before mount", () => {
    const controller = createMobileControls({ controls });
    expect(controller.read()).toMatchObject({
      schema: "sfhs.mobile-controls-state@1",
      lifecycle: "created",
      route: "none",
      persistence: "disabled",
      controls: {
        move: { type: "stick2d", x: 0, y: 0, magnitude: 0, active: false },
        look: { type: "relative1d", rawNormalizedDelta: 0, delta: 0, active: false },
        hold: { type: "hold", pressed: false },
        pulse: { type: "pulse", fired: false, count: 0 },
        toggle: { type: "toggle", state: false }
      }
    });
  });

  it("updates valid settings and rejects invalid imported profiles atomically", () => {
    const controller = createMobileControls({ controls });
    expect(controller.updateConfig({ opacity: 0.75, stickDeadZone: 0.12, relativeSensitivity: 1.5 }).ok).toBe(true);
    const before = controller.exportProfile();
    expect(controller.importProfile({ ...before, schema: "sfhs.mobile-controls-profile@2" }).ok).toBe(false);
    expect(controller.exportProfile()).toEqual(before);
  });

  it("rejects invalid creation settings as developer errors", () => {
    expect(() => createMobileControls({ controls, settings: { relativeSensitivity: 12 } })).toThrow("relativeSensitivity");
  });
});
