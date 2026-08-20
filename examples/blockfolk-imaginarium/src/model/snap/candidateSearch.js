import { checkPortPair } from './connectionChecker.js';
import { transformedPortsForObjects } from './portModel.js';
import { PROVISIONAL_SNAP_POLICY } from './policy.js';

const ROLE_SPECIFICITY = Object.freeze({ 'structural-slot': 0, 'cell-mount': 1, 'wall-face': 2, edge: 3 });

function specificity(match) {
  return Math.min(ROLE_SPECIFICITY[match.movingPort.role] ?? 10, ROLE_SPECIFICITY[match.targetPort.role] ?? 10);
}

function compareMatches(first, second) {
  return specificity(first) - specificity(second)
    || first.screenDistance - second.screenDistance
    || first.normalError - second.normalError
    || first.scaleError - second.scaleError
    || first.movementMagnitude - second.movementMagnitude
    || first.movingPort.layerId.localeCompare(second.movingPort.layerId)
    || first.targetPort.layerId.localeCompare(second.targetPort.layerId)
    || first.movingPort.priority - second.movingPort.priority
    || first.movingPort.portId.localeCompare(second.movingPort.portId)
    || first.targetPort.priority - second.targetPort.priority
    || first.targetPort.portId.localeCompare(second.targetPort.portId);
}

function poseEquivalent(first, second, policy) {
  return first.plane === second.plane
    && Math.hypot(first.worldDelta.x - second.worldDelta.x, first.worldDelta.y - second.worldDelta.y) <= policy.transformConsensusEpsilonWorld;
}

function makePose(matches) {
  const ordered = [...matches].sort(compareMatches); const canonical = ordered[0];
  return Object.freeze({
    movingLayerId: canonical.movingPort.layerId,
    movingPortId: canonical.movingPort.portId,
    targetLayerId: canonical.targetPort.layerId,
    targetPortId: canonical.targetPort.portId,
    plane: canonical.plane,
    worldDelta: Object.freeze({ ...canonical.worldDelta }),
    screenDistance: canonical.screenDistance,
    normalError: canonical.normalError,
    scaleError: canonical.scaleError,
    movementMagnitude: canonical.movementMagnitude,
    specificity: specificity(canonical),
    supportingMatches: Object.freeze(ordered),
    canonicalMatch: canonical
  });
}

function comparePoses(first, second) {
  return first.specificity - second.specificity
    || second.supportingMatches.length - first.supportingMatches.length
    || first.screenDistance - second.screenDistance
    || first.normalError - second.normalError
    || first.scaleError - second.scaleError
    || first.movementMagnitude - second.movementMagnitude
    || first.movingLayerId.localeCompare(second.movingLayerId)
    || first.targetLayerId.localeCompare(second.targetLayerId)
    || first.movingPortId.localeCompare(second.movingPortId)
    || first.targetPortId.localeCompare(second.targetPortId);
}

function visuallyTied(first, second, policy) {
  return first.specificity === second.specificity
    && first.supportingMatches.length === second.supportingMatches.length
    && Math.abs(first.screenDistance - second.screenDistance) <= policy.ambiguityScreenEpsilonPx
    && Math.abs(first.normalError - second.normalError) <= policy.poseOrientationEpsilonDegrees
    && Math.abs(first.scaleError - second.scaleError) <= policy.scaleTolerance
    && Math.abs(first.movementMagnitude - second.movementMagnitude) <= policy.poseTranslationEpsilonWorld;
}

function preferredRejection(rejections) {
  for (const reason of ['scale', 'capacity', 'ambiguous', 'orientation', 'normal', 'plane', 'type', 'distance']) if (rejections.has(reason)) return reason;
  return 'no-candidate';
}

export function findTypedSnapCandidate({ movingObjects = [], stationaryObjects = [], profiles = {}, connections = [], viewportTransform = [1, 0, 0, 1, 0, 0], policy = PROVISIONAL_SNAP_POLICY, reservedSpaceValidator = null }) {
  const movingPorts = transformedPortsForObjects({ objects: movingObjects, profiles, viewportTransform, connections, includeAtCapacity: true });
  const targetPorts = transformedPortsForObjects({ objects: stationaryObjects, profiles, viewportTransform, connections, includeAtCapacity: true });
  const matches = []; const rejections = new Set();
  for (const movingPort of movingPorts) for (const targetPort of targetPorts) {
    const result = checkPortPair({ movingPort, targetPort, connections, policy, reservedSpaceValidator });
    if (result.ok) matches.push(result); else rejections.add(result.reason);
  }
  if (!matches.length) return Object.freeze({ candidate: null, rejectionReason: preferredRejection(rejections), poses: Object.freeze([]) });
  const poseGroups = [];
  for (const match of matches.sort(compareMatches)) {
    const group = poseGroups.find((items) => poseEquivalent(items[0], match, policy));
    if (group) group.push(match); else poseGroups.push([match]);
  }
  const poses = poseGroups.map(makePose).sort(comparePoses);
  if (poses.length > 1 && !poseEquivalent(poses[0], poses[1], policy) && visuallyTied(poses[0], poses[1], policy)) {
    return Object.freeze({ candidate: null, rejectionReason: 'ambiguous', poses: Object.freeze(poses) });
  }
  return Object.freeze({ candidate: poses[0], rejectionReason: null, poses: Object.freeze(poses) });
}
