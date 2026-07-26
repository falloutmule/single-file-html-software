export const packageIdentity = "@sfhs/pixi-canvas-compat-contract" as const;
export const contractSchema = "sfhs.pixi-canvas-compat@1" as const;

export const homeostasisScenes = [
  "bacterial-cluster", "biofilm-nidus", "damaged-tissue", "failure-result", "normal-engage", "pause",
  "repairing-tissue", "resolve-activation", "resolve-stabilization", "storm-engage", "title", "upgrade-selection", "victory-result"
] as const;
export type HomeostasisScene = typeof homeostasisScenes[number];

export const supportedCanvasOperations = [
  "addColorStop", "arc", "beginPath", "closePath", "createLinearGradient", "createRadialGradient", "drawImage", "ellipse", "fill", "fillRect", "fillStyle", "fillText", "font", "globalAlpha", "globalCompositeOperation", "imageSmoothingEnabled", "lineCap", "lineTo", "lineWidth", "moveTo", "quadraticCurveTo", "restore", "rotate", "save", "scale", "setTransform", "stroke", "strokeRect", "strokeStyle", "textAlign", "translate"
] as const;
export type SupportedCanvasOperation = typeof supportedCanvasOperations[number];
export type CompatibilityDisposition = "EXACT" | "APPROXIMATION";

export interface RasterGradientTolerance {
  readonly kind: "RASTER_GRADIENT";
  readonly maximumMeanRgbaDelta: number;
  readonly maximumPerChannelDelta: number;
  readonly maximumOutlierPixelRatio: number;
  readonly maximumStopPositionDeltaLogicalPixels: number;
  readonly alphaMustMatch: true;
}

export interface TextRasterTolerance {
  readonly kind: "TEXT_RASTER";
  readonly maximumGlyphBoundsDeltaLogicalPixels: number;
  readonly maximumBaselineDeltaLogicalPixels: number;
  readonly minimumContrastRatio: number;
  readonly textContentHashMustMatch: true;
}

export interface TextAnchorTolerance {
  readonly kind: "TEXT_ANCHOR";
  readonly maximumAnchorDeltaLogicalPixels: number;
  readonly alignmentMustMatch: "center";
  readonly controlsMustRemainUncovered: true;
}

export type ApproximationTolerance = RasterGradientTolerance | TextRasterTolerance | TextAnchorTolerance;

export interface ApproximationProfile {
  readonly operation: "createLinearGradient" | "createRadialGradient" | "fillText" | "font" | "textAlign";
  readonly exactCanvasBehavior: string;
  readonly proposedPixiBehavior: string;
  readonly expectedVisualDifference: string;
  readonly affectedScenes: readonly HomeostasisScene[];
  readonly requiredParityTolerance: ApproximationTolerance;
  readonly requiredChecks: readonly string[];
  readonly blocksOnFailure: string;
}

export interface OperationContract {
  readonly operation: SupportedCanvasOperation;
  readonly disposition: CompatibilityDisposition;
  readonly exactCanvasBehavior: string;
  readonly proposedPixiBehavior: string;
  readonly affectedScenes: readonly HomeostasisScene[];
  readonly requiredChecks: readonly string[];
}

const everyScene = homeostasisScenes;
const sceneSet = (...scenes: HomeostasisScene[]): readonly HomeostasisScene[] => Object.freeze(scenes);
const exact = (
  operation: Exclude<SupportedCanvasOperation, ApproximationProfile["operation"]>,
  exactCanvasBehavior: string,
  proposedPixiBehavior: string,
  affectedScenes: readonly HomeostasisScene[] = everyScene,
  requiredChecks: readonly string[] = ["semantic-command-order", "state-stack", "scene-screenshot"]
): OperationContract => Object.freeze({ operation, disposition: "EXACT", exactCanvasBehavior, proposedPixiBehavior, affectedScenes, requiredChecks });

