import { sha256Bytes } from "@sfhs/core";

import {
  scanPackedBytes,
  type StaticScanFinding
} from "./scanner.ts";

export interface HtmlArtifactVerificationOptions {
  readonly allowedRuntimeUrls?: readonly string[];
}

export interface HtmlArtifactVerificationReport {
  readonly schema: "sfhs.html-artifact-verification@1";
  readonly valid: boolean;
  readonly htmlArtifact: {
    readonly bytes: number;
    readonly sha256: string;
    readonly allowedRuntimeUrls: readonly string[];
  };
  readonly findings: readonly StaticScanFinding[];
}

function normalizedRuntimeUrls(values: readonly string[] | undefined): readonly string[] {
  return Object.freeze([...new Set(values ?? [])].sort((left, right) => left.localeCompare(right)));
}

function permittedModuleReference(reference: string, allowedRuntimeUrls: ReadonlySet<string>): boolean {
  return allowedRuntimeUrls.has(reference) || /^(?:blob:|data:)/iu.test(reference);
}

export function verifyHtmlArtifactBytes(
  bytes: Uint8Array,
  options: HtmlArtifactVerificationOptions = {}
): HtmlArtifactVerificationReport {
  const allowedRuntimeUrls = normalizedRuntimeUrls(options.allowedRuntimeUrls);
  const scan = scanPackedBytes(bytes, { allowedRuntimeUrls });
  const allowedRuntimeUrlSet = new Set(allowedRuntimeUrls);
  const findings = Object.freeze(scan.findings.filter((finding) => !(
    finding.code === "SFHS_SCAN_RUNTIME_IMPORT" &&
    finding.reference !== undefined &&
    permittedModuleReference(finding.reference, allowedRuntimeUrlSet)
  )));
  return Object.freeze({
    schema: "sfhs.html-artifact-verification@1",
    valid: findings.length === 0,
    htmlArtifact: Object.freeze({
      bytes: bytes.byteLength,
      sha256: sha256Bytes(bytes),
      allowedRuntimeUrls
    }),
    findings
  });
}
