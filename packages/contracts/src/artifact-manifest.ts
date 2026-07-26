export interface SfhsArtifactManifest {
  readonly schema: "sfhs.artifact@1";
  readonly artifact: {
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
    readonly buildId: string;
  };
  readonly source: {
    readonly sha256: string;
    readonly revision?: string;
  };
  readonly toolchain: {
    readonly node: string;
    readonly pnpm: string;
    readonly sfhs: string;
  };
}
