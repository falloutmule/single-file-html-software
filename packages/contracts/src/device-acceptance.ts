export interface SfhsPhysicalDeviceAcceptanceManifest {
  readonly schema: "sfhs.device-acceptance@1";
  readonly target: "samsung-galaxy-s21-ultra";
  readonly run: {
    readonly id: string;
    readonly recordedAt: string;
  };
  readonly artifact: {
    readonly path: string;
    readonly sha256: string;
    readonly buildId: string;
  };
  readonly device: {
    readonly physical: boolean;
    readonly modelIdentifier: string;
    readonly androidVersion: string;
    readonly chromeVersion: string;
  };
  readonly webgl: {
    readonly result: "supported" | "unsupported";
    readonly renderer?: string;
  };
  readonly orientations: {
    readonly portrait: SfhsPhysicalDeviceOrientationResult<"portrait">;
    readonly landscape: SfhsPhysicalDeviceOrientationResult<"landscape">;
  };
  readonly verdict: "pass" | "fail";
}

export interface SfhsPhysicalDeviceOrientationResult<Orientation extends "portrait" | "landscape"> {
  readonly orientation: Orientation;
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly devicePixelRatio: number;
  };
  readonly screenshot: string;
  readonly status: "passed" | "failed";
}
