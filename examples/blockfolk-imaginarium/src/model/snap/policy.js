export const SNAP_PROFILE_SCHEMA_VERSION = 1;
export const SNAP_CONNECTION_SCHEMA_VERSION = 1;

// Phase 1 policy values are centralized and intentionally provisional. They
// exercise the renderer-neutral core, but production assets stay on the page@3
// compatibility path until the calibration harness and Samsung pilot approve
// real values.
export const PROVISIONAL_SNAP_POLICY = Object.freeze({
  calibrated: false,
  acquisitionCssPx: 36,
  scaleTolerance: .01,
  normalAngleToleranceDegrees: 15,
  normalDotMaximum: -Math.cos(15 * Math.PI / 180),
  poseTranslationEpsilonWorld: .25,
  poseOrientationEpsilonDegrees: .1,
  ambiguityScreenEpsilonPx: 2,
  transformConsensusEpsilonWorld: .25
});

export const CONSTRUCTION_PLANES = Object.freeze([
  'wall-iso-a',
  'wall-iso-b',
  'ground-iso-a',
  'ground-iso-b'
]);

export function isConstructionPlane(value) {
  return CONSTRUCTION_PLANES.includes(value);
}
