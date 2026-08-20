import assert from 'node:assert/strict';
import {
  ASSET_CONSTRUCTION_PROFILES,
  BLOCK_CONSTRUCTION_ASSET_IDS,
  CONSTRUCTION_ASSET_IDS,
  DOOR_CONSTRUCTION_ASSET_IDS,
  WINDOW_CONSTRUCTION_ASSET_IDS,
  validateConstructionProfile
} from '../../src/model/snap/assetProfiles.js';
import { findTypedSnapCandidate } from '../../src/model/snap/candidateSearch.js';
import { checkPortPair, SNAP_REJECTION } from '../../src/model/snap/connectionChecker.js';
import {
  buildAdjacency,
  cloneInternalConnections,
  connectedComponentLayerIds,
  connectedComponents,
  removeIncidentConnections,
  validateConnectionGraph
} from '../../src/model/snap/connectionGraph.js';
import {
  localNormalToWorld,
  resolveConstructionPlane,
  sourceArtPointToStickerLocal,
  sourceArtPointToWorld,
  worldPointToViewport
} from '../../src/model/snap/coordinateTransforms.js';
import { transformedPortsForObject } from '../../src/model/snap/portModel.js';
import { PROVISIONAL_SNAP_POLICY, SNAP_CONNECTION_SCHEMA_VERSION, SNAP_PROFILE_SCHEMA_VERSION } from '../../src/model/snap/policy.js';
import { applySnapTransaction, planSnapTransaction } from '../../src/model/snap/snapTransaction.js';
import { fixtureObject, MOVING_ASSET_ID, REVIEWED_EXPECTATIONS, SNAP_FIXTURE_PROFILES, TARGET_ASSET_ID } from './fixtures.mjs';

assert.equal(SNAP_PROFILE_SCHEMA_VERSION, 1);
assert.equal(SNAP_CONNECTION_SCHEMA_VERSION, 1);
assert.equal(PROVISIONAL_SNAP_POLICY.calibrated, true, 'accepted BlockFolk construction policy must be calibrated');
assert.deepEqual(BLOCK_CONSTRUCTION_ASSET_IDS, [
  'sticker-blockfolk-grass-dirt-block', 'sticker-blockfolk-dirt-block', 'sticker-blockfolk-stone-block',
  'sticker-blockfolk-sand-block', 'sticker-blockfolk-snow-block', 'sticker-blockfolk-water-block',
  'sticker-blockfolk-lava-block', 'sticker-blockfolk-wood-log-block', 'sticker-blockfolk-leaf-block',
  'sticker-blockfolk-brick-stone-block'
]);
assert.deepEqual(DOOR_CONSTRUCTION_ASSET_IDS, ['sticker-blockfolk-wood-door', 'sticker-blockfolk-stone-door']);
assert.deepEqual(WINDOW_CONSTRUCTION_ASSET_IDS, ['sticker-blockfolk-square-window', 'sticker-blockfolk-round-window']);
assert.equal(CONSTRUCTION_ASSET_IDS.length, 14);
for (const assetId of CONSTRUCTION_ASSET_IDS) {
  const profile = ASSET_CONSTRUCTION_PROFILES[assetId];
  assert.equal(validateConstructionProfile(profile), true, `${assetId} must have a valid versioned profile`);
  assert.equal(profile.productionEnabled, true, `${assetId} must use typed construction`);
  assert.equal(profile.calibrationStatus, 'typed-building-v1');
  assert.ok(profile.ports.length >= 1);
}
assert.equal(ASSET_CONSTRUCTION_PROFILES['sticker-blockfolk-stone-door'].ports.length, 5);
assert.deepEqual(ASSET_CONSTRUCTION_PROFILES['sticker-blockfolk-square-window'].ports.map(({ id }) => id), ['wallMount']);

