import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { SfhsEvidenceManifest } from "@sfhs/contracts";
import { describe, expect, it } from "vitest";

import { packageIdentity, writeEvidenceRun } from "./index";

const validManifest: SfhsEvidenceManifest = {
  schema: "sfhs.evidence@1",
  run: { id: "collector-test", startedAt: "2026-07-20T22:00:00Z" },
  artifact: {
    path: "dist/index.html",
    sha256: "0".repeat(64),
    buildId: "collector-test"
  },
  commands: [{ command: "sfhs verify --json", exitCode: 0, status: "passed" }],
  environment: { node: "v24.14.0", pnpm: "11.9.0", platform: "win32-x64" },
  screenshots: [{
    path: "screenshots/portrait.png",
    sha256: "1".repeat(64),
    width: 384,
    height: 854,
    profile: "samsung-s21-ultra-portrait-emulation",
    semanticReview: "passed"
  }],
  blockers: ["SFHS_RELEASE_PHYSICAL_DEVICE_REQUIRED"],
  verdict: "blocked"
};

describe("@sfhs/evidence", () => {
  it("exposes its workspace boundary", () => {
    expect(packageIdentity).toBe("@sfhs/evidence");
  });

  it("writes only a canonical manifest inside the selected run directory", async () => {
    const parent = await mkdtemp(join(tmpdir(), "sfhs-evidence-test-"));
    const selected = join(parent, "run-001");
    try {
      const result = await writeEvidenceRun(selected, validManifest);
      expect(result.directory).toBe(selected);
      expect(result.manifestPath).toBe(join(selected, "evidence.json"));
      expect(JSON.parse(await readFile(result.manifestPath, "utf8"))).toEqual(validManifest);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("rejects unknown fields and non-dedicated output paths", async () => {
    await expect(writeEvidenceRun(".", validManifest)).rejects.toMatchObject({
      code: "SFHS_EVIDENCE_OUTPUT_INVALID"
    });
    await expect(writeEvidenceRun(join(tmpdir(), "sfhs-invalid-evidence"), {
      ...validManifest,
      rawPrompt: "must never be retained"
    } as SfhsEvidenceManifest)).rejects.toMatchObject({ code: "SFHS_EVIDENCE_INVALID" });
  });
});
