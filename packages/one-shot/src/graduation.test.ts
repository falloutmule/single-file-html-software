import { afterEach, describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  auditGraduationProject,
  createGraduationPlan,
  extractGraduationZip,
  extractGraduationSelectedSource,
  importGraduationProject,
  inspectGraduationArchitecture,
  inspectGraduationInput,
  inspectGraduationZip,
  materializeGraduationProject,
  normalizeGraduationArchivePath,
  type GraduationFile
} from "./graduation.ts";

const roots: string[] = [];
async function temporaryRoot(): Promise<string> { const root = await mkdtemp(join(tmpdir(), "sfhs-grad-")); roots.push(root); return root; }
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });
function crc32(bytes: Uint8Array): number { let value = 0xffffffff; for (const byte of bytes) { value ^= byte; for (let index = 0; index < 8; index += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; }
function u16(bytes: Uint8Array, at: number, value: number): void { bytes[at] = value & 0xff; bytes[at + 1] = (value >>> 8) & 0xff; }
function u32(bytes: Uint8Array, at: number, value: number): void { for (let index = 0; index < 4; index += 1) bytes[at + index] = (value >>> (index * 8)) & 0xff; }
function zip(entries: readonly { readonly path: string; readonly text?: string; readonly bytes?: Uint8Array; readonly deflate?: boolean }[]): Uint8Array {
  const encoder = new TextEncoder(); const chunks: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.path); const plain = entry.bytes ?? encoder.encode(entry.text ?? ""); const compressed = entry.deflate ? new Uint8Array(deflateRawSync(plain)) : plain; const method = entry.deflate ? 8 : 0; const crc = crc32(plain);
    const local = new Uint8Array(30 + name.length); u32(local, 0, 0x04034b50); u16(local, 4, 20); u16(local, 8, method); u32(local, 14, crc); u32(local, 18, compressed.length); u32(local, 22, plain.length); u16(local, 26, name.length); local.set(name, 30); chunks.push(local, compressed);
    const directory = new Uint8Array(46 + name.length); u32(directory, 0, 0x02014b50); u16(directory, 4, 20); u16(directory, 6, 20); u16(directory, 10, method); u32(directory, 16, crc); u32(directory, 20, compressed.length); u32(directory, 24, plain.length); u16(directory, 28, name.length); u32(directory, 42, offset); directory.set(name, 46); central.push(directory); offset += local.length + compressed.length;
  }
  const centralBytes = central.reduce((total, entry) => total + entry.length, 0); const end = new Uint8Array(22); u32(end, 0, 0x06054b50); u16(end, 8, entries.length); u16(end, 10, entries.length); u32(end, 12, centralBytes); u32(end, 16, offset); const output = new Uint8Array(offset + centralBytes + end.length); let at = 0; for (const chunk of [...chunks, ...central, end]) { output.set(chunk, at); at += chunk.length; } return output;
}

