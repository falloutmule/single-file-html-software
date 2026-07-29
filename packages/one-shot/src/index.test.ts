import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { auditOneShotProject, packageIdentity, parseOneShotFrontMatter, readOneShotBrief } from "./index.ts";

const roots: string[] = [];
async function temporaryRoot(): Promise<string> { const root = await mkdtemp(join(tmpdir(), "sfhs-one-shot-")); roots.push(root); return root; }
async function packet(root: string, name: string, value: unknown): Promise<void> { await mkdir(join(root, "one-shot"), { recursive: true }); await writeFile(join(root, "one-shot", name), `---\n${JSON.stringify(value)}\n---\n`, "utf8"); }
const brief = { schema: "sfhs.one-shot-brief@1", project: { id: "test-game", title: "Test Game" }, lane: { id: "pixi-v8" }, target: { device: "samsung-galaxy-s21-ultra", orientation: "adaptive" }, status: "PROPOSED" };

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
    for (const name of ["ONE-SHOT-BRIEF.md", "AUTHORIZED-SCOPE.md", "DECISIONS.md", "ISSUES-ENCOUNTERED.md", "ACCEPTANCE-CRITERIA.md"]) await packet(root, name, { status: "PROPOSED" });
    await packet(root, "INTAKE-STATUS.md", { status: "PROPOSED", facts: { adapterIntegration: { status: "REPORTED", evidence: [] } } });
    await packet(root, "VERIFICATION-REPORT.md", { status: "VERIFIED", facts: { artifact: { classification: "canonical" } } });
    const audited = await auditOneShotProject(root, { canonicalVerified: false });
    expect(audited.valid).toBe(false);
    expect(audited.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_CANONICAL_EVIDENCE_REQUIRED" })]));
  });

  it("rejects a verified adapter-integration claim without retained evidence", async () => {
    const root = await temporaryRoot();
    for (const name of ["ONE-SHOT-BRIEF.md", "AUTHORIZED-SCOPE.md", "DECISIONS.md", "ISSUES-ENCOUNTERED.md", "ACCEPTANCE-CRITERIA.md", "VERIFICATION-REPORT.md"]) await packet(root, name, { status: "PROPOSED", facts: { artifact: { classification: "candidate" } } });
    await packet(root, "INTAKE-STATUS.md", { status: "VERIFIED", facts: { adapterIntegration: { status: "VERIFIED", evidence: [] } } });
    const audited = await auditOneShotProject(root, { canonicalVerified: false });
    expect(audited.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_ADAPTER_EVIDENCE_REQUIRED" })]));
  });

  it("rejects a physical-acceptance claim without exact device evidence", async () => {
    const root = await temporaryRoot();
    for (const name of ["ONE-SHOT-BRIEF.md", "AUTHORIZED-SCOPE.md", "DECISIONS.md", "ISSUES-ENCOUNTERED.md", "ACCEPTANCE-CRITERIA.md", "VERIFICATION-REPORT.md"]) await packet(root, name, { status: "PROPOSED", facts: { artifact: { classification: "candidate" }, physicalDevice: "VERIFIED" } });
    await packet(root, "INTAKE-STATUS.md", { status: "PROPOSED", facts: { adapterIntegration: { status: "REPORTED", evidence: [] } } });
    const audited = await auditOneShotProject(root, { canonicalVerified: false });
    expect(audited.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SFHS_ONE_SHOT_PHYSICAL_EVIDENCE_REQUIRED" })]));
  });

  it("keeps packet files inspectable as normal Markdown", async () => {
    const root = await temporaryRoot();
    const path = join(root, "brief.md");
    await writeFile(path, `---\n${JSON.stringify(brief)}\n---\n# Player-facing brief\n`, "utf8");
    await expect(readOneShotBrief(path)).resolves.toMatchObject({ project: { id: "test-game" } });
    expect(await readFile(path, "utf8")).toContain("Player-facing brief");
  });
});
