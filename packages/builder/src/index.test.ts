import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildIntermediate,
  buildProject,
  createBuildPlan,
  packageIdentity
} from "./index.ts";

const fixtureRoot = fileURLToPath(new URL("../../../examples/pixi-minimal/", import.meta.url));

async function readOptional(path: string): Promise<Buffer | undefined> {
  return readFile(path).catch(() => undefined);
}

describe("@sfhs/builder", () => {
  it("exposes its workspace boundary", () => {
    expect(packageIdentity).toBe("@sfhs/builder");
  });

  it("creates a contained read-only build plan", async () => {
    const outputPath = join(fixtureRoot, "dist", "index.html");
    const outputBefore = await readOptional(outputPath);
    const plan = await createBuildPlan(fixtureRoot);

    expect(plan).toMatchObject({
      schema: "sfhs.build-plan@1",
      projectRoot: resolve(fixtureRoot),
      manifest: { project: { id: "pixi-minimal" }, adapter: { id: "pixi-v8" } }
    });
    expect(plan.entryPath).toBe(join(fixtureRoot, "src", "main.ts"));
    expect(plan.outputPath).toBe(outputPath);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(await readOptional(plan.outputPath)).toEqual(outputBefore);
  });

  it("builds deterministic in-memory JS, CSS, and asset outputs without writing dist", async () => {
    const plan = await createBuildPlan(fixtureRoot);
    const outputBefore = await readOptional(plan.outputPath);
    const first = await buildIntermediate(plan);
    const second = await buildProject(fixtureRoot);

    expect(first.schema).toBe("sfhs.intermediate@1");
    expect(first.javascript).toContain("sfhs.cr@1");
    expect(first.javascript).not.toMatch(/from\s*["']pixi\.js["']/u);
    expect(first.stylesheet).toContain("touch-action:none");
    expect(first.declaredAssets.map((asset) => asset.mediaType)).toEqual([
      "audio/wav",
      "application/json",
      "image/png",
      "image/svg+xml"
    ]);
    expect(first.emittedAssets).toHaveLength(3);
    expect(first.moduleInputs).toContain("src/main.ts");
    expect(first.sourceSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.sourceSha256).not.toBe("7bcfc7d301c94372daa58d742573f9fef24420725055e8e5ca3b219b2603eb6d");
    expect(second.javascript).toBe(first.javascript);
    expect(second.stylesheet).toBe(first.stylesheet);
    expect(second.sourceSha256).toBe(first.sourceSha256);
    expect(second.emittedAssets.map((asset) => [asset.fileName, asset.sha256])).toEqual(
      first.emittedAssets.map((asset) => [asset.fileName, asset.sha256])
    );
    expect(await readOptional(plan.outputPath)).toEqual(outputBefore);
    expect(existsSync(join(fixtureRoot, ".sfhs-intermediate"))).toBe(false);
  });

  it("fails with a stable code before bundling an invalid project", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "sfhs-builder-invalid-"));
    const sourceFixture = fileURLToPath(
      new URL("../../contracts/fixtures/invalid/project-unknown-adapter.json", import.meta.url)
    );
    try {
      await cp(sourceFixture, join(temporaryRoot, "sfhs.project.json"));
      await expect(createBuildPlan(temporaryRoot)).rejects.toMatchObject({
        code: "SFHS_BUILD_MANIFEST_INVALID"
      });
      expect(existsSync(join(temporaryRoot, "dist"))).toBe(false);
      expect(dirname(temporaryRoot)).toBe(tmpdir());
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("fails explicitly for an unsupported declared asset type", async () => {
    const temporaryParent = await mkdtemp(join(tmpdir(), "sfhs-builder-unsupported-"));
    const temporaryRoot = join(temporaryParent, "project");
    try {
      await cp(fixtureRoot, temporaryRoot, {
        recursive: true,
        filter: (source) => !source.includes(`${join("pixi-minimal", "dist")}`)
      });
      await writeFile(join(temporaryRoot, "src", "assets", "unsupported.bin"), "unsupported", "utf8");
      await writeFile(
        join(temporaryRoot, "src", "assets", "manifest.json"),
        '{"bundles":[{"name":"unsupported","assets":[{"alias":"unsupported","src":"./unsupported.bin"}]}]}\n',
        "utf8"
      );

      await expect(buildProject(temporaryRoot)).rejects.toMatchObject({
        code: "SFHS_BUILD_ASSET_UNSUPPORTED"
      });
    } finally {
      await rm(temporaryParent, { recursive: true, force: true });
    }
  });
});