export const approximationProfiles: readonly ApproximationProfile[] = Object.freeze([
  Object.freeze({
    operation: "createLinearGradient",
    exactCanvasBehavior: "Canvas creates a gradient in the current user space; addColorStop positions colors on its start-to-end axis before the gradient is used as a paint style.",
    proposedPixiBehavior: "Create or reuse a declared, content-addressed Pixi gradient texture (or an approved shader) with the same axis, stops, transform, and alpha; do not create it per frame.",
    expectedVisualDifference: "Color interpolation and anti-aliased stop edges can differ by renderer and color pipeline; geometry, stop order, alpha, and gradient axis may not change.",
    affectedScenes: sceneSet("title"),
    requiredParityTolerance: Object.freeze({ kind: "RASTER_GRADIENT", maximumMeanRgbaDelta: 2, maximumPerChannelDelta: 12, maximumOutlierPixelRatio: 0.005, maximumStopPositionDeltaLogicalPixels: 0.5, alphaMustMatch: true }),
    requiredChecks: Object.freeze(["title-gradient-region", "gradient-stop-positions", "alpha-mask", "control-hit-test"]),
    blocksOnFailure: "BLOCKED_ON_APPROXIMATION_PARITY"
  }),
  Object.freeze({
    operation: "createRadialGradient",
    exactCanvasBehavior: "Canvas creates a radial gradient from two circles in the current user space; addColorStop positions colors along the radial interpolation before it is used as a paint style.",
    proposedPixiBehavior: "Create or reuse a declared Pixi radial-gradient texture (or approved shader) with matching circles, stops, transform, clipping, and alpha; cache by normalized gradient inputs.",
    expectedVisualDifference: "Subpixel circle coverage, interpolation, and anti-aliased radial edges can differ; the center, radii, opacity, and visual extent may not drift.",
    affectedScenes: everyScene,
    requiredParityTolerance: Object.freeze({ kind: "RASTER_GRADIENT", maximumMeanRgbaDelta: 3, maximumPerChannelDelta: 16, maximumOutlierPixelRatio: 0.01, maximumStopPositionDeltaLogicalPixels: 0.5, alphaMustMatch: true }),
    requiredChecks: Object.freeze(["all-scene-radial-regions", "gradient-center-and-radius", "alpha-mask", "semantic-effect-presence"]),
    blocksOnFailure: "BLOCKED_ON_APPROXIMATION_PARITY"
  }),
  Object.freeze({
    operation: "fillText",
    exactCanvasBehavior: "Canvas paints the supplied text at the current transformed origin using the active font, fill style, alpha, and text alignment. HOMEOSTASIS observed one 23-character victory-result string.",
    proposedPixiBehavior: "Use Pixi Text with the declared packaged/system font policy, matching content, fill, alpha, transform, and baseline placement; text must remain presentation-only.",
    expectedVisualDifference: "Glyph hinting, kerning, and anti-aliasing may differ between Canvas text and Pixi text, but the content, result meaning, bounds, baseline, and contrast must remain readable.",
    affectedScenes: sceneSet("victory-result"),
    requiredParityTolerance: Object.freeze({ kind: "TEXT_RASTER", maximumGlyphBoundsDeltaLogicalPixels: 1, maximumBaselineDeltaLogicalPixels: 1, minimumContrastRatio: 4.5, textContentHashMustMatch: true }),
    requiredChecks: Object.freeze(["victory-text-content-hash", "victory-glyph-bounds", "victory-baseline", "victory-contrast"]),
    blocksOnFailure: "BLOCKED_ON_APPROXIMATION_PARITY"
  }),
  Object.freeze({
    operation: "font",
    exactCanvasBehavior: "Canvas applies the CSS font shorthand `700 16px system-ui` to subsequent text. The observed use is limited to the victory-result text path.",
    proposedPixiBehavior: "Map the shorthand to Pixi Text style: 700 weight, 16 logical-pixel size, and the SFHS-approved system/packaged fallback chain; no remote font loading is allowed.",
    expectedVisualDifference: "The browser may rasterize the same system font differently through Pixi; glyph shape can vary slightly but weight, size, content bounds, baseline, and contrast must stay within tolerance.",
    affectedScenes: sceneSet("victory-result"),
    requiredParityTolerance: Object.freeze({ kind: "TEXT_RASTER", maximumGlyphBoundsDeltaLogicalPixels: 1, maximumBaselineDeltaLogicalPixels: 1, minimumContrastRatio: 4.5, textContentHashMustMatch: true }),
    requiredChecks: Object.freeze(["font-policy", "victory-glyph-bounds", "victory-baseline", "victory-contrast"]),
    blocksOnFailure: "BLOCKED_ON_APPROXIMATION_PARITY"
  }),
  Object.freeze({
    operation: "textAlign",
    exactCanvasBehavior: "Canvas sets `textAlign` to `center`, placing the horizontal midpoint of the victory-result text at its transformed x coordinate.",
    proposedPixiBehavior: "Set the Pixi Text horizontal anchor to 0.5 and place that anchor at the same logical transformed x coordinate; do not move a DOM or Pixi control target.",
    expectedVisualDifference: "No meaningful alignment difference is allowed. Fractional glyph bounds can differ, but the center anchor and uncovered controls must remain stable.",
    affectedScenes: sceneSet("victory-result"),
    requiredParityTolerance: Object.freeze({ kind: "TEXT_ANCHOR", maximumAnchorDeltaLogicalPixels: 0.5, alignmentMustMatch: "center", controlsMustRemainUncovered: true }),
    requiredChecks: Object.freeze(["victory-center-anchor", "victory-control-hit-test", "victory-no-overlap"]),
    blocksOnFailure: "BLOCKED_ON_APPROXIMATION_PARITY"
  })
]);

