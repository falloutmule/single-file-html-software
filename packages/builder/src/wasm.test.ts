import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildProject } from "./index.ts";

const fixtureRoot = fileURLToPath(new URL("../../../examples/wasm-minimal/", import.meta.url));

describe("@sfhs/builder WebAssembly assets", () => {
  it("discovers multiple WASM imports deterministically and preserves exact bytes", async () => {
    const first = await buildProject(fixtureRoot);
    const second = await buildProject(fixtureRoot);
    const wasm = first.emittedAssets.filter((asset) => asset.mediaType === "application/wasm");
    expect(wasm).toHaveLength(2);
    expect(wasm.map((asset) => asset.fileName)).toEqual([...wasm.map((asset) => asset.fileName)].sort());
    expect(wasm.map((asset) => asset.bytes.byteLength)).toEqual([41, 41]);
    for (const asset of wasm) {
      const sourceName = asset.fileName.includes("multiply") ? "multiply.wasm" : "add.wasm";
      expect(Buffer.from(asset.bytes)).toEqual(await readFile(join(fixtureRoot, "src", "assets", sourceName)));
      expect(WebAssembly.validate(Uint8Array.from(asset.bytes))).toBe(true);
    }
    expect(second.javascript).toBe(first.javascript);
    expect(second.sourceSha256).toBe(first.sourceSha256);
    expect(second.emittedAssets.map((asset) => [asset.fileName, asset.sha256])).toEqual(first.emittedAssets.map((asset) => [asset.fileName, asset.sha256]));
  });

  it("fails clearly when a statically imported WASM file is missing", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "sfhs-wasm-missing-"));
    try {
      await cp(fixtureRoot, temporaryRoot, { recursive: true, filter: (source) => !source.includes(`${join("wasm-minimal", "dist")}`) });
      await rm(join(temporaryRoot, "src", "assets", "add.wasm"));
      await expect(buildProject(temporaryRoot)).rejects.toMatchObject({ code: "SFHS_BUILD_BUNDLE_FAILED" });
      await expect(buildProject(temporaryRoot)).rejects.toThrow(/add\.wasm/iu);
    } finally { await rm(temporaryRoot, { recursive: true, force: true }); }
  });

  it("applies the configured size guard to emitted WASM assets", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "sfhs-wasm-size-"));
    try {
      await cp(fixtureRoot, temporaryRoot, { recursive: true, filter: (source) => !source.includes(`${join("wasm-minimal", "dist")}`) });
      const manifestPath = join(temporaryRoot, "sfhs.project.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { assets: { maximumSingleAssetBytes: number } };
      manifest.assets.maximumSingleAssetBytes = 40;
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      await expect(buildProject(temporaryRoot)).rejects.toMatchObject({ code: "SFHS_BUILD_ASSET_TOO_LARGE" });
    } finally { await rm(temporaryRoot, { recursive: true, force: true }); }
  });
});
