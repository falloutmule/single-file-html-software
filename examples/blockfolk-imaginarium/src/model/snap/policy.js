export const SNAP_PROFILE_SCHEMA_VERSION = 1;
export const SNAP_CONNECTION_SCHEMA_VERSION = 1;

// Accepted building-v1 policy values remain centralized so acquisition,
// ambiguity, scale, and formation behavior cannot drift across call sites.
export const PROVISIONAL_SNAP_POLICY = Object.freeze({
  calibrated: true,
  acquisitionCssPx: 36,
  scaleTolerance: .01,
  normalAngleToleranceDegrees: 15,
  normalDotMaximum: -Math.cos(15 * Math.PI / 180),
  poseTranslationEpsilonWorld: .25,
  poseOrientationEpsilonDegrees: .1,
  ambiguityScreenEpsilonPx: 2,
  transformConsensusEpsilonWorld: .25,
  formationCellAlignmentEpsilonWorld: 1.5,
  mixedDoorwayCompletion: null
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