export const operationContract: readonly OperationContract[] = Object.freeze([
  exact("addColorStop", "Canvas appends a color stop to the active gradient in call order.", "Retain ordered stops in the gradient descriptor before cached texture/shader creation."),
  exact("arc", "Canvas adds a circular arc to the current path using the active transform.", "Emit a Pixi Graphics arc command in the same command order and transform."),
  exact("beginPath", "Canvas clears the current path without changing paint state.", "Begin a new compatibility path buffer without resetting saved state."),
  exact("closePath", "Canvas closes the current subpath before fill or stroke.", "Close the matching Pixi Graphics subpath."),
  ...approximationProfiles.map((profile) => Object.freeze({ operation: profile.operation, disposition: "APPROXIMATION" as const, exactCanvasBehavior: profile.exactCanvasBehavior, proposedPixiBehavior: profile.proposedPixiBehavior, affectedScenes: profile.affectedScenes, requiredChecks: profile.requiredChecks })),
  exact("drawImage", "Canvas draws the observed generated HTMLCanvasElement texture with the active transform and alpha.", "Resolve a declared texture-registry ID and draw a Pixi Sprite with equivalent source/destination geometry; cache generated textures."),
  exact("ellipse", "Canvas adds an ellipse to the current path using the active transform.", "Emit an equivalent Pixi Graphics ellipse command."),
  exact("fill", "Canvas fills the current path using the current fill style and alpha.", "Commit the compatibility path to Pixi Graphics with the captured fill state."),
  exact("fillRect", "Canvas fills an axis-aligned rectangle in current user space.", "Emit an equivalent Pixi Graphics rectangle and fill command."),
  exact("fillStyle", "Canvas changes the fill paint for later fill operations.", "Capture a normalized color or approved gradient descriptor in compatibility state."),
  exact("globalAlpha", "Canvas multiplies later paint alpha by the current alpha value.", "Carry normalized alpha through command state and apply it once to the Pixi object or command."),
  exact("globalCompositeOperation", "HOMEOSTASIS observed `multiply`; Canvas composites later drawing with that blend mode.", "Accept only the observed `multiply` mapping through the approved Pixi blend table; reject any unlisted mode." , sceneSet("title"), ["observed-blend-mode", "blend-screenshot"]),
  exact("imageSmoothingEnabled", "HOMEOSTASIS sets the Canvas image-smoothing flag for generated texture draws.", "Set the declared Pixi texture sampling mode before sprite presentation." , sceneSet("title"), ["sampling-mode", "texture-screenshot"]),
  exact("lineCap", "Canvas sets the stroke cap style; HOMEOSTASIS observed `round`.", "Map only the observed round cap to the Pixi stroke command." , sceneSet("failure-result", "normal-engage"), ["observed-line-cap", "stroke-screenshot"]),
  exact("lineTo", "Canvas appends a line segment to the current path.", "Append the equivalent segment to the compatibility path buffer."),
  exact("lineWidth", "Canvas sets stroke width in current user-space units.", "Capture width in compatibility state and apply it to the Pixi stroke."),
  exact("moveTo", "Canvas begins a subpath at the transformed coordinate.", "Move the compatibility path cursor to the equivalent coordinate."),
  exact("quadraticCurveTo", "Canvas appends a quadratic Bezier segment to the current path.", "Append the equivalent Pixi Graphics quadratic curve." , sceneSet("failure-result", "normal-engage", "title")),
  exact("restore", "Canvas restores the most recently saved complete drawing state; unmatched restore is a no-op in Canvas and is forbidden by SFHS command validation.", "Pop the compatibility state stack and fail conformance on stack underflow."),
  exact("rotate", "Canvas post-multiplies the current transform by a rotation.", "Post-multiply the compatibility transform with the same radians."),
  exact("save", "Canvas pushes the complete drawing state, including transform and paint attributes.", "Push an immutable compatibility state snapshot."),
  exact("scale", "Canvas post-multiplies the current transform by scale factors.", "Post-multiply the compatibility transform with the same factors." , sceneSet("bacterial-cluster", "biofilm-nidus", "damaged-tissue", "failure-result", "normal-engage", "pause", "repairing-tissue", "resolve-activation", "resolve-stabilization", "storm-engage", "upgrade-selection", "victory-result")),
  exact("setTransform", "Canvas replaces the current transform with the supplied matrix.", "Replace the compatibility transform matrix exactly."),
  exact("stroke", "Canvas strokes the current path using current stroke state and alpha.", "Commit the compatibility path to Pixi Graphics with captured stroke state."),
  exact("strokeRect", "Canvas strokes an axis-aligned rectangle with current stroke state.", "Emit an equivalent Pixi Graphics rectangle stroke."),
  exact("strokeStyle", "Canvas changes the stroke paint for later stroke operations.", "Capture a normalized solid color in compatibility state."),
  exact("translate", "Canvas post-multiplies the current transform by translation.", "Post-multiply the compatibility transform with the same offsets.")
].sort((left, right) => left.operation.localeCompare(right.operation)));

