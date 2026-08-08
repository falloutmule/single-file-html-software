import { describe, expect, it } from "vitest";

import { domInteractiveAdapter, packageIdentity } from "./index.ts";

describe("@sfhs/adapter-dom-interactive", () => {
  it("declares a framework- and renderer-neutral DOM lane", () => {
    expect(packageIdentity).toBe("@sfhs/adapter-dom-interactive");
    expect(domInteractiveAdapter).toMatchObject({
      id: "dom-interactive",
      requiredRenderer: "none",
      simulationLoop: "application-owned"
    });
  });
});
