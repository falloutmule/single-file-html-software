import { describe, expect, it } from "vitest";

import { bootPixiV8CircleStage, packageIdentity, pixiV8Adapter, supportsRequiredWebGl } from "./index";

describe("@sfhs/adapter-pixi-v8", () => {
  it("exposes its workspace boundary", () => {
    expect(packageIdentity).toBe("@sfhs/adapter-pixi-v8");
  });

  it("declares Pixi v8 as WebGL-required with WebGPU disabled", () => {
    expect(pixiV8Adapter).toEqual({
      id: "pixi-v8",
      packageVersion: "8.19.0",
      requiredRenderer: "webgl",
      webgpu: "disabled"
    });
  });

  it("exposes a reusable primitive stage without project simulation", () => {
    expect(typeof bootPixiV8CircleStage).toBe("function");
  });

  it("requires a WebGL context before Pixi initialization", () => {
    let probeCount = 0;
    const webGlDocument = {
      createElement: () => {
        probeCount += 1;
        return {
          getContext: (contextId: string) => contextId === "webgl2" ? {} : null
        };
      }
    } as unknown as Pick<Document, "createElement">;
    const noWebGlDocument = {
      createElement: () => ({ getContext: () => null })
    } as unknown as Pick<Document, "createElement">;

    expect(supportsRequiredWebGl(webGlDocument)).toBe(true);
    expect(supportsRequiredWebGl(webGlDocument)).toBe(true);
    expect(probeCount).toBe(1);
    expect(supportsRequiredWebGl(noWebGlDocument)).toBe(false);
  });
});
