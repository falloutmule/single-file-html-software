import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { auditOneShotProject, buildOneShotKit, packageIdentity, parseOneShotFrontMatter, readOneShotBrief } from "./index.ts";

const roots: string[] = [];
async function temporaryRoot(): Promise<string> { const root = await mkdtemp(join(tmpdir(), "sfhs-one-shot-")); roots.push(root); return root; }
async function packet(root: string, name: string, value: unknown): Promise<void> { await mkdir(join(root, "one-shot"), { recursive: true }); await writeFile(join(root, "one-shot", name), `---\n${JSON.stringify(value)}\n---\n`, "utf8"); }
const brief = { schema: "sfhs.one-shot-brief@1", project: { id: "test-game", title: "Test Game" }, lane: { id: "pixi-v8" }, target: { device: "samsung-galaxy-s21-ultra", orientation: "adaptive" }, status: "PROPOSED" };
const validPackets = {
  "ONE-SHOT-BRIEF.md": brief,
  "AUTHORIZED-SCOPE.md": { schema: "sfhs.one-shot-scope@1", status: "PROPOSED", facts: { sfhsRevision: "test", lane: "pixi-v8", remoteMutationAuthorized: false } },
  "DECISIONS.md": { schema: "sfhs.one-shot-decision-log@1", status: "PROPOSED", facts: { decisions: [] } },
  "ISSUES-ENCOUNTERED.md": { schema: "sfhs.one-shot-issue-log@1", status: "PROPOSED", facts: { issues: [] } },
  "ACCEPTANCE-CRITERIA.md": { schema: "sfhs.one-shot-acceptance@1", status: "PROPOSED", facts: { physicalDevice: "UNTESTED" } },
  "INTAKE-STATUS.md": { schema: "sfhs.one-shot-intake@1", status: "PROPOSED", facts: { adapterIntegration: { status: "REPORTED", evidence: [] }, physicalDevice: "UNTESTED" } },
  "VERIFICATION-REPORT.md": { schema: "sfhs.one-shot-report@1", status: "UNTESTED", facts: { artifact: { classification: "none" }, physicalDevice: "UNTESTED" } },
};
async function validPacketSet(root: string, overrides: Record<string, unknown> = {}): Promise<void> {
  for (const [name, value] of Object.entries({ ...validPackets, ...overrides })) await packet(root, name, value);
}

afterEach(async () => { await Promise.all(roots.splice(0).map(async (root) => rm(root, { recursive: true, force: true }))); });

