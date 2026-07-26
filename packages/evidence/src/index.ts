import { mkdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

import {
  canonicalJsonStringify,
  type JsonValue,
  type SfhsEvidenceManifest,
  validateEvidenceManifest
} from "@sfhs/contracts";

export const packageIdentity = "@sfhs/evidence" as const;

export type EvidenceErrorCode =
  | "SFHS_EVIDENCE_INVALID"
  | "SFHS_EVIDENCE_OUTPUT_INVALID"
  | "SFHS_EVIDENCE_WRITE_FAILED";

export class SfhsEvidenceError extends Error {
  readonly code: EvidenceErrorCode;

  constructor(code: EvidenceErrorCode, message: string) {
    super(message);
    this.name = "SfhsEvidenceError";
    this.code = code;
  }
}

export interface EvidenceWriteResult {
  readonly directory: string;
  readonly manifestPath: string;
}

function validDirectoryArgument(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && ![".", ".."].includes(trimmed) && basename(resolve(trimmed)) !== "";
}

export async function writeEvidenceRun(
  outputDirectory: string,
  manifest: SfhsEvidenceManifest
): Promise<EvidenceWriteResult> {
  if (!validDirectoryArgument(outputDirectory)) {
    throw new SfhsEvidenceError(
      "SFHS_EVIDENCE_OUTPUT_INVALID",
      "Evidence output requires a dedicated non-root run directory."
    );
  }
  const validation = validateEvidenceManifest(manifest);
  if (!validation.valid) {
    throw new SfhsEvidenceError(
      "SFHS_EVIDENCE_INVALID",
      `Evidence manifest failed validation: ${validation.findings.map((finding) => finding.path).join(", ")}.`
    );
  }

  const selectedDirectory = resolve(outputDirectory);
  try {
    await mkdir(selectedDirectory, { recursive: true });
    const containedDirectory = await realpath(selectedDirectory);
    const manifestPath = join(containedDirectory, "evidence.json");
    const temporaryPath = join(containedDirectory, ".evidence.json.tmp");
    const serialized = `${canonicalJsonStringify(manifest as unknown as JsonValue)}\n`;
    await writeFile(temporaryPath, serialized, { encoding: "utf8", flag: "wx" });
    try {
      await rename(temporaryPath, manifestPath);
    } catch {
      await rm(manifestPath, { force: true });
      await rename(temporaryPath, manifestPath);
    }
    return Object.freeze({ directory: containedDirectory, manifestPath });
  } catch (error) {
    if (error instanceof SfhsEvidenceError) {
      throw error;
    }
    throw new SfhsEvidenceError(
      "SFHS_EVIDENCE_WRITE_FAILED",
      "Unable to write evidence inside the selected run directory."
    );
  }
}
