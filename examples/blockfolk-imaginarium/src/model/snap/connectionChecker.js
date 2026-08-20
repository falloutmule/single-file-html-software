import { connectedComponentLayerIds, layerPairKey } from './connectionGraph.js';
import { connectionEndpointOccupancy, portEndpointKey } from './portModel.js';
import { PROVISIONAL_SNAP_POLICY } from './policy.js';

export const SNAP_REJECTION = Object.freeze({
  SELF: 'self',
  SAME_COMPONENT: 'same-component',
  TYPE: 'type',
  PLANE: 'plane',
  ORIENTATION: 'orientation',
  NORMAL: 'normal',
  SCALE_CLASS: 'scale-class',
  SCALE: 'scale',
  CAPACITY: 'capacity',
  DUPLICATE: 'duplicate',
  DISTANCE: 'distance',
  RESERVED_SPACE: 'reserved-space'
});

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function dot(first, second) {
  return Number(first?.x || 0) * Number(second?.x || 0) + Number(first?.y || 0) * Number(second?.y || 0);
}

function reciprocalTypes(first, second) {
  return first.compatibleTypes.includes(second.type) && second.compatibleTypes.includes(first.type);
}

function duplicateLayerPair(connections, firstLayerId, secondLayerId) {
  const pair = layerPairKey(firstLayerId, secondLayerId);
  return connections.some((connection) => layerPairKey(connection.aLayerId, connection.bLayerId) === pair);
}

export function checkPortPair({ movingPort, targetPort, connections = [], policy = PROVISIONAL_SNAP_POLICY, reservedSpaceValidator = null }) {
  if (movingPort.layerId === targetPort.layerId) return { ok: false, reason: SNAP_REJECTION.SELF };
  if (connectedComponentLayerIds(connections, movingPort.layerId).has(targetPort.layerId)) return { ok: false, reason: SNAP_REJECTION.SAME_COMPONENT };
  if (!reciprocalTypes(movingPort, targetPort)) return { ok: false, reason: SNAP_REJECTION.TYPE };
  if (!movingPort.plane || movingPort.plane !== targetPort.plane) return { ok: false, reason: SNAP_REJECTION.PLANE };
  if (!movingPort.orientationSupported || !targetPort.orientationSupported || movingPort.orientationId !== targetPort.orientationId) return { ok: false, reason: SNAP_REJECTION.ORIENTATION };
  const normalDot = dot(movingPort.worldNormal, targetPort.worldNormal);
  if (normalDot > policy.normalDotMaximum) return { ok: false, reason: SNAP_REJECTION.NORMAL };
  if (!movingPort.scaleClass || movingPort.scaleClass !== targetPort.scaleClass) return { ok: false, reason: SNAP_REJECTION.SCALE_CLASS };
  const scaleError = Math.abs(movingPort.scaleMultiplier - targetPort.scaleMultiplier) / Math.max(Math.abs(movingPort.scaleMultiplier), Math.abs(targetPort.scaleMultiplier), Number.EPSILON);
  if (scaleError > policy.scaleTolerance) return { ok: false, reason: SNAP_REJECTION.SCALE, scaleError };
  const occupancy = connectionEndpointOccupancy(connections);
  if ((occupancy.get(portEndpointKey(movingPort.layerId, movingPort.portId)) || 0) >= movingPort.capacity
    || (occupancy.get(portEndpointKey(targetPort.layerId, targetPort.portId)) || 0) >= targetPort.capacity) return { ok: false, reason: SNAP_REJECTION.CAPACITY };
  if (duplicateLayerPair(connections, movingPort.layerId, targetPort.layerId)) return { ok: false, reason: SNAP_REJECTION.DUPLICATE };
  const dx = targetPort.worldPoint.x - movingPort.worldPoint.x; const dy = targetPort.worldPoint.y - movingPort.worldPoint.y;
  const screenDistance = Math.hypot(targetPort.viewportPoint.x - movingPort.viewportPoint.x, targetPort.viewportPoint.y - movingPort.viewportPoint.y);
  if (screenDistance > policy.acquisitionCssPx) return { ok: false, reason: SNAP_REJECTION.DISTANCE, screenDistance };
  const proposal = { movingPort, targetPort, plane: movingPort.plane, worldDelta: { x: dx, y: dy }, screenDistance };
  if (typeof reservedSpaceValidator === 'function' && !reservedSpaceValidator(proposal)) return { ok: false, reason: SNAP_REJECTION.RESERVED_SPACE };
  return {
    ok: true,
    ...proposal,
    normalDot,
    normalError: Math.acos(clamp(-normalDot, -1, 1)) * 180 / Math.PI,
    scaleError,
    movementMagnitude: Math.hypot(dx, dy)
  };
}
