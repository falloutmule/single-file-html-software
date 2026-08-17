import { describe, expect, it, vi } from "vitest";

import { createWebHapticTransport, webHapticPatterns } from "./index.ts";

describe("web haptic transport", () => {
  it("maps symbolic cues to small best-effort vibration patterns", () => {
    const vibrate = vi.fn(() => true);
    const transport = createWebHapticTransport({ navigator: { vibrate } });
    expect(transport.supported).toBe(true);
    expect(transport.playCue({ role: "press" })).toEqual({ attempted: true, supported: true, accepted: true, pattern: "subtle-tick" });
    expect(vibrate).toHaveBeenCalledWith(webHapticPatterns["subtle-tick"]);
    expect(transport.playCue({ role: "success" }).pattern).toBe("success");
    expect(transport.playCue({ role: "error", cueId: "firm-press" }).pattern).toBe("firm-press");
  });

  it("degrades silently when unsupported, disabled, disposed, or rejected", () => {
    expect(createWebHapticTransport({ navigator: {} as { vibrate(pattern: number | number[]): boolean } }).playCue({ role: "activate" })).toMatchObject({ attempted: false, supported: false, accepted: false });
    const throwing = createWebHapticTransport({ navigator: { vibrate: () => { throw new Error("denied"); } } });
    expect(throwing.playCue({ role: "activate" })).toMatchObject({ attempted: true, supported: true, accepted: false });
    const vibrate = vi.fn(() => true);
    const transport = createWebHapticTransport({ navigator: { vibrate } });
    transport.setEnabled(false);
    expect(transport.playCue({ role: "activate" }).attempted).toBe(false);
    transport.setEnabled(true);
    transport.dispose();
    expect(vibrate).toHaveBeenCalledWith(0);
    expect(transport.playCue({ role: "activate" }).attempted).toBe(false);
  });
});
