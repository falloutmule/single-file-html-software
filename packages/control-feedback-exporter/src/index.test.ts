import { describe, expect, it } from "vitest";
import { findControlFeedbackPreset } from "@sfhs/control-feedback-presets";
import { createControlExportBundle, createStandaloneControlDemo } from "./index.ts";

describe("control feedback exporter", () => {
  it("creates deterministic canonical and offline exports", () => {
    const preset = findControlFeedbackPreset("uv-plastic-inset-press");
    expect(preset).toBeDefined();
    const first = createControlExportBundle(preset!);
    const second = createControlExportBundle(preset!);
    expect(first).toEqual(second);
    expect(first.demoHtml).not.toMatch(/(?:src|href)=["']https?:/u);
    expect(first.demoHtml).toContain('id="sfhs-exported-control"');
    expect(first.demoHtml).toContain("From Uiverse.io");
    expect(first.demoHtml).not.toContain("an-status-cycle");
    expect(first.demoHtml).not.toContain("mu-glare-sweep");
    expect(first.demoHtml).not.toContain("Animata MIT License");
    expect(first.demoHtml).not.toContain("Magic UI MIT License");
    expect(JSON.parse(first.packJson).presets).toHaveLength(1);
    expect(first.noticesText).toContain("Uiverse");
  });

  it("rejects invalid preset values", () => {
    expect(() => createStandaloneControlDemo({ schema: "bad" } as never)).toThrow(/invalid preset/iu);
  });
});
