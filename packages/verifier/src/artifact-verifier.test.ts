import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildProject } from "@sfhs/builder";
import { packIntermediate } from "@sfhs/packer";
import { describe, expect, it } from "vitest";

import { verifyArtifactBytes, verifyArtifactFile } from "./artifact-verifier.ts";

const fixtureRoot = fileURLToPath(new URL("../../../examples/pixi-minimal/", import.meta.url));

function findingCodes(report: Awaited<ReturnType<typeof verifyArtifactFile>>): readonly string[] {
  return report.findings.map((finding) => finding.code);
}

interface DescriptorChange {
  readonly artifact?: {
    readonly buildId?: string;
    readonly bytes?: number;
    readonly sha256?: string;
  };
  readonly source?: { readonly sha256?: string };
}

const descriptorMismatchCases: ReadonlyArray<readonly [string, DescriptorChange, string]> = [
  ["size", { artifact: { bytes: 1 } }, "SFHS_VERIFY_SIZE_MISMATCH"],
  ["hash", { artifact: { sha256: "0".repeat(64) } }, "SFHS_VERIFY_SHA256_MISMATCH"],
  ["build ID", { artifact: { buildId: "different-build" } }, "SFHS_VERIFY_BUILD_ID_MISMATCH"],
  ["source hash", { source: { sha256: "0".repeat(64) } }, "SFHS_VERIFY_SOURCE_SHA256_MISMATCH"]
];

describe("exact artifact static verification", () => {
  it("binds the packed Pixi bytes, descriptor, metadata, inline contract, and scanner", async () => {
    const artifact = packIntermediate(await buildProject(fixtureRoot));

    const report = verifyArtifactBytes(artifact.bytes, artifact.descriptor);

    expect(report.valid).toBe(true);
    expect(report.findings).toEqual([]);
    expect(report.artifact).toEqual({
      bytes: artifact.descriptor.artifact.bytes,
      sha256: artifact.descriptor.artifact.sha256
    });
  });

  it.each(descriptorMismatchCases)("rejects a mismatched %s", async (_name, change, expectedCode) => {
    const artifact = packIntermediate(await buildProject(fixtureRoot));
    const descriptor = {
      ...artifact.descriptor,
      artifact: { ...artifact.descriptor.artifact, ...(change.artifact ?? {}) },
      source: { ...artifact.descriptor.source, ...(change.source ?? {}) }
    };

    expect(verifyArtifactBytes(artifact.bytes, descriptor).findings.map((entry) => entry.code)).toContain(expectedCode);
  });

  it("rejects invalid descriptors, missing inline markers, and external references", async () => {
    const artifact = packIntermediate(await buildProject(fixtureRoot));
    const invalidDescriptor = { ...artifact.descriptor, unexpected: true };
    const invalidHtml = artifact.html
      .replace('data-sfhs-inline="entry"', "")
      .replace("</body>", '<img src="./late.png"></body>');
    const invalidBytes = new Uint8Array(Buffer.from(invalidHtml, "utf8"));
    const invalidByteDescriptor = {
      ...artifact.descriptor,
      artifact: {
        ...artifact.descriptor.artifact,
        bytes: invalidBytes.byteLength,
        sha256: (await import("@sfhs/core")).sha256Bytes(invalidBytes)
      }
    };

    expect(verifyArtifactBytes(artifact.bytes, invalidDescriptor).findings.map((entry) => entry.code)).toContain(
      "SFHS_VERIFY_DESCRIPTOR_INVALID"
    );
    const codes = verifyArtifactBytes(invalidBytes, invalidByteDescriptor).findings.map((entry) => entry.code);
    expect(codes).toContain("SFHS_VERIFY_INLINE_ENTRY_INVALID");
    expect(codes).toContain("SFHS_SCAN_EXTERNAL_REFERENCE");
  });

  it("verifies the exact on-disk output set and rejects sidecars", async () => {
    const artifact = packIntermediate(await buildProject(fixtureRoot));
    const temporaryRoot = await mkdtemp(join(tmpdir(), "sfhs-artifact-verify-"));
    const outputDirectory = join(temporaryRoot, "dist");
    try {
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(join(outputDirectory, "index.html"), artifact.bytes);

      expect((await verifyArtifactFile(temporaryRoot, artifact.descriptor)).valid).toBe(true);
      await writeFile(join(outputDirectory, "sidecar.js"), "unexpected", "utf8");
      expect(findingCodes(await verifyArtifactFile(temporaryRoot, artifact.descriptor))).toContain(
        "SFHS_VERIFY_OUTPUT_SET_INVALID"
      );
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("returns a stable missing-artifact finding", async () => {
    const artifact = packIntermediate(await buildProject(fixtureRoot));
    const temporaryRoot = await mkdtemp(join(tmpdir(), "sfhs-artifact-missing-"));
    try {
      expect(findingCodes(await verifyArtifactFile(temporaryRoot, artifact.descriptor))).toEqual([
        "SFHS_VERIFY_ARTIFACT_MISSING"
      ]);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
