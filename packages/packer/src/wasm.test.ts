import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildProject } from "@sfhs/builder";
import { sha256Bytes } from "@sfhs/core";
import { describe, expect, it } from "vitest";

import { packIntermediate } from "./index.ts";
import { scanPackedBytes } from "../../verifier/src/index.ts";

const wasmFixture = fileURLToPath(new URL("../../../examples/wasm-minimal/", import.meta.url));
const jsFixture = fileURLToPath(new URL("../../../examples/pixi-minimal/", import.meta.url));
const fixedOptions = { nodeVersion: "v24.14.0", pnpmVersion: "11.9.0", sfhsVersion: "0.1.0" } as const;

describe("@sfhs/packer deterministic offline WebAssembly", () => {
  it("embeds multiple exact WASM payloads with byte-identical output", async () => {
    const intermediate = await buildProject(wasmFixture);
    const first = packIntermediate(intermediate, fixedOptions);
    const second = packIntermediate(await buildProject(wasmFixture), fixedOptions);
    expect(first.bytes).toEqual(second.bytes);
    expect(first.descriptor.artifact.sha256).toBe(second.descriptor.artifact.sha256);
    expect(first.html.match(/data:application\/wasm;base64,/gu)).toHaveLength(2);
    expect(first.html).not.toMatch(/assets\/(?:add|multiply)-[^"']+\.wasm/iu);
    for (const asset of intermediate.emittedAssets.filter((candidate) => candidate.mediaType === "application/wasm")) {
      expect(first.html).toContain(`data:application/wasm;base64,${Buffer.from(asset.bytes).toString("base64")}`);
    }
    expect(scanPackedBytes(first.bytes)).toEqual({ schema: "sfhs.static-scan@1", valid: true, findings: [] });
  });

  it("does not perturb the established JS-only artifact", async () => {
    const packed = packIntermediate(await buildProject(jsFixture), fixedOptions);
    expect(packed.bytes.byteLength).toBe(574268);
    expect(sha256Bytes(packed.bytes)).toBe("4487a0b1d1aec53625ebff9706312f90d734fee9e55fb2a7aa7de8288d0367b2");
    expect(packed.html).not.toContain("application/wasm");
  });

  it("preserves corrupt WASM bytes but leaves semantic rejection to WebAssembly", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "sfhs-wasm-corrupt-"));
    try {
      await cp(wasmFixture, temporaryRoot, { recursive: true, filter: (source) => !source.includes(`${join("wasm-minimal", "dist")}`) });
      await writeFile(join(temporaryRoot, "src", "assets", "add.wasm"), Uint8Array.from([0, 97, 115, 109, 1]));
      const intermediate = await buildProject(temporaryRoot);
      const corrupt = intermediate.emittedAssets.find((asset) => asset.fileName.includes("add"));
      expect(corrupt).toBeDefined();
      const corruptBytes = Uint8Array.from(corrupt!.bytes);
      expect(WebAssembly.validate(corruptBytes)).toBe(false);
      await expect(WebAssembly.instantiate(corruptBytes)).rejects.toBeInstanceOf(WebAssembly.CompileError);
      const packed = packIntermediate(intermediate, fixedOptions);
      expect(packed.html).toContain(`data:application/wasm;base64,${Buffer.from(corrupt!.bytes).toString("base64")}`);
      expect(scanPackedBytes(packed.bytes).valid).toBe(true);
    } finally { await rm(temporaryRoot, { recursive: true, force: true }); }
  });

  it("rejects an unsupported hand-authored runtime WASM fetch during verification", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "sfhs-wasm-fetch-"));
    try {
      await cp(wasmFixture, temporaryRoot, { recursive: true, filter: (source) => !source.includes(`${join("wasm-minimal", "dist")}`) });
      await writeFile(join(temporaryRoot, "src", "main.ts"), 'void fetch("./assets/add.wasm");\n');
      const packed = packIntermediate(await buildProject(temporaryRoot), fixedOptions);
      const scan = scanPackedBytes(packed.bytes);
      expect(scan.valid).toBe(false);
      expect(scan.findings.some((finding) => finding.code === "SFHS_SCAN_RUNTIME_FETCH" && finding.reference?.includes("add.wasm"))).toBe(true);
    } finally { await rm(temporaryRoot, { recursive: true, force: true }); }
  });
});
