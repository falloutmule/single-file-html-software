import { existsSync } from "node:fs";
import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import { buildProject } from "@sfhs/builder";
import { validateArtifactManifest } from "@sfhs/contracts";
import { sha256Bytes } from "@sfhs/core";
import { describe, expect, it } from "vitest";

import {
  packIntermediate,
  packProject,
  packageIdentity,
  SfhsPackError
} from "./index.ts";

const fixtureRoot = fileURLToPath(new URL("../../../examples/pixi-minimal/", import.meta.url));
const fixtureOutputDirectory = join(fixtureRoot, "dist");
const fixtureOutputPath = join(fixtureOutputDirectory, "index.html");

describe("@sfhs/packer", () => {
  it("exposes its workspace boundary", () => {
    expect(packageIdentity).toBe("@sfhs/packer");
  });

  it("packs deterministic one-file HTML in memory with exact descriptor identity", async () => {
    const intermediate = await buildProject(fixtureRoot);
    const first = packIntermediate(intermediate, {
      nodeVersion: "v24.14.0",
      pnpmVersion: "11.9.0",
      sfhsVersion: "0.1.0"
    });
    const second = packIntermediate(intermediate, {
      nodeVersion: "v24.14.0",
      pnpmVersion: "11.9.0",
      sfhsVersion: "0.1.0"
    });

    expect(first.html).toBe(second.html);
    expect(first.html).toContain('<style data-sfhs-inline="styles">');
    expect(first.html).toContain('<script data-sfhs-inline="entry">');
    expect(first.html).toContain("data:image/png;base64,");
    expect(first.html).toContain("data:image/svg+xml;base64,");
    expect(first.html).toContain("data:audio/wav;base64,");
    expect(first.html).toContain("sfhs.cr@1");
    expect(first.html).not.toMatch(/<script[^>]+src=/iu);
    expect(first.html).not.toMatch(/<link[^>]+rel="stylesheet"/iu);
    expect(first.html).not.toContain("assets/fixture-atlas-");
    expect(first.descriptor.artifact.path).toBe("dist/index.html");
    expect(first.descriptor.artifact.bytes).toBe(first.bytes.byteLength);
    expect(first.descriptor.artifact.sha256).toBe(sha256Bytes(first.bytes));
    expect(validateArtifactManifest(first.descriptor)).toEqual({ valid: true, findings: [] });
  });

  it("writes only the exact packed HTML and reproduces identical bytes", async () => {
    await rm(fixtureOutputDirectory, { recursive: true, force: true });
    try {
      const first = await packProject(fixtureRoot, { sourceRevision: "test-revision" });
      const firstBytes = await readFile(fixtureOutputPath);
      const second = await packProject(fixtureRoot, { sourceRevision: "test-revision" });
      const secondBytes = await readFile(fixtureOutputPath);

      expect([...await readdir(fixtureOutputDirectory)]).toEqual(["index.html"]);
      expect(Buffer.from(secondBytes).equals(firstBytes)).toBe(true);
      expect(sha256Bytes(secondBytes)).toBe(second.descriptor.artifact.sha256);
      expect(first.descriptor.artifact.sha256).toBe(second.descriptor.artifact.sha256);
    } finally {
      await rm(fixtureOutputDirectory, { recursive: true, force: true });
    }
    expect(existsSync(fixtureOutputDirectory)).toBe(false);
  });

  it("inlines emitted assets referenced by authored CSS", async () => {
    const intermediate = await buildProject(fixtureRoot);
    const asset = intermediate.emittedAssets[0];
    expect(asset).toBeDefined();
    if (asset === undefined) {
      return;
    }
    const javascript = intermediate.javascript
      .replaceAll(`./${asset.fileName}`, "asset-moved-to-css")
      .replaceAll(asset.fileName, "asset-moved-to-css");
    const moved = Object.freeze({
      ...intermediate,
      javascript,
      stylesheet: `${intermediate.stylesheet}\n.asset-probe{background:url("./${asset.fileName}")}`
    });

    const packed = packIntermediate(moved);

    expect(packed.html).toContain(`data:${asset.mediaType};base64,`);
    expect(packed.html).not.toContain(asset.fileName);
  });

  it("serializes raw scanner-rejected controls in inline JavaScript while preserving string and regexp semantics", async () => {
    const intermediate = await buildProject(fixtureRoot);
    const javascript = 'globalThis.sfhsControlProbe=["\u0080",/\u0080/.test("\u0080")];';
    const packed = packIntermediate(Object.freeze({ ...intermediate, javascript, emittedAssets: [] }));
    expect(packed.html).toContain('"\\u0080"');
    expect(packed.html).not.toContain("\u0080");
    const script = /<script data-sfhs-inline="entry">([\s\S]*?)<\/script>/u.exec(packed.html)?.[1];
    expect(script).toBeDefined();
    const sandbox: { sfhsControlProbe?: unknown } = {};
    runInNewContext(script!, sandbox);
    expect(sandbox.sfhsControlProbe).toEqual(["\u0080", true]);
  });

  it("fails closed for a raw control in a tagged template literal", async () => {
    const intermediate = await buildProject(fixtureRoot);
    const javascript = 'const tag=(parts)=>parts.raw[0];globalThis.sfhsControlProbe=tag`\u0080`;';
    expect(() => packIntermediate(Object.freeze({ ...intermediate, javascript, emittedAssets: [] }))).toThrow(
      expect.objectContaining({ code: "SFHS_PACK_SCRIPT_CONTROL_INVALID" })
    );
  });

  it("continues to escape an inline closing-script sequence without changing JavaScript semantics", async () => {
    const intermediate = await buildProject(fixtureRoot);
    const javascript = 'globalThis.sfhsScriptTerminator="</script>";';
    const packed = packIntermediate(Object.freeze({ ...intermediate, javascript, emittedAssets: [] }));
    expect(packed.html).toContain('"<\\/script>"');
    const script = /<script data-sfhs-inline="entry">([\s\S]*?)<\/script>/u.exec(packed.html)?.[1];
    expect(script).toBeDefined();
    const sandbox: { sfhsScriptTerminator?: unknown } = {};
    runInNewContext(script!, sandbox);
    expect(sandbox.sfhsScriptTerminator).toBe("</script>");
  });

  it("fails closed when the authored module entry is missing", async () => {
    const intermediate = await buildProject(fixtureRoot);
    const invalid = Object.freeze({
      ...intermediate,
      htmlTemplate: "<!doctype html><html><head><link rel=\"stylesheet\" href=\"./styles.css\"></head><body></body></html>"
    });

    expect(() => packIntermediate(invalid)).toThrowError(SfhsPackError);
    expect(() => packIntermediate(invalid)).toThrow(expect.objectContaining({
      code: "SFHS_PACK_ENTRY_SCRIPT_INVALID"
    }));
  });
});