const movingProfile = SNAP_FIXTURE_PROFILES[MOVING_ASSET_ID];
const targetProfile = SNAP_FIXTURE_PROFILES[TARGET_ASSET_ID];
assert.equal(validateConstructionProfile(movingProfile), true);
assert.equal(validateConstructionProfile(targetProfile), true);
assert.deepEqual(sourceArtPointToStickerLocal(movingProfile, { x: 50, y: 50 }), REVIEWED_EXPECTATIONS.sourceCenterToLocal);
assert.deepEqual(sourceArtPointToStickerLocal(movingProfile, { x: 100, y: 40 }), REVIEWED_EXPECTATIONS.sourceRightLowerToLocal);
const translated = fixtureObject('moving', MOVING_ASSET_ID, 10, 20);
assert.deepEqual(sourceArtPointToWorld(movingProfile, translated, { x: 100, y: 40 }), REVIEWED_EXPECTATIONS.translatedRightLowerWorld);
assert.deepEqual(worldPointToViewport({ x: 10, y: 20 }, [2, 0, 0, 2, 3, 4]), { x: 23, y: 44 });
assert.deepEqual(localNormalToWorld({ angle: 0, flipX: true }, { x: 1, y: 0 }), { x: -1, y: 0 });
assert.equal(resolveConstructionPlane(movingProfile, movingProfile.ports[0], { flipX: true }), 'wall-iso-b', 'Flip must switch the authored wall plane');

const moving = fixtureObject('moving', MOVING_ASSET_ID, 0);
const target = fixtureObject('target', TARGET_ASSET_ID, 105);
const movingPorts = transformedPortsForObject({ object: moving, profile: movingProfile });
const targetPorts = transformedPortsForObject({ object: target, profile: targetProfile });
assert.equal(movingPorts.length, 2); assert.equal(targetPorts.length, 2);
const validPair = checkPortPair({ movingPort: movingPorts[0], targetPort: targetPorts[0] });
assert.equal(validPair.ok, true); assert.deepEqual(validPair.worldDelta, REVIEWED_EXPECTATIONS.consensusDelta);

const wrongPlaneTarget = transformedPortsForObject({ object: { ...target, flipX: true }, profile: targetProfile })[0];
assert.deepEqual(checkPortPair({ movingPort: movingPorts[0], targetPort: wrongPlaneTarget }), { ok: false, reason: SNAP_REJECTION.PLANE });
const wrongNormalTarget = { ...targetPorts[0], worldNormal: { x: 1, y: 0 } };
assert.equal(checkPortPair({ movingPort: movingPorts[0], targetPort: wrongNormalTarget }).reason, SNAP_REJECTION.NORMAL);
const wrongTypeTarget = { ...targetPorts[0], type: 'fixture-other', compatibleTypes: ['fixture-other'] };
assert.equal(checkPortPair({ movingPort: movingPorts[0], targetPort: wrongTypeTarget }).reason, SNAP_REJECTION.TYPE);
const wrongScaleTarget = transformedPortsForObject({ object: { ...target, constructionScaleMultiplier: 1.02 }, profile: targetProfile })[0];
assert.equal(checkPortPair({ movingPort: movingPorts[0], targetPort: wrongScaleTarget }).reason, SNAP_REJECTION.SCALE);
const wrongAngleTarget = transformedPortsForObject({ object: { ...target, angle: 15 }, profile: targetProfile })[0];
assert.equal(checkPortPair({ movingPort: movingPorts[0], targetPort: wrongAngleTarget }).reason, SNAP_REJECTION.ORIENTATION, 'unsupported free rotation must be rejected');

const typedConnection = (id, aLayerId, aPortId, bLayerId, bPortId) => ({
  id,
  schemaVersion: SNAP_CONNECTION_SCHEMA_VERSION,
  aLayerId,
  aAssetId: aLayerId === 'moving' ? MOVING_ASSET_ID : TARGET_ASSET_ID,
  aPortId,
  bLayerId,
  bAssetId: bLayerId === 'moving' ? MOVING_ASSET_ID : TARGET_ASSET_ID,
  bPortId,
  plane: 'wall-iso-a',
  relativeTransform: { dx: 100, dy: 0, scale: 1, orientation: 'default', flipped: false }
});
const occupied = typedConnection('occupied', 'moving', 'rightLower', 'target', 'leftLower');
assert.equal(checkPortPair({ movingPort: movingPorts[0], targetPort: targetPorts[0], connections: [occupied] }).reason, SNAP_REJECTION.SAME_COMPONENT);
const endpointOccupiedElsewhere = typedConnection('occupied-elsewhere', 'moving', 'rightLower', 'ghost-target', 'leftLower');
assert.equal(checkPortPair({ movingPort: movingPorts[0], targetPort: targetPorts[0], connections: [endpointOccupiedElsewhere] }).reason, SNAP_REJECTION.CAPACITY, 'a full port must be removed from candidate use even when the target is in another component');

