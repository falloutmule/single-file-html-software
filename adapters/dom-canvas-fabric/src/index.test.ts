import { describe, expect, it } from "vitest";

import { domCanvasFabricAdapter, packageIdentity } from "./index.ts";

describe("@sfhs/adapter-dom-canvas-fabric", () => {
  it("declares the Canvas 2D editor lane", () => {
    expect(packageIdentity).toBe("@sfhs/adapter-dom-canvas-fabric");
    expect(domCanvasFabricAdapter).toMatchObject({
      id: "dom-canvas-fabric",
      requiredRenderer: "canvas2d",
      simulationLoop: "not-required"
    });
  });
});
