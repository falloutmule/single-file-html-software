export const packageIdentity = "@sfhs/verifier" as const;

export {
  scanPackedBytes,
  scanPackedHtml,
  type StaticScanFinding,
  type StaticScanFindingCode,
  type StaticScanOptions,
  type StaticScanReport,
  type StaticScanSurface
} from "./scanner.ts";

export {
  verifyArtifactBytes,
  verifyArtifactFile,
  type ArtifactVerificationFinding,
  type ArtifactVerificationFindingCode,
  type ArtifactVerificationReport
} from "./artifact-verifier.ts";
