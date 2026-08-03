import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { completeChatOneShot, isSupportedNodeRuntime, selectChatMode, stableJson, validateChatRunState } from "./chat.ts";

const roots: string[] = [];
async function root(): Promise<string> { const value = await mkdtemp(join(tmpdir(), "sfhs-chat-")); roots.push(value); return value; }
afterEach(async () => { await Promise.all(roots.splice(0).map((value) => rm(value, { recursive: true, force: true }))); });

describe("Chat One-Shot protocol v2", () => {
  it.each([
    ["v22.18.0", true],
    ["v22.99.1", true],
    ["v23.0.0", true],
    ["v24.0.0", true],
    ["v22.17.99", false],
    ["v22.18", false],
    ["not-a-runtime", false]
  ])("classifies runtime %s against the current Node 22.18 minimum", (runtime, supported) => {
    expect(isSupportedNodeRuntime(runtime)).toBe(supported);
  });

  it("does not confuse an available runtime with a complete candidate environment", () => {
    expect(selectChatMode({ sfhsCheckout: { state: "UNAVAILABLE", detail: "missing" }, pnpm: { state: "UNAVAILABLE", detail: "missing" }, template: { state: "UNAVAILABLE", detail: "missing" }, adapter: { state: "UNAVAILABLE", detail: "missing" }, runtime: { state: "UNAVAILABLE", detail: "missing" }, canonicalCli: { state: "UNAVAILABLE", detail: "missing" }, browserRunner: { state: "UNAVAILABLE", detail: "missing" }, candidateRuntime: { state: "AVAILABLE", detail: "pinned" }, chromium: { state: "AVAILABLE", detail: "available" } }).mode).toBe("CHAT_CANDIDATE_MODE");
  });

  it("uses source-only mode when the candidate runtime is absent", () => {
    expect(selectChatMode({ candidateRuntime: { state: "UNAVAILABLE", detail: "missing" }, chromium: { state: "AVAILABLE", detail: "available" } }).mode).toBe("SOURCE_ONLY_MODE");
  });

  it("replays the restricted Cat Paw environment without inventing a candidate artifact", () => {
    const unavailable = { state: "UNAVAILABLE" as const, detail: "fixture unavailable" };
    const available = { state: "AVAILABLE" as const, detail: "fixture available" };
    const replay = selectChatMode({
      sfhsCheckout: unavailable, pnpm: unavailable, template: unavailable, adapter: unavailable, runtime: unavailable, canonicalCli: unavailable, browserRunner: unavailable,
      runtimeCompatible: available, candidateRuntime: unavailable, chromium: available,
      headlessWebgl: unavailable, headfulWebgl: available, urlNavigation: unavailable, setContent: available
    });
    expect(replay).toMatchObject({ mode: "SOURCE_ONLY_MODE" });
    expect(replay.reasons.join(" ")).toContain("candidate runtime");
  });

  it("serializes record keys deterministically", () => {
    expect(stableJson({ z: 1, a: { y: 2, b: 3 } })).toBe('{\n  "a": {\n    "b": 3,\n    "y": 2\n  },\n  "z": 1\n}\n');
  });

  it("rejects stale run-state source references", async () => {
    const project = await root(); await mkdir(join(project, "one-shot")); await writeFile(join(project, "source.txt"), "changed");
    await writeFile(join(project, "one-shot", "RUN-STATE.json"), JSON.stringify({ schema: "sfhs.one-shot-run-state@1", version: 1, project: { id: "fixture", source: { path: "source.txt", sha256: "0".repeat(64) } }, classification: "IMPLEMENT", executionMode: "SOURCE_ONLY_MODE", currentGate: "CONTRACT", completedGates: [], failedGates: [], records: { source: { path: "source.txt", sha256: "0".repeat(64) } }, productStatus: "PRODUCT_INCOMPLETE", sfhsStatus: "SFHS_SOURCE_ONLY", physicalEvidence: "UNTESTED", completionPolicy: { requiredBeforeCompletion: ["CONTRACT"], deferredHardening: [], graduationBacklog: [], releaseBacklog: [] }, nextRequiredAction: "Fix hash", updatedAt: "2026-01-01T00:00:00.000Z" }));
    expect((await validateChatRunState(project)).findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_RUN_STATE_HASH_MISMATCH" })]));
  });

  it("does not complete while a required gate remains open", async () => {
    const project = await root(); await mkdir(join(project, "one-shot")); await writeFile(join(project, "source.txt"), "source");
    const sourceHash = "41cf6794ba4200b839c53531555f0f3998df4cbb01a4d5cb0b94e3ca5e23947d";
    await writeFile(join(project, "one-shot", "RUN-STATE.json"), JSON.stringify({ schema: "sfhs.one-shot-run-state@1", version: 1, project: { id: "fixture", source: { path: "source.txt", sha256: sourceHash } }, classification: "IMPLEMENT", executionMode: "SOURCE_ONLY_MODE", currentGate: "CONTRACT", completedGates: ["CONTRACT"], failedGates: [], records: {}, productStatus: "PRODUCT_INCOMPLETE", sfhsStatus: "SFHS_SOURCE_ONLY", physicalEvidence: "UNTESTED", completionPolicy: { requiredBeforeCompletion: ["CONTRACT", "PLAYABLE_LOOP"], deferredHardening: [], graduationBacklog: [], releaseBacklog: [] }, nextRequiredAction: "Complete loop", updatedAt: "2026-01-01T00:00:00.000Z" }));
    const completed = await completeChatOneShot(project, join(project, "completion.json"));
    expect(completed.valid).toBe(false);
    expect(completed.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_COMPLETION_REQUIRED_OPEN" })]));
  });

  it("writes a revision-bound completion only for completed gates", async () => {
    const project = await root(); await mkdir(join(project, "one-shot")); await writeFile(join(project, "source.txt"), "source");
    const sourceHash = "41cf6794ba4200b839c53531555f0f3998df4cbb01a4d5cb0b94e3ca5e23947d";
    await writeFile(join(project, "one-shot", "RUN-STATE.json"), JSON.stringify({ schema: "sfhs.one-shot-run-state@1", version: 1, project: { id: "fixture", source: { path: "source.txt", sha256: sourceHash } }, classification: "IMPLEMENT", executionMode: "SOURCE_ONLY_MODE", currentGate: "COMPLETION", completedGates: ["CONTRACT"], failedGates: [], records: {}, productStatus: "PRODUCT_COMPLETE", sfhsStatus: "SFHS_SOURCE_ONLY", physicalEvidence: "UNTESTED", completionPolicy: { requiredBeforeCompletion: ["CONTRACT"], deferredHardening: ["profiling"], graduationBacklog: [], releaseBacklog: [] }, nextRequiredAction: "Stop", updatedAt: "2026-01-01T00:00:00.000Z" }));
    const output = join(project, "completion.json");
    expect((await completeChatOneShot(project, output)).value).toEqual({ outcome: "ONE_SHOT_COMPLETE" });
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ outcome: "ONE_SHOT_COMPLETE", source: { sha256: sourceHash } });
  });

  it("writes byte-identical bounded completion ZIPs", async () => {
    const project = await root(); await mkdir(join(project, "one-shot")); await writeFile(join(project, "source.txt"), "source");
    const sourceHash = "41cf6794ba4200b839c53531555f0f3998df4cbb01a4d5cb0b94e3ca5e23947d";
    await writeFile(join(project, "one-shot", "RUN-STATE.json"), JSON.stringify({ schema: "sfhs.one-shot-run-state@1", version: 1, project: { id: "fixture", source: { path: "source.txt", sha256: sourceHash } }, classification: "IMPLEMENT", executionMode: "SOURCE_ONLY_MODE", currentGate: "COMPLETION", completedGates: ["CONTRACT"], failedGates: [], records: {}, productStatus: "PRODUCT_COMPLETE", sfhsStatus: "SFHS_SOURCE_ONLY", physicalEvidence: "UNTESTED", completionPolicy: { requiredBeforeCompletion: ["CONTRACT"], deferredHardening: [], graduationBacklog: [], releaseBacklog: [] }, nextRequiredAction: "Stop", updatedAt: "2026-01-01T00:00:00.000Z" }));
    const first = join(project, "first.zip"); const second = join(project, "second.zip"); await completeChatOneShot(project, first); await completeChatOneShot(project, second);
    const firstBytes = await readFile(first); expect([...firstBytes.subarray(0, 4)]).toEqual([80, 75, 3, 4]); expect(firstBytes).toEqual(await readFile(second));
  });

  it("generates a candidate physical seed without promoting it to canonical", async () => {
    const project = await root(); await mkdir(join(project, "one-shot")); await writeFile(join(project, "source.txt"), "source"); await writeFile(join(project, "one-shot", "ARTIFACT.json"), JSON.stringify({ classification: "candidate", path: "candidate/index.unverified.html", sha256: "a".repeat(64), bytes: 12 }));
    const sourceHash = "41cf6794ba4200b839c53531555f0f3998df4cbb01a4d5cb0b94e3ca5e23947d"; const artifactHash = "c032ca096c2c9504ac753cb018c94f4f26244af268e157cf30554a6991d72330";
    await writeFile(join(project, "one-shot", "RUN-STATE.json"), JSON.stringify({ schema: "sfhs.one-shot-run-state@1", version: 1, project: { id: "fixture", source: { path: "source.txt", sha256: sourceHash } }, classification: "IMPLEMENT", executionMode: "CHAT_CANDIDATE_MODE", currentGate: "COMPLETION", completedGates: ["CONTRACT", "PHYSICAL_SEED"], failedGates: [], records: { artifact: { path: "one-shot/ARTIFACT.json", sha256: artifactHash } }, productStatus: "PRODUCT_COMPLETE", sfhsStatus: "SFHS_CANDIDATE", physicalEvidence: "UNTESTED", completionPolicy: { requiredBeforeCompletion: ["CONTRACT", "PHYSICAL_SEED"], deferredHardening: [], graduationBacklog: [], releaseBacklog: [] }, nextRequiredAction: "Test", updatedAt: "2026-01-01T00:00:00.000Z" }));
    await completeChatOneShot(project, join(project, "completion.json"));
    expect(JSON.parse(await readFile(join(project, "one-shot", "PHYSICAL-TEST-SEED.json"), "utf8"))).toMatchObject({ classification: "candidate", artifact: { path: "candidate/index.unverified.html" } });
    expect(await readFile(join(project, "one-shot", "PHYSICAL-TEST-INSTRUCTIONS.md"), "utf8")).toContain("cannot establish canonical SFHS physical acceptance");
  });

  it("rejects a canonical physical seed without its exact build identity", async () => {
    const project = await root(); await mkdir(join(project, "one-shot")); await writeFile(join(project, "source.txt"), "source"); await writeFile(join(project, "one-shot", "ARTIFACT.json"), JSON.stringify({ classification: "canonical", path: "dist/index.html", sha256: "a".repeat(64), bytes: 12 }));
    const sourceHash = "41cf6794ba4200b839c53531555f0f3998df4cbb01a4d5cb0b94e3ca5e23947d"; const artifactHash = "2aba7d5538a2c28320025012d2b072679f1330f31cdd42fea7051236341a3034";
    await writeFile(join(project, "one-shot", "RUN-STATE.json"), JSON.stringify({ schema: "sfhs.one-shot-run-state@1", version: 1, project: { id: "fixture", source: { path: "source.txt", sha256: sourceHash } }, classification: "IMPLEMENT", executionMode: "SFHS_NATIVE_MODE", currentGate: "PHYSICAL_SEED", completedGates: ["CONTRACT", "PHYSICAL_SEED"], failedGates: [], records: { artifact: { path: "one-shot/ARTIFACT.json", sha256: artifactHash } }, productStatus: "PRODUCT_COMPLETE", sfhsStatus: "SFHS_CANONICAL", physicalEvidence: "UNTESTED", completionPolicy: { requiredBeforeCompletion: ["CONTRACT", "PHYSICAL_SEED"], deferredHardening: [], graduationBacklog: [], releaseBacklog: [] }, nextRequiredAction: "Test", updatedAt: "2026-01-01T00:00:00.000Z" }));
    expect((await completeChatOneShot(project, join(project, "completion.json"))).findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_PHYSICAL_SEED_INVALID" })]));
  });
});
