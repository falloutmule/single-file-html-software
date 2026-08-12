import { describe, expect, it } from "vitest";

import { decodeRgbaPng, encodeRgbaPng } from "./png.ts";

describe("SFHS RGBA PNG codec", () => {
  it("round-trips deterministic non-interlaced RGBA bytes", () => {
    const pixels = Uint8Array.from([
      255, 0, 0, 255, 0, 255, 0, 128,
      0, 0, 255, 64, 255, 255, 255, 0
    ]);
    const first = encodeRgbaPng({ width: 2, height: 2, pixels });
    const second = encodeRgbaPng({ width: 2, height: 2, pixels });
    expect(first).toEqual(second);
    expect(decodeRgbaPng(first)).toEqual({ width: 2, height: 2, pixels });
  });

  it("rejects invalid structure and non-matching pixel counts", () => {
    expect(() => decodeRgbaPng(new Uint8Array(32))).toThrow(/signature/u);
    expect(() => encodeRgbaPng({ width: 2, height: 2, pixels: new Uint8Array(3) })).toThrow(/byte count/u);
    const valid = encodeRgbaPng({ width: 1, height: 1, pixels: Uint8Array.from([1, 2, 3, 4]) });
    valid[valid.length - 5] = valid[valid.length - 5]! ^ 1;
    expect(() => decodeRgbaPng(valid)).toThrow(/CRC/u);
  });
});