const consensus = findTypedSnapCandidate({
  movingObjects: [moving], stationaryObjects: [target], profiles: SNAP_FIXTURE_PROFILES
});
assert.equal(consensus.rejectionReason, null);
assert.ok(consensus.candidate);
assert.deepEqual(consensus.candidate.worldDelta, REVIEWED_EXPECTATIONS.consensusDelta);
assert.equal(consensus.candidate.supportingMatches.length, 2, 'two port pairs that imply one transform must become one candidate pose');
assert.equal(consensus.candidate.movingPortId, 'rightLower', 'one deterministic canonical edge must represent the supported pose');

const reversedConsensus = findTypedSnapCandidate({
  movingObjects: [moving], stationaryObjects: [target], profiles: Object.fromEntries(Object.entries(SNAP_FIXTURE_PROFILES).reverse())
});
assert.deepEqual(
  [reversedConsensus.candidate.movingLayerId, reversedConsensus.candidate.movingPortId, reversedConsensus.candidate.targetLayerId, reversedConsensus.candidate.targetPortId],
  [consensus.candidate.movingLayerId, consensus.candidate.movingPortId, consensus.candidate.targetLayerId, consensus.candidate.targetPortId],
  'profile enumeration order must not alter deterministic candidate selection'
);

const ambiguous = findTypedSnapCandidate({
  movingObjects: [moving],
  stationaryObjects: [fixtureObject('target-a', TARGET_ASSET_ID, 105), fixtureObject('target-b', TARGET_ASSET_ID, 95)],
  profiles: SNAP_FIXTURE_PROFILES
});
assert.equal(ambiguous.candidate, null);
assert.equal(ambiguous.rejectionReason, 'ambiguous', 'meaningfully different tied poses must not be resolved by stable IDs alone');

const viewportA = findTypedSnapCandidate({ movingObjects: [moving], stationaryObjects: [target], profiles: SNAP_FIXTURE_PROFILES, viewportTransform: [1, 0, 0, 1, 0, 0] });
const viewportB = findTypedSnapCandidate({ movingObjects: [moving], stationaryObjects: [target], profiles: SNAP_FIXTURE_PROFILES, viewportTransform: [2, 0, 0, 2, -300, 200] });
assert.deepEqual(viewportA.candidate.worldDelta, viewportB.candidate.worldDelta, 'pan and zoom must not alter the selected world transform');

const state = { objects: [moving, target], connections: [] };
const stateBefore = JSON.parse(JSON.stringify(state));
const plan = planSnapTransaction({ state, candidate: consensus.candidate, movingLayerIds: new Set(['moving']), profiles: SNAP_FIXTURE_PROFILES, idFactory: () => 'connection-new' });
assert.equal(plan.ok, true);
assert.equal(plan.objectMoves.length, 1);
assert.equal(plan.connection.id, 'connection-new');
assert.equal(plan.connection.aPortId, 'rightLower');
assert.equal(plan.connection.bPortId, 'leftLower');
assert.deepEqual(state, stateBefore, 'planning must not mutate live state');
const applied = applySnapTransaction(state, plan);
assert.equal(applied.ok, true);
assert.equal(applied.state.connections.length, 1, 'one Snap plan must commit exactly one edge even with multiple supporting correspondences');
assert.equal(applied.state.objects.find((object) => object.layerId === 'moving').x, 5);
assert.deepEqual(state, stateBefore, 'application must return a new state rather than mutate its input');
assert.deepEqual(applySnapTransaction({ ...state, connections: [occupied] }, plan), { ok: false, reason: 'stale-plan', state: { ...state, connections: [occupied] } }, 'a stale plan must leave the supplied state untouched');
const movedBeforeCommit = { ...state, objects: [{ ...moving, x: 1 }, target] };
assert.deepEqual(applySnapTransaction(movedBeforeCommit, plan), { ok: false, reason: 'stale-plan', state: movedBeforeCommit }, 'a transform change must invalidate the immutable transaction plan');

