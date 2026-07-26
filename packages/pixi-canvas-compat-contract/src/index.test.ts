import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { approximationProfiles, createContractOnlyEvidence, evaluateConformance, operationContract, supportedCanvasOperations, type ApproximationEvidence, type ExactOperationEvidence } from "./index.ts";

const exactEvidence = (): readonly ExactOperationEvidence[] => operationContract.filter((operation) => operation.disposition === "EXACT").map((operation) => ({ operation: operation.operation as ExactOperationEvidence["operation"], semanticCommandOrderMatched: true, stateStackBalanced: true, sceneScreenshotMatched: true }));

function passingApproximations(): readonly ApproximationEvidence[] {
  return approximationProfiles.flatMap((profile) => profile.affectedScenes.map((scene) => {
    if (profile.requiredParityTolerance.kind === "RASTER_GRADIENT") return { operation: profile.operation, scene, measurement: { meanRgbaDelta: 0, maximumPerChannelDelta: 0, outlierPixelRatio: 0, stopPositionDeltaLogicalPixels: 0, alphaMatched: true } } as const;
    if (profile.requiredParityTolerance.kind === "TEXT_RASTER") return { operation: profile.operation, scene, measurement: { textContentHashMatched: true, glyphBoundsDeltaLogicalPixels: 0, baselineDeltaLogicalPixels: 0, contrastRatio: 7 } } as const;
    return { operation: profile.operation, scene, measurement: { anchorDeltaLogicalPixels: 0, alignment: "center", controlsUncovered: true } } as const;
  }));
}

describe("SFHS Pixi Canvas compatibility contract", () => {
  it("covers exactly the 31 verified HOMEOSTASIS production operations", async () => {
    const report = JSON.parse(await readFile(new URL("../../../docs/evidence/sfhs-012a/homeostasis-capabilities.json", import.meta.url), "utf8")) as { operations: readonly { operation: string; productionObserved: boolean }[] };
    const analyzed = report.operations.filter((operation) => operation.productionObserved).map((operation) => operation.operation).sort();
    expect(operationContract.map((operation) => operation.operation)).toEqual([...supportedCanvasOperations].sort());
    expect([...supportedCanvasOperations].sort()).toEqual(analyzed);
  });

  it("records all five approximation candidates with testable tolerances", () => {
    expect(approximationProfiles.map((profile) => profile.operation)).toEqual(["createLinearGradient", "createRadialGradient", "fillText", "font", "textAlign"]);
    expect(approximationProfiles.every((profile) => profile.affectedScenes.length > 0 && profile.requiredChecks.length > 0)).toBe(true);
  });

  it("truthfully reports contract-only until a renderer implementation exists", () => {
    expect(evaluateConformance(createContractOnlyEvidence())).toEqual({ verdict: "CONTRACT_READY", findings: [] });
  });

  it("accepts a complete in-tolerance future conformance packet", () => {
    expect(evaluateConformance({ schema: "sfhs.pixi-canvas-conformance@1", phase: "IMPLEMENTATION_CANDIDATE", exactOperations: exactEvidence(), approximations: passingApproximations() }).verdict).toBe("CONFORMANCE_PASS");
  });

  it("blocks missing exact evidence and approximation drift", () => {
    expect(evaluateConformance({ schema: "sfhs.pixi-canvas-conformance@1", phase: "IMPLEMENTATION_CANDIDATE", exactOperations: [], approximations: [] }).verdict).toBe("BLOCKED_ON_CONTRACT_COVERAGE");
    const failed = passingApproximations().map((entry) => entry.operation === "createRadialGradient" && "meanRgbaDelta" in entry.measurement
      ? { ...entry, measurement: { ...entry.measurement, meanRgbaDelta: 4 } }
      : entry);
    expect(evaluateConformance({ schema: "sfhs.pixi-canvas-conformance@1", phase: "IMPLEMENTATION_CANDIDATE", exactOperations: exactEvidence(), approximations: failed }).verdict).toBe("BLOCKED_ON_APPROXIMATION_PARITY");
  });

  it("fails closed on duplicate or unrecognized conformance evidence", () => {
    const duplicate = exactEvidence()[0];
    expect(duplicate).toBeDefined();
    expect(evaluateConformance({ schema: "sfhs.pixi-canvas-conformance@1", phase: "IMPLEMENTATION_CANDIDATE", exactOperations: duplicate === undefined ? [] : [duplicate, duplicate], approximations: passingApproximations() }).verdict).toBe("BLOCKED_ON_CONTRACT_COVERAGE");
  });
});
