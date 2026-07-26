import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { validateProjectManifest } from "../../../packages/contracts/src/index.ts";
import { runCli } from "../../../packages/cli/src/index.ts";
import {
  advancePixiMinimalFixtureSimulation,
  createInitialPixiMinimalFixtureState,
  presentPixiMinimalFixture
} from "./fixture.ts";

const fixtureRoot = fileURLToPath(new URL("../", import.meta.url));

describe("SFHS Pixi minimal fixture", () => {
  it("has serializable initial state and a renderer-facing presentation derived from it", () => {
    const state = createInitialPixiMinimalFixtureState();

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    expect(presentPixiMinimalFixture(state)).toEqual({
      primaryColor: 0x1d4ed8,
      accentColor: 0x34d399,
      playerX: 240,
      playerY: 270,
      targetX: 720,
      targetY: 270,
      targetActive: false,
      playerFrame: 0
    });
    expect(advancePixiMinimalFixtureSimulation(state)).toEqual({
      phase: "running",
      visualRevision: 2,
      ticks: 1,
      playerX: 240,
      playerY: 270,
      activationCount: 0
    });
    expect(state).toEqual({
      phase: "ready",
      visualRevision: 1,
      ticks: 0,
      playerX: 240,
      playerY: 270,
      activationCount: 0
    });
  });

  it("validates through both the manifest contract and read-only CLI", async () => {
    const manifest = JSON.parse(
      await readFile(new URL("../sfhs.project.json", import.meta.url), "utf8")
    ) as unknown;

    expect(validateProjectManifest(manifest, { mode: "release" })).toEqual({ valid: true, findings: [] });
    await expect(runCli(["validate", "--json"], { cwd: fixtureRoot })).resolves.toMatchObject({
      exitCode: 0,
      envelope: { command: "validate", ok: true, findings: [] }
    });
  });

  it("declares local PNG, atlas, SVG, and audio proof assets with valid signatures", async () => {
    const [manifestText, atlasImage, atlasData, targetSvg, audio] = await Promise.all([
      readFile(new URL("./assets/manifest.json", import.meta.url), "utf8"),
      readFile(new URL("./assets/fixture-atlas.png", import.meta.url)),
      readFile(new URL("./assets/fixture-atlas.json", import.meta.url), "utf8"),
      readFile(new URL("./assets/target.svg", import.meta.url), "utf8"),
      readFile(new URL("./assets/audio-unlock.wav", import.meta.url))
    ]);
    const manifest = JSON.parse(manifestText) as { bundles: Array<{ assets: Array<{ alias: string }> }> };

    expect(manifest.bundles[0]?.assets.map((asset) => asset.alias)).toEqual([
      "fixture-atlas-image",
      "fixture-atlas-data",
      "fixture-target",
      "fixture-audio-unlock"
    ]);
    expect(Array.from(atlasImage.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(atlasData).toContain('"player-0"');
    expect(targetSvg).toContain("<svg");
    expect(audio.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(audio.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(manifestText).not.toMatch(/https?:\/\//u);
  });

  it("keeps the authored fixture free of runtime URLs, eval, and inline event handlers", async () => {
    const source = await Promise.all([
      readFile(new URL("./index.html", import.meta.url), "utf8"),
      readFile(new URL("./main.ts", import.meta.url), "utf8"),
      readFile(new URL("./input.ts", import.meta.url), "utf8"),
      readFile(new URL("./runtime.ts", import.meta.url), "utf8"),
      readFile(new URL("./viewport.ts", import.meta.url), "utf8"),
      readFile(new URL("./audio.ts", import.meta.url), "utf8"),
      readFile(new URL("./diagnostics.ts", import.meta.url), "utf8"),
      readFile(new URL("./styles.css", import.meta.url), "utf8")
    ]);
    const authoredSource = source.join("\n");

    expect(authoredSource).not.toMatch(/https?:\/\//u);
    expect(authoredSource).not.toMatch(/\beval\s*\(/u);
    expect(authoredSource).not.toMatch(/\son[a-z]+\s*=/iu);
  });
});