const graphValidation = validateConnectionGraph({ connections: applied.state.connections, layers: applied.state.objects, profiles: SNAP_FIXTURE_PROFILES });
assert.equal(graphValidation.valid, true);
assert.deepEqual([...connectedComponentLayerIds(graphValidation.connections, 'moving')].sort(), ['moving', 'target']);
assert.equal(buildAdjacency(graphValidation.connections).get('moving').has('target'), true);
assert.deepEqual(connectedComponents(graphValidation.connections, ['moving', 'target']).map((component) => [...component].sort()), [['moving', 'target']]);
const targetTwo = fixtureObject('target-two', TARGET_ASSET_ID, 205);
const overCapacity = validateConnectionGraph({
  connections: [
    typedConnection('capacity-a', 'moving', 'rightLower', 'target', 'leftLower'),
    typedConnection('capacity-b', 'moving', 'rightLower', 'target-two', 'leftLower')
  ],
  layers: [moving, target, targetTwo],
  profiles: SNAP_FIXTURE_PROFILES
});
assert.equal(overCapacity.valid, false); assert.ok(overCapacity.errors.includes('capacity-b:capacity'));
const duplicatePair = validateConnectionGraph({
  connections: [
    typedConnection('pair-a', 'moving', 'rightLower', 'target', 'leftLower'),
    typedConnection('pair-b', 'moving', 'rightUpper', 'target', 'leftUpper')
  ],
  layers: [moving, target],
  profiles: SNAP_FIXTURE_PROFILES
});
assert.equal(duplicatePair.valid, false); assert.ok(duplicatePair.errors.includes('pair-b:duplicate-pair'));
const invalidTransform = typedConnection('invalid-transform', 'moving', 'rightLower', 'target', 'leftLower'); invalidTransform.relativeTransform.dx = Number.NaN;
assert.equal(validateConnectionGraph({ connections: [invalidTransform], layers: [moving, target], profiles: SNAP_FIXTURE_PROFILES }).errors[0], 'invalid-transform:transform');

const loopConnections = [
  { aLayerId: 'a', bLayerId: 'b' }, { aLayerId: 'b', bLayerId: 'c' }, { aLayerId: 'c', bLayerId: 'a' }
];
assert.deepEqual([...connectedComponentLayerIds(loopConnections, 'a')].sort(), ['a', 'b', 'c'], 'BFS traversal must terminate safely on legacy loops');
const split = removeIncidentConnections([
  { id: 'ab', aLayerId: 'a', bLayerId: 'b' }, { id: 'bc', aLayerId: 'b', bLayerId: 'c' }, { id: 'cd', aLayerId: 'c', bLayerId: 'd' }
], 'b');
assert.deepEqual(split.map((connection) => connection.id), ['cd'], 'Unsnap removes only the selected member incident edges');
assert.deepEqual(connectedComponents(split, ['a', 'b', 'c', 'd']).map((component) => [...component].sort()), [['a'], ['b'], ['c', 'd']]);

const cloned = cloneInternalConnections(applied.state.connections, new Map([['moving', 'moving-copy'], ['target', 'target-copy']]), () => 'copied-edge');
assert.equal(cloned.length, 1); assert.equal(cloned[0].id, 'copied-edge'); assert.deepEqual([cloned[0].aLayerId, cloned[0].bLayerId], ['moving-copy', 'target-copy']);
assert.notEqual(cloned[0].relativeTransform, applied.state.connections[0].relativeTransform);

for (let length = 1; length <= 20; length += 1) {
  const layerIds = Array.from({ length }, (_, index) => `node-${index}`);
  const chain = layerIds.slice(1).map((layerId, index) => ({ aLayerId: layerIds[index], bLayerId: layerId }));
  assert.equal(connectedComponentLayerIds(chain, layerIds[0]).size, length, `generated chain ${length} must form one component`);
  const reversed = [...chain].reverse().map((connection) => ({ aLayerId: connection.bLayerId, bLayerId: connection.aLayerId }));
  assert.deepEqual([...connectedComponentLayerIds(reversed, layerIds[0])].sort(), [...layerIds].sort(), 'endpoint and record order must not alter component membership');
}

console.log('BLOCKFOLK_RENDERER_NEUTRAL_SNAP_CORE PASS', JSON.stringify({
  profiles: CONSTRUCTION_ASSET_IDS.length,
  consensusMatches: consensus.candidate.supportingMatches.length,
  graphSchema: SNAP_CONNECTION_SCHEMA_VERSION,
  productionEnabledProfiles: Object.values(ASSET_CONSTRUCTION_PROFILES).filter((profile) => profile.productionEnabled).length
}));