describe("graduation archive intake", () => {
  it("accepts stored and deflated UTF-8 entries and verifies CRC before extraction", async () => {
    const archive = zip([{ path: "cat-air-hockey/", text: "" }, { path: "cat-air-hockey/SOURCE-MANIFEST.json", text: "{}" }, { path: "cat-air-hockey/src/main.ts", text: "export const hello = 'é';", deflate: true }]);
    const inspected = await inspectGraduationZip(archive);
    expect(inspected.valid).toBe(true); expect(inspected.value?.map((file) => file.path)).toEqual(["cat-air-hockey/SOURCE-MANIFEST.json", "cat-air-hockey/src/main.ts"]);
  });
  it("fails closed for traversal, normalized duplicate paths, CRC mismatch, and truncation", async () => {
    expect(normalizeGraduationArchivePath("../escape")).toBeUndefined(); expect(normalizeGraduationArchivePath("C:\\escape")).toBeUndefined();
    const duplicate = zip([{ path: "a/b.txt", text: "a" }, { path: "a\\b.txt", text: "b" }]);
    expect((await inspectGraduationZip(duplicate)).findings[0]?.code).toBe("SFHS_GRAD_ARCHIVE_PATH_UNSAFE");
    const valid = zip([{ path: "root/src/main.ts", text: "ok" }]); const damaged = new Uint8Array(valid); damaged[46] = (damaged[46] ?? 0) ^ 1;
    expect((await inspectGraduationZip(damaged)).findings[0]?.code).toBe("SFHS_GRAD_ARCHIVE_HASH_MISMATCH");
    expect((await inspectGraduationZip(valid.subarray(0, valid.length - 3))).valid).toBe(false);
  });
  it("normalizes a split legacy Cat-Paw-shaped source and keeps its candidate historical", async () => {
    const root = await temporaryRoot(); const source = join(root, "source.zip"); const evidence = join(root, "evidence.zip");
    await writeFile(source, zip([{ path: "cat-air-hockey/SOURCE-MANIFEST.json", text: "{\"schema\":\"source\"}" }, { path: "cat-air-hockey/sfhs.project.json", text: "{\"viewport\":{\"orientation\":\"portrait\"}}" }, { path: "cat-air-hockey/src/main.ts", text: "export {};" }, { path: "cat-air-hockey/candidate/index.unverified.html", text: "<html/>" }, { path: "cat-air-hockey/ISSUES-ENCOUNTERED.md", text: "failed then repaired" }]));
    await writeFile(evidence, zip([{ path: "evidence/match-flow-repaired.json", text: "{}", deflate: true }]));
    const inspected = await inspectGraduationInput({ source, evidence });
    expect(inspected.valid).toBe(true); expect(inspected.value?.intake.sourceCandidates[0]?.authority).toBe("AUTHORITATIVE"); expect(inspected.value?.intake.candidateArtifacts[0]?.path).toBe("cat-air-hockey/candidate/index.unverified.html");
    const plan = createGraduationPlan(inspected.value!.intake, inspected.value!.lineage, inspected.value!.intake.inputs.flatMap((input) => input.files));
    expect(plan.value?.plan.strategy).toBe("DIRECT_CANONICALIZATION");
    expect(plan.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_GRAD_PROJECT_CONTRACT_REWIRE_REQUIRED" })]));
    const selected = await extractGraduationSelectedSource(inspected.value!.intake, inspected.value!.lineage, join(root, "selected"));
    expect(selected.valid).toBe(true); expect(await readFile(join(root, "selected", "src", "main.ts"), "utf8")).toBe("export {};");
  });
  it("inspects one bounded nested source archive from a graduation wrapper", async () => {
    const root = await temporaryRoot(); const wrapper = join(root, "inputs.zip");
    const source = zip([{ path: "cat-air-hockey/", text: "" }, { path: "cat-air-hockey/SOURCE-MANIFEST.json", text: "{}" }, { path: "cat-air-hockey/sfhs.project.json", text: "{}" }, { path: "cat-air-hockey/src/main.ts", text: "export {};" }]);
    await writeFile(wrapper, zip([{ path: "cat-paw-inputs/", text: "" }, { path: "cat-paw-inputs/source.zip", bytes: source }]));
    const inspected = await inspectGraduationInput({ source: wrapper });
    expect(inspected.valid).toBe(true); expect(inspected.value?.lineage.selectedSourceId).toBeDefined(); expect(inspected.value?.intake.inputs[0]?.files.some((file) => file.path === "cat-air-hockey/src/main.ts")).toBe(true);
  });
  it("extracts a validated archive transactionally after inspection", async () => {
    const root = await temporaryRoot(); const output = join(root, "extracted");
    const extracted = await extractGraduationZip(zip([{ path: "project/src/main.ts", text: "export {};", deflate: true }]), output);
    expect(extracted.valid).toBe(true); expect(await readFile(join(output, "project", "src", "main.ts"), "utf8")).toBe("export {};");
    expect((await extractGraduationZip(zip([{ path: "project/src/main.ts", text: "x" }]), output)).valid).toBe(false);
  });
});

describe("graduation migration records", () => {
  const files = (contents: Readonly<Record<string, string>>): readonly GraduationFile[] => Object.entries(contents).map(([path, content]) => ({ path, bytes: content.length, sha256: "a".repeat(64), content: new TextEncoder().encode(content) }));
  it("classifies Skyline-like legacy ownership without automatically rewriting it", () => {
    const inspection = inspectGraduationArchitecture(files({ "src/main.ts": "namespace Skyline {} const app = new PIXI.Application(); app.ticker.add(() => state.step()); requestAnimationFrame(loop);" }));
    expect(inspection.facts.directPixiApplication).toBe("DETECTED"); expect(inspection.facts.namespaceGlobals).toBe("DETECTED"); expect(inspection.facts.pixiTickerGameplay).toBe("DETECTED");
  });
  it("imports transactionally and materializes to an ignored workspace location", async () => {
    const root = await temporaryRoot(); const source = join(root, "source"); const destination = join(root, "product"); await mkdir(join(source, "src"), { recursive: true });
    await writeFile(join(source, "sfhs.project.json"), "{}\n"); await writeFile(join(source, "src", "main.ts"), "export {};\n"); await mkdir(join(source, "candidate")); await writeFile(join(source, "candidate", "index.unverified.html"), "historical");
    const inspected = await inspectGraduationInput({ source }); const planned = createGraduationPlan(inspected.value!.intake, inspected.value!.lineage, inspected.value!.intake.inputs[0]!.files);
    const imported = await importGraduationProject({ sourceRoot: source, destination, plan: planned.value!.plan, revision: "a".repeat(40) });
    expect(imported.valid).toBe(true); await expect(readFile(join(destination, "candidate", "index.unverified.html"))).rejects.toThrow();
    const second = await importGraduationProject({ sourceRoot: source, destination, plan: planned.value!.plan, revision: "a".repeat(40) }); expect(second.valid).toBe(false);
    const workspace = join(root, "workspace"); await mkdir(join(workspace, "examples"), { recursive: true }); const materialized = await materializeGraduationProject({ sourceRoot: destination, workspaceRoot: workspace, projectId: "test-product", revision: "a".repeat(40) });
    expect(materialized.valid).toBe(true); expect(materialized.value?.path).toContain(".sfhs-grad-test-product-");
  });
  it("accepts the existing Skyline graduation as a completed golden fixture", async () => {
    const root = resolve(process.cwd(), "examples", "skyline-drop"); const audited = await auditGraduationProject(root);
    expect(audited.value?.stage).toBe("GRADUATION_COMPLETE"); expect(audited.findings).not.toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_GRAD_MODULE_INTEGRATION_REQUIRED" })]));
  });
});
