export interface SfhsProjectManifest {
  readonly schema: "sfhs.project@1";
  readonly project: {
    readonly id: string;
    readonly title: string;
    readonly version: string;
  };
  readonly adapter: SfhsProjectAdapter;
  readonly source: {
    readonly html: string;
    readonly entry: string;
    readonly styles: readonly string[];
    readonly publicDir: string;
  };
  readonly viewport: {
    readonly mode: "fixed" | "adaptive" | "fixed-contain" | "fixed-cover" | "responsive-contained-artboard";
    readonly scalePolicy?: "contain" | "cover" | "stretch" | "integer-scale";
    readonly logicalWidth: number;
    readonly logicalHeight: number;
    readonly maxDevicePixelRatio: number;
    readonly orientation: "adaptive";
  };
  readonly assets: {
    readonly manifest: string;
    readonly runtimeExternalUrls: readonly string[];
    readonly inline: "all";
    readonly maximumSingleAssetBytes: number;
  };
  readonly runtime: {
    readonly simulationHz: number;
    readonly maximumFrameDeltaMs: number;
    readonly pauseWhenHidden: boolean;
    readonly domOverlay: boolean;
  };
  readonly storage: {
    readonly localStorage: "optional" | "required" | "disabled";
    readonly exportImportFallback: boolean;
  };
  readonly build: {
    readonly output: string;
    readonly minify: boolean;
    readonly sourceMaps: "external-evidence-only";
    readonly canonicalLineEnding: "lf";
    readonly failOnExternalReference: boolean;
    readonly failOnDynamicChunk: boolean;
  };
  readonly test: {
    readonly baseURL: string;
    readonly browsers: readonly string[];
    readonly viewports: readonly string[];
    readonly screenshots: readonly string[];
    readonly fileProtocolSmoke: boolean;
  };
}

export type SfhsProjectAdapter = SfhsPixiV8ProjectAdapter | SfhsDomCanvasFabricProjectAdapter;

export interface SfhsPixiV8ProjectAdapter {
  readonly id: "pixi-v8";
  readonly versionRange: string;
  readonly renderer: {
    readonly required: "webgl";
    readonly webgpu: "disabled";
    readonly unsupportedBehavior: "show-capability-page";
  };
}

export interface SfhsDomCanvasFabricProjectAdapter {
  readonly id: "dom-canvas-fabric";
  readonly versionRange: string;
  readonly renderer: {
    readonly required: "canvas2d";
    readonly webgpu: "disabled";
    readonly unsupportedBehavior: "show-capability-page";
  };
}
