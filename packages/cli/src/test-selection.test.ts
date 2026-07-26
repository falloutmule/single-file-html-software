import { describe, expect, it } from "vitest";

import { selectProportionalTestPlan } from "./test-selection.ts";

function ids(paths: readonly string[], mode: "check" | "test"): readonly string[] {
  return selectProportionalTestPlan(paths, mode).steps.map((step) => step.id);
}

describe("proportional SFHS test selection", () => {
  it("selects Pixi scenarios for adapter and authored runtime checks", () => {
    expect(ids(["examples\\pixi-minimal\\src\\styles.css"], "check")).toEqual([
      "lint", "typecheck", "pixi-runtime", "browser-scenarios"
    ]);
  });

  it("selects downstream static and browser checks for contract changes", () => {
    expect(ids(["packages/contracts/src/index.ts"], "check")).toEqual([
      "lint", "typecheck", "contracts-core", "build-pack-verify", "browser-smoke"
    ]);
  });

  it("uses full units, static/build verification, one browser smoke, and review warning for unknown runtime paths", () => {
    const plan = selectProportionalTestPlan(["new-runtime/widget.ts"], "check");

    expect(plan.steps.map((step) => step.id)).toEqual([
      "lint", "typecheck", "build-pack-verify", "unit-all", "browser-smoke"
    ]);
    expect(plan.reviewRequired).toBe(true);
    expect(plan.reviewReason).toContain("new-runtime/widget.ts");
  });

  it("keeps docs-only checks proportional", () => {
    expect(ids(["docs/guide.md"], "check")).toEqual(["lint", "typecheck"]);
  });

  it("uses all unit tests and one browser smoke when no changed paths are supplied to check", () => {
    expect(ids([], "check")).toEqual(["lint", "typecheck", "unit-all", "browser-smoke"]);
  });
});