export interface ExactOperationEvidence {
  readonly operation: Exclude<SupportedCanvasOperation, ApproximationProfile["operation"]>;
  readonly semanticCommandOrderMatched: boolean;
  readonly stateStackBalanced: boolean;
  readonly sceneScreenshotMatched: boolean;
}

export interface RasterGradientMeasurement {
  readonly meanRgbaDelta: number;
  readonly maximumPerChannelDelta: number;
  readonly outlierPixelRatio: number;
  readonly stopPositionDeltaLogicalPixels: number;
  readonly alphaMatched: boolean;
}

export interface TextRasterMeasurement {
  readonly textContentHashMatched: boolean;
  readonly glyphBoundsDeltaLogicalPixels: number;
  readonly baselineDeltaLogicalPixels: number;
  readonly contrastRatio: number;
}

export interface TextAnchorMeasurement {
  readonly anchorDeltaLogicalPixels: number;
  readonly alignment: "center" | "left" | "right";
  readonly controlsUncovered: boolean;
}

export interface ApproximationEvidence {
  readonly operation: ApproximationProfile["operation"];
  readonly scene: HomeostasisScene;
  readonly measurement: RasterGradientMeasurement | TextRasterMeasurement | TextAnchorMeasurement;
}

export interface SfhsPixiCanvasConformanceEvidence {
  readonly schema: "sfhs.pixi-canvas-conformance@1";
  readonly phase: "CONTRACT_ONLY" | "IMPLEMENTATION_CANDIDATE";
  readonly exactOperations: readonly ExactOperationEvidence[];
  readonly approximations: readonly ApproximationEvidence[];
}

export type ConformanceVerdict = "CONTRACT_READY" | "CONFORMANCE_PASS" | "BLOCKED_ON_CONTRACT_COVERAGE" | "BLOCKED_ON_APPROXIMATION_PARITY";
export interface ConformanceResult {
  readonly verdict: ConformanceVerdict;
  readonly findings: readonly string[];
}

function approximationPasses(profile: ApproximationProfile, evidence: ApproximationEvidence): boolean {
  const tolerance = profile.requiredParityTolerance;
  if (tolerance.kind === "RASTER_GRADIENT" && "meanRgbaDelta" in evidence.measurement) return evidence.measurement.meanRgbaDelta <= tolerance.maximumMeanRgbaDelta && evidence.measurement.maximumPerChannelDelta <= tolerance.maximumPerChannelDelta && evidence.measurement.outlierPixelRatio <= tolerance.maximumOutlierPixelRatio && evidence.measurement.stopPositionDeltaLogicalPixels <= tolerance.maximumStopPositionDeltaLogicalPixels && evidence.measurement.alphaMatched;
  if (tolerance.kind === "TEXT_RASTER" && "glyphBoundsDeltaLogicalPixels" in evidence.measurement) return evidence.measurement.textContentHashMatched && evidence.measurement.glyphBoundsDeltaLogicalPixels <= tolerance.maximumGlyphBoundsDeltaLogicalPixels && evidence.measurement.baselineDeltaLogicalPixels <= tolerance.maximumBaselineDeltaLogicalPixels && evidence.measurement.contrastRatio >= tolerance.minimumContrastRatio;
  if (tolerance.kind === "TEXT_ANCHOR" && "anchorDeltaLogicalPixels" in evidence.measurement) return evidence.measurement.anchorDeltaLogicalPixels <= tolerance.maximumAnchorDeltaLogicalPixels && evidence.measurement.alignment === tolerance.alignmentMustMatch && evidence.measurement.controlsUncovered;
  return false;
}

