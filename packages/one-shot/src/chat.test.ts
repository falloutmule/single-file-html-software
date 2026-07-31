import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { selectChatMode, stableJson, validateChatRunState } from "./chat.ts";

const roots: string[] = [];
async function root(): Promise<string> { const value = await mkdtemp(join(tmpdir(), "sfhs-chat-")); roots.push(value); return value; }
afterEach(async () => { await Promise.all(roots.splice(0).map((value) => rm(value, { recursive: true, force: true }))); });

describe("Chat One-Shot protocol v2", () => {
  it("does not confuse a PATH Node 22 with a candidate-capable environment", () => {
    expect(selectChatMode({ sfhsCheckout: { state: "UNAVAILABLE", detail: "missing" }, pnpm: { state: "UNAVAILABLE", detail: "missing" }, template: { state: "UNAVAILABLE", detail: "missing" }, adapter: { state: "UNAVAILABLE", detail: "missing" }, runtime: { state: "UNAVAILABLE", detail: "missing" }, canonicalCli: { state: "UNAVAILABLE", detail: "missing" }, browserRunner: { state: "UNAVAILABLE", detail: "missing" }, candidateRuntime: { state: "AVAILABLE", detail: "pinned" }, chromium: { state: "AVAILABLE", detail: "available" } }).mode).toBe("CHAT_CANDIDATE_MODE");
  });

  it("uses source-only mode when the candidate runtime is absent", () => {
    expect(selectChatMode({ candidateRuntime: { state: "UNAVAILABLE", detail: "missing" }, chromium: { state: "AVAILABLE", detail: "available" } }).mode).toBe("SOURCE_ONLY_MODE");
  });

  it("serializes record keys deterministically", () => {
    expect(stableJson({ z: 1, a: { y: 2, b: 3 } })).toBe('{\n  "a": {\n    "b": 3,\n    "y": 2\n  },\n  "z": 1\n}\n');
  });

  it("rejects stale run-state source references", async () => {
    const project = await root(); await mkdir(join(project, "one-shot")); await writeFile(join(project, "source.txt"), "changed");
    await writeFile(join(project, "one-shot", "RUN-STATE.json"), JSON.stringify({ schema: "sfhs.one-shot-run-state@1", version: 1, project: { id: "fixture", source: { path: "source.txt", sha256: "0".repeat(64) } }, classification: "IMPLEMENT", executionMode: "SOURCE_ONLY_MODE", currentGate: "CONTRACT", completedGates: [], failedGates: [], records: { source: { path: "source.txt", sha256: "0".repeat(64) } }, productStatus: "PRODUCT_INCOMPLETE", sfhsStatus: "SFHS_SOURCE_ONLY", physicalEvidence: "UNTESTED", completionPolicy: { requiredBeforeCompletion: ["CONTRACT"], deferredHardening: [], graduationBacklog: [], releaseBacklog: [] }, nextRequiredAction: "Fix hash", updatedAt: "2026-01-01T00:00:00.000Z" }));
    expect((await validateChatRunState(project)).findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_RUN_STATE_HASH_MISMATCH" })]));
  });
});
