export interface SfhsEvidenceManifest {
  readonly schema: "sfhs.evidence@1";
  readonly run: {
    readonly id: string;
    readonly startedAt: string;
  };
  readonly artifact: {
    readonly path: string;
    readonly sha256: string;
    readonly buildId: string;
  };
  readonly commands: ReadonlyArray<{
    readonly command: string;
    readonly exitCode: number;
    readonly status: "passed" | "failed" | "skipped";
  }>;
  readonly environment?: {
    readonly node: string;
    readonly pnpm: string;
    readonly platform: string;
    readonly browser?: string;
  };
  readonly screenshots?: ReadonlyArray<{
    readonly path: string;
    readonly sha256: string;
    readonly width: number;
    readonly height: number;
    readonly profile: string;
    readonly semanticReview: "passed" | "failed" | "pending";
  }>;
  readonly blockers?: readonly string[];
  readonly verdict: "pass" | "fail" | "blocked";
}
