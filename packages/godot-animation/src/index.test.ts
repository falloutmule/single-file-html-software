import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  exportGodotAnimation,
  type GodotAnimationCommandRunner,
  type GodotAnimationExportDescriptor,
  type GodotAnimationExportError,
  validateGodotAnimationDescriptor
} from "./index.ts";
import { decodeRgbaPng, encodeRgbaPng } from "./png.ts";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(async (root) => rm(root, { recursive: true, force: true }))));

const descriptor: GodotAnimationExportDescriptor = {
  schema: "sfhs.godot-animation-export@1",
  godotProject: "godot",
  scene: "res://fixture.tscn",
  animationPlayer: "AnimationPlayer",
  workingFrame: { width: 8, height: 8 },
  scale: 2,
  sheet: { columns: 2, rows: 1 },
  anchor: { x: 4, y: 6, groundedTolerance: 0 },
  border: { transparentPixels: 1 },
  variantAlphaParity: true,
  samples: [
    { id: "idle", animation: "idle", timeSeconds: 0, grounded: true },
    { id: "wave", animation: "wave", timeSeconds: 0.5, grounded: true }
  ],
  variants: [
    { id: "one", parameters: { color: "red" }, output: "outputs/one.png" },
    { id: "two", parameters: { color: "blue" }, output: "outputs/two.png" }
  ],
  metadataOutput: "outputs/metadata.json",
  validationOutput: "outputs/validation.json"
};

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sfhs-godot-animation-test-")); roots.push(root);
  await mkdir(join(root, "godot"));
  await writeFile(join(root, "sfhs.project.json"), "{}\n");
  await writeFile(join(root, "godot", "project.godot"), "config_version=5\n");
  await writeFile(join(root, "godot", "fixture.tscn"), "[gd_scene format=3]\n");
  await writeFile(join(root, "descriptor.json"), `${JSON.stringify(descriptor, null, 2)}\n`);
  return root;
}

function frame(color: readonly [number, number, number], sampleIndex: number): Uint8Array {
  const pixels = new Uint8Array(8 * 8 * 4);
  for (let y = 2; y <= 6; y += 1) for (let x = 2; x <= 5; x += 1) {
    const offset = (y * 8 + x) * 4;
    pixels.set([color[0] + sampleIndex, color[1], color[2], 255], offset);
  }
  return encodeRgbaPng({ width: 8, height: 8, pixels });
}

const fakeRunner: GodotAnimationCommandRunner = async (_executable, arguments_) => {
  if (arguments_.includes("--version")) return { stdout: "4.7.1.stable.official.fixture\n", stderr: "" };
  const configPath = arguments_[arguments_.indexOf("--config") + 1]!;
  const reportPath = arguments_[arguments_.indexOf("--report") + 1]!;
  const config = JSON.parse(await readFile(configPath, "utf8")) as { outputDirectory: string; variants: readonly unknown[]; samples: readonly unknown[] };
  for (let variantIndex = 0; variantIndex < config.variants.length; variantIndex += 1) for (let sampleIndex = 0; sampleIndex < config.samples.length; sampleIndex += 1) await writeFile(join(config.outputDirectory, `variant-${variantIndex}-frame-${sampleIndex}.png`), frame(variantIndex === 0 ? [200, 20, 20] : [20, 20, 200], sampleIndex));
  await writeFile(reportPath, `${JSON.stringify({ ok: true, frameCount: config.variants.length * config.samples.length, renderer: "gl_compatibility" })}\n`);
  return { stdout: "", stderr: "" };
};

