import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { SfhsArtifactManifest } from "@sfhs/contracts";
import { sha256Bytes } from "@sfhs/core";
import { describe, expect, it } from "vitest";

import { verifyArtifactBytes } from "./artifact-verifier.ts";

interface NegativeArtifactCase {
  readonly file: string;
  readonly expectedCode: string;
}

interface NegativeArtifactManifest {
  readonly schema: "sfhs.negative-artifacts@1";
  readonly cases: readonly NegativeArtifactCase[];
}

const fixtureDirectory = fileURLToPath(
  new URL("../../../fixtures/invalid/artifacts/", import.meta.url)
);
const manifest = JSON.parse(
  await readFile(join(fixtureDirectory, "manifest.json"), "utf8")
) as NegativeArtifactManifest;
const sourceSha256 = "1".repeat(64);

function descriptorFor(bytes: Uint8Array): SfhsArtifactManifest {
  return {
    schema: "sfhs.artifact@1",
    artifact: {
      path: "dist/index.html",
      bytes: bytes.byteLength,
      sha256: sha256Bytes(bytes),
      buildId: "negative-fixture"
    },
    source: { sha256: sourceSha256 },
    toolchain: { node: "v24.14.0", pnpm: "11.9.0", sfhs: "0.1.0" }
  };
}

describe("checked-in negative artifact fixtures", () => {
  it("uses a versioned manifest with unique files", () => {
    expect(manifest.schema).toBe("sfhs.negative-artifacts@1");
    expect(new Set(manifest.cases.map((entry) => entry.file)).size).toBe(manifest.cases.length);
  });

  it.each(manifest.cases)("rejects $file with $expectedCode", async ({ file, expectedCode }) => {
    expect(dirname(file)).toBe(".");
    const bytes = new Uint8Array(await readFile(join(fixtureDirectory, file)));

    const report = verifyArtifactBytes(bytes, descriptorFor(bytes));

    expect(report.valid).toBe(false);
    expect(report.findings.map((finding) => finding.code)).toContain(expectedCode);
  });
});