describe("@sfhs/one-shot", () => {
  it("exposes its package identity and parses packet JSON front matter", () => {
    expect(packageIdentity).toBe("@sfhs/one-shot");
    expect(parseOneShotFrontMatter(`---\n${JSON.stringify(brief)}\n---\nbody`)).toEqual(brief);
  });

  it("rejects an incomplete brief", async () => {
    const root = await temporaryRoot();
    const path = join(root, "brief.md");
    await writeFile(path, "# no front matter\n", "utf8");
    await expect(readOneShotBrief(path)).rejects.toThrow("SFHS_ONE_SHOT_BRIEF_INVALID");
  });

  it("fails an overstated canonical claim without real verifier evidence", async () => {
    const root = await temporaryRoot();
    await validPacketSet(root, { "VERIFICATION-REPORT.md": { schema: "sfhs.one-shot-report@1", status: "VERIFIED", facts: { artifact: { classification: "canonical", path: "dist/index.html", sha256: "a".repeat(64), buildId: "test" }, physicalDevice: "UNTESTED" } } });
    const audited = await auditOneShotProject(root, {});
    expect(audited.valid).toBe(false);
    expect(audited.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_CANONICAL_EVIDENCE_REQUIRED" })]));
  });

  it("rejects a verified adapter-integration claim without retained evidence", async () => {
    const root = await temporaryRoot();
    await validPacketSet(root, { "INTAKE-STATUS.md": { schema: "sfhs.one-shot-intake@1", status: "VERIFIED", facts: { adapterIntegration: { status: "VERIFIED", evidence: [] }, physicalDevice: "UNTESTED" } } });
    const audited = await auditOneShotProject(root, {});
    expect(audited.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_ADAPTER_EVIDENCE_REQUIRED" })]));
  });

  it("rejects a physical-acceptance claim without exact device evidence", async () => {
    const root = await temporaryRoot();
    await validPacketSet(root, { "ACCEPTANCE-CRITERIA.md": { schema: "sfhs.one-shot-acceptance@1", status: "PROPOSED", facts: { physicalDevice: "VERIFIED" } } });
    const audited = await auditOneShotProject(root, {});
    expect(audited.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_PHYSICAL_EVIDENCE_REQUIRED" })]));
  });

  it("rejects a canonical report whose verifier identity does not match", async () => {
    const root = await temporaryRoot();
    await validPacketSet(root, { "VERIFICATION-REPORT.md": { schema: "sfhs.one-shot-report@1", status: "VERIFIED", facts: { artifact: { classification: "canonical", path: "dist/index.html", sha256: "a".repeat(64), buildId: "reported-build" }, physicalDevice: "UNTESTED" } } });
    const audited = await auditOneShotProject(root, { canonicalArtifact: { path: "dist/index.html", sha256: "b".repeat(64), buildId: "verified-build" } });
    expect(audited.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_CANONICAL_EVIDENCE_REQUIRED" })]));
  });

  it("accepts a canonical report only when it matches the exact verifier identity", async () => {
    const root = await temporaryRoot();
    const artifact = { path: "dist/index.html", sha256: "a".repeat(64), buildId: "verified-build" };
    await validPacketSet(root, { "VERIFICATION-REPORT.md": { schema: "sfhs.one-shot-report@1", status: "VERIFIED", facts: { artifact: { classification: "canonical", ...artifact }, physicalDevice: "UNTESTED" } } });
    const audited = await auditOneShotProject(root, { canonicalArtifact: artifact });
    expect(audited.findings).not.toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_CANONICAL_EVIDENCE_REQUIRED" })]));
  });

  it("rejects packet front matter that omits required machine facts", async () => {
    const root = await temporaryRoot();
    await validPacketSet(root, { "AUTHORIZED-SCOPE.md": { schema: "sfhs.one-shot-scope@1", status: "PROPOSED", facts: {} } });
    const audited = await auditOneShotProject(root, {});
    expect(audited.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_PACKET_INVALID", path: "one-shot/AUTHORIZED-SCOPE.md" })]));
  });

  it("keeps packet files inspectable as normal Markdown", async () => {
    const root = await temporaryRoot();
    const path = join(root, "brief.md");
    await writeFile(path, `---\n${JSON.stringify(brief)}\n---\n# Player-facing brief\n`, "utf8");
    await expect(readOneShotBrief(path)).resolves.toMatchObject({ project: { id: "test-game" } });
    expect(await readFile(path, "utf8")).toContain("Player-facing brief");
  });

  it("builds a bound chat kit without claiming a portable compiler", async () => {
    const root = await temporaryRoot(); const target = join(root, "sfhs-chat-build-kit.json");
    expect((await buildOneShotKit(target, { revision: "a".repeat(40), stage: "chat-build" })).valid).toBe(true);
    const kit = JSON.parse(await readFile(target, "utf8"));
    expect(kit).toMatchObject({ stage: "chat-build", candidateRuntime: { path: "sfhs-chat-candidate-runtime.zip", candidateCompiler: "UNAVAILABLE" } });
    const runtime = await readFile(join(root, "sfhs-chat-candidate-runtime.zip"));
    expect([...runtime.subarray(0, 4)]).toEqual([80, 75, 3, 4]);
    expect(JSON.parse(await readFile(join(root, "sfhs-chat-candidate-runtime.json"), "utf8"))).toMatchObject({ candidateCompiler: { state: "UNAVAILABLE" } });
  });
});
