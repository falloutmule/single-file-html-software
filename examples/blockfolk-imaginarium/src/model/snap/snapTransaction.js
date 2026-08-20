import { createStableId } from '../ids.js';
import { validateConnectionGraph } from './connectionGraph.js';
import { objectAssetId, objectLayerId } from './portModel.js';
import { SNAP_CONNECTION_SCHEMA_VERSION } from './policy.js';

function positionOf(object) {
  return {
    x: Number.isFinite(Number(object?.x)) ? Number(object.x) : Number(object?.left || 0),
    y: Number.isFinite(Number(object?.y)) ? Number(object.y) : Number(object?.top || 0)
  };
}

function movedObject(object, delta) {
  const position = positionOf(object);
  if (Object.hasOwn(object, 'x') || Object.hasOwn(object, 'y')) return { ...object, x: position.x + delta.x, y: position.y + delta.y };
  return { ...object, left: position.x + delta.x, top: position.y + delta.y };
}

function transformSnapshot(object) {
  const position = positionOf(object);
  return Object.freeze({
    layerId: objectLayerId(object),
    x: position.x,
    y: position.y,
    scaleX: Number(object?.scaleX || 1),
    scaleY: Number(object?.scaleY || 1),
    angle: Number(object?.angle || 0),
    flipX: !!object?.flipX,
    flipY: !!object?.flipY
  });
}

function transformMatches(object, expected) {
  if (!object || !expected) return false;
  const actual = transformSnapshot(object);
  return actual.layerId === expected.layerId && actual.x === expected.x && actual.y === expected.y
    && actual.scaleX === expected.scaleX && actual.scaleY === expected.scaleY && actual.angle === expected.angle
    && actual.flipX === expected.flipX && actual.flipY === expected.flipY;
}

function relativeTransform(source, target, candidate) {
  const sourcePosition = positionOf(source); const targetPosition = positionOf(target);
  const sourceScale = Math.max(Math.abs(Number(source.scaleX || 1)), Number.EPSILON);
  const targetScale = Math.max(Math.abs(Number(target.scaleX || 1)), Number.EPSILON);
  return Object.freeze({
    dx: targetPosition.x - sourcePosition.x,
    dy: targetPosition.y - sourcePosition.y,
    scale: sourceScale / targetScale,
    orientation: candidate.canonicalMatch.movingPort.orientationId,
    flipped: !!source.flipX
  });
}

export function planSnapTransaction({ state, candidate, movingLayerIds, profiles, idFactory = createStableId }) {
  if (!candidate?.canonicalMatch || !state || !(movingLayerIds instanceof Set) || typeof idFactory !== 'function') return { ok: false, reason: 'invalid-input' };
  if (!movingLayerIds.has(candidate.movingLayerId) || movingLayerIds.has(candidate.targetLayerId)) return { ok: false, reason: 'invalid-component-boundary' };
  const sourceBefore = state.objects.find((object) => objectLayerId(object) === candidate.movingLayerId);
  const target = state.objects.find((object) => objectLayerId(object) === candidate.targetLayerId);
  if (!sourceBefore || !target) return { ok: false, reason: 'missing-layer' };
  const proposedObjects = state.objects.map((object) => movingLayerIds.has(objectLayerId(object)) ? movedObject(object, candidate.worldDelta) : { ...object });
  const sourceAfter = proposedObjects.find((object) => objectLayerId(object) === candidate.movingLayerId);
  const connection = Object.freeze({
    id: idFactory('blockfolk-snap-connection'),
    schemaVersion: SNAP_CONNECTION_SCHEMA_VERSION,
    aLayerId: candidate.movingLayerId,
    aAssetId: objectAssetId(sourceBefore),
    aPortId: candidate.movingPortId,
    bLayerId: candidate.targetLayerId,
    bAssetId: objectAssetId(target),
    bPortId: candidate.targetPortId,
    plane: candidate.plane,
    relativeTransform: relativeTransform(sourceAfter, target, candidate)
  });
  const proposedConnections = [...state.connections.map((item) => ({ ...item, relativeTransform: { ...item.relativeTransform } })), connection];
  const validation = validateConnectionGraph({ connections: proposedConnections, layers: proposedObjects, profiles });
  if (!validation.valid || validation.connections.length !== proposedConnections.length) return { ok: false, reason: 'graph-validation', errors: validation.errors };
  return Object.freeze({
    ok: true,
    schemaVersion: 1,
    expectedConnectionCount: state.connections.length,
    preconditions: Object.freeze(state.objects.filter((object) => movingLayerIds.has(objectLayerId(object)) || objectLayerId(object) === candidate.targetLayerId).map(transformSnapshot)),
    movingLayerIds: Object.freeze([...movingLayerIds].sort()),
    worldDelta: Object.freeze({ ...candidate.worldDelta }),
    objectMoves: Object.freeze(proposedObjects.filter((object) => movingLayerIds.has(objectLayerId(object))).map((object) => Object.freeze({ layerId: objectLayerId(object), position: Object.freeze(positionOf(object)) }))),
    connection
  });
}

export function applySnapTransaction(state, plan) {
  if (!state || !plan?.ok || state.connections.length !== plan.expectedConnectionCount) return { ok: false, reason: 'stale-plan', state };
  if (!plan.preconditions.every((expected) => transformMatches(state.objects.find((object) => objectLayerId(object) === expected.layerId), expected))) return { ok: false, reason: 'stale-plan', state };
  const moveMap = new Map(plan.objectMoves.map((move) => [move.layerId, move.position]));
  const objects = state.objects.map((object) => {
    const position = moveMap.get(objectLayerId(object));
    if (!position) return { ...object };
    if (Object.hasOwn(object, 'x') || Object.hasOwn(object, 'y')) return { ...object, x: position.x, y: position.y };
    return { ...object, left: position.x, top: position.y };
  });
  return { ok: true, state: { ...state, objects, connections: [...state.connections, { ...plan.connection, relativeTransform: { ...plan.connection.relativeTransform } }] } };
}
