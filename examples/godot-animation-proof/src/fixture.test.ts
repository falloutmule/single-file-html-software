import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { decodeRgbaPng } from "@sfhs/godot-animation/png";

describe("Godot animation proof fixture", () => {
  it("tracks two valid RGBA sheets with matching frame silhouettes", async () => {
    const mint = decodeRgbaPng(await readFile(new URL("./assets/mascot-mint.png", import.meta.url)));
    const violet = decodeRgbaPng(await readFile(new URL("./assets/mascot-violet.png", import.meta.url)));
    const validation = JSON.parse(await readFile(new URL("./assets/mascot-export-validation.json", import.meta.url), "utf8")) as { valid?: boolean; outputs?: unknown[] };

    expect({ width: mint.width, height: mint.height }).toEqual({ width: 256, height: 128 });
    expect({ width: violet.width, height: violet.height }).toEqual({ width: 256, height: 128 });
    for (let index = 3; index < mint.pixels.length; index += 4) {
      expect(mint.pixels[index]! > 0).toBe(violet.pixels[index]! > 0);
    }
    expect(validation).toMatchObject({ valid: true, outputs: [{ id: "mint" }, { id: "violet" }] });
  });
});