export function evaluateConformance(evidence: SfhsPixiCanvasConformanceEvidence): ConformanceResult {
  if (evidence.phase === "CONTRACT_ONLY") {
    if (evidence.exactOperations.length === 0 && evidence.approximations.length === 0) return Object.freeze({ verdict: "CONTRACT_READY", findings: Object.freeze([]) });
    return Object.freeze({ verdict: "BLOCKED_ON_CONTRACT_COVERAGE", findings: Object.freeze(["CONTRACT_ONLY evidence must not claim renderer conformance."]) });
  }
  const findings: string[] = [];
  const exactExpected = operationContract.filter((operation) => operation.disposition === "EXACT").map((operation) => operation.operation);
  for (const candidate of evidence.exactOperations) {
    if (!exactExpected.includes(candidate.operation)) findings.push(`Unrecognized exact-operation evidence: ${candidate.operation}.`);
    else if (evidence.exactOperations.filter((entry) => entry.operation === candidate.operation).length !== 1) findings.push(`Duplicate exact-operation evidence: ${candidate.operation}.`);
  }
  for (const operation of exactExpected) {
    const candidate = evidence.exactOperations.find((entry) => entry.operation === operation);
    if (candidate === undefined) findings.push(`Missing exact-operation evidence: ${operation}.`);
    else if (!candidate.semanticCommandOrderMatched || !candidate.stateStackBalanced || !candidate.sceneScreenshotMatched) findings.push(`Exact operation failed: ${operation}.`);
  }
  for (const profile of approximationProfiles) {
    const observations = evidence.approximations.filter((entry) => entry.operation === profile.operation);
    for (const candidate of observations) {
      if (!profile.affectedScenes.includes(candidate.scene)) findings.push(`Unrecognized approximation scene: ${profile.operation} in ${candidate.scene}.`);
      else if (observations.filter((entry) => entry.scene === candidate.scene).length !== 1) findings.push(`Duplicate approximation evidence: ${profile.operation} in ${candidate.scene}.`);
    }
    for (const scene of profile.affectedScenes) {
      const candidate = observations.find((entry) => entry.scene === scene);
      if (candidate === undefined) findings.push(`Missing approximation evidence: ${profile.operation} in ${scene}.`);
      else if (!approximationPasses(profile, candidate)) findings.push(`Approximation parity failed: ${profile.operation} in ${scene}.`);
    }
  }
  return Object.freeze({ verdict: findings.length === 0 ? "CONFORMANCE_PASS" : findings.some((finding) => finding.startsWith("Approximation")) ? "BLOCKED_ON_APPROXIMATION_PARITY" : "BLOCKED_ON_CONTRACT_COVERAGE", findings: Object.freeze(findings) });
}

export function createContractOnlyEvidence(): SfhsPixiCanvasConformanceEvidence {
  return Object.freeze({ schema: "sfhs.pixi-canvas-conformance@1", phase: "CONTRACT_ONLY", exactOperations: Object.freeze([]), approximations: Object.freeze([]) });
}

export function createContractEvidence(): Readonly<Record<string, unknown>> {
  return Object.freeze({ schema: contractSchema, sourceCapabilityMatrix: "docs/evidence/sfhs-012a/homeostasis-capabilities.json", operationCount: operationContract.length, operations: operationContract, approximations: approximationProfiles, unsupportedByContract: Object.freeze(["clip", "createPattern", "createConicGradient", "getImageData", "putImageData", "createImageData", "filter", "shadowBlur", "shadowColor", "shadowOffsetX", "shadowOffsetY"]), implementationStatus: "CONTRACT_ONLY" });
}