describe("SFHS Godot animation export", () => {
  it("validates descriptor structure and sample packing cardinality", () => {
    expect(validateGodotAnimationDescriptor(descriptor)).toMatchObject({ valid: true, findings: [] });
    expect(validateGodotAnimationDescriptor({ ...descriptor, samples: descriptor.samples.slice(0, 1) })).toMatchObject({ valid: false, findings: [expect.objectContaining({ path: "/samples" })] });
    expect(validateGodotAnimationDescriptor({ ...descriptor, godotProject: "../escape" })).toMatchObject({ valid: false, findings: [expect.objectContaining({ path: "/godotProject" })] });
    expect(validateGodotAnimationDescriptor({ ...descriptor, godotProject: "C:escape" })).toMatchObject({ valid: false, findings: [expect.objectContaining({ path: "/godotProject" })] });
    expect(validateGodotAnimationDescriptor({ ...descriptor, surprise: true })).toMatchObject({ valid: false, findings: [expect.objectContaining({ path: "/" })] });
    expect(validateGodotAnimationDescriptor({ ...descriptor, variants: [{ ...descriptor.variants[0], parameters: { color: new Date() } }] })).toMatchObject({ valid: false, findings: [expect.objectContaining({ path: "/variants/0" })] });
  });

  it("invokes the pinned version, validates frames, nearest-scales, packs, hashes, and verifies reruns", async () => {
    const root = await fixtureRoot();
    let observedEnvironment: NodeJS.ProcessEnv | undefined;
    const observingRunner: GodotAnimationCommandRunner = async (executable, arguments_, options) => {
      observedEnvironment = options.environment;
      return fakeRunner(executable, arguments_, options);
    };
    const first = await exportGodotAnimation({ projectRoot: root, descriptorPath: "descriptor.json", godotExecutable: process.execPath, commandRunner: observingRunner });
    expect(first.godot.version).toBe("4.7.1.stable.official.fixture");
    expect(observedEnvironment).toMatchObject({ ALL_PROXY: "", HTTP_PROXY: "", HTTPS_PROXY: "", NO_PROXY: "*" });
    expect(first.outputs.map((output) => output.disposition)).toEqual(["written", "written"]);
    const sheet = decodeRgbaPng(await readFile(join(root, "outputs", "one.png")));
    expect({ width: sheet.width, height: sheet.height }).toEqual({ width: 32, height: 16 });
    const pixel = (x: number, y: number) => [...sheet.pixels.subarray((y * sheet.width + x) * 4, (y * sheet.width + x) * 4 + 4)];
    expect(pixel(4, 4)).toEqual([200, 20, 20, 255]);
    expect(pixel(5, 5)).toEqual([200, 20, 20, 255]);
    expect(pixel(20, 4)).toEqual([201, 20, 20, 255]);
    const second = await exportGodotAnimation({ projectRoot: root, descriptorPath: "descriptor.json", godotExecutable: process.execPath, commandRunner: fakeRunner });
    expect(second.outputs.map((output) => output.disposition)).toEqual(["verified", "verified"]);
    const previousExecutable = process.env.SFHS_GODOT_EXECUTABLE;
    process.env.SFHS_GODOT_EXECUTABLE = process.execPath;
    try {
      const fromEnvironment = await exportGodotAnimation({ projectRoot: root, descriptorPath: "descriptor.json", commandRunner: fakeRunner });
      expect(fromEnvironment.godot.executable).toBe(process.execPath);
    } finally {
      if (previousExecutable === undefined) delete process.env.SFHS_GODOT_EXECUTABLE;
      else process.env.SFHS_GODOT_EXECUTABLE = previousExecutable;
    }
  });

  it("fails closed on drift, network-capable project content, symlinks, and unsupported versions", async () => {
    const root = await fixtureRoot();
    await exportGodotAnimation({ projectRoot: root, descriptorPath: "descriptor.json", godotExecutable: process.execPath, commandRunner: fakeRunner });
    await writeFile(join(root, "outputs", "one.png"), "drift");
    await expect(exportGodotAnimation({ projectRoot: root, descriptorPath: "descriptor.json", godotExecutable: process.execPath, commandRunner: fakeRunner })).rejects.toMatchObject({ findings: [expect.objectContaining({ code: "SFHS_GODOT_ANIMATION_OUTPUT_DRIFT" })] } satisfies Partial<GodotAnimationExportError>);

    const networkRoot = await fixtureRoot(); await writeFile(join(networkRoot, "godot", "network.gd"), "var request = HTTPRequest.new()\n");
    await expect(exportGodotAnimation({ projectRoot: networkRoot, descriptorPath: "descriptor.json", godotExecutable: process.execPath, commandRunner: fakeRunner })).rejects.toMatchObject({ findings: [expect.objectContaining({ code: "SFHS_GODOT_ANIMATION_NETWORK_CONTENT" })] } satisfies Partial<GodotAnimationExportError>);

    const symlinkRoot = await fixtureRoot(); await symlink(join(symlinkRoot, "godot"), join(symlinkRoot, "linked-godot"), "junction");
    await writeFile(join(symlinkRoot, "descriptor.json"), `${JSON.stringify({ ...descriptor, godotProject: "linked-godot" })}\n`);
    await expect(exportGodotAnimation({ projectRoot: symlinkRoot, descriptorPath: "descriptor.json", godotExecutable: process.execPath, commandRunner: fakeRunner })).rejects.toMatchObject({ findings: [expect.objectContaining({ code: "SFHS_GODOT_ANIMATION_PATH_INVALID" })] } satisfies Partial<GodotAnimationExportError>);

    const versionRoot = await fixtureRoot();
    await expect(exportGodotAnimation({ projectRoot: versionRoot, descriptorPath: "descriptor.json", godotExecutable: process.execPath, commandRunner: async () => ({ stdout: "4.6.stable", stderr: "" }) })).rejects.toMatchObject({ findings: [expect.objectContaining({ code: "SFHS_GODOT_ANIMATION_GODOT_UNSUPPORTED" })] } satisfies Partial<GodotAnimationExportError>);
    await expect(exportGodotAnimation({ projectRoot: versionRoot, descriptorPath: "descriptor.json", godotExecutable: process.execPath, commandRunner: async () => ({ stdout: "4.7.1.stable2", stderr: "" }) })).rejects.toMatchObject({ findings: [expect.objectContaining({ code: "SFHS_GODOT_ANIMATION_GODOT_UNSUPPORTED" })] } satisfies Partial<GodotAnimationExportError>);
  });
});
