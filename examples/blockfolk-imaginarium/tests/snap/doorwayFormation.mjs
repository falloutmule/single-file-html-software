import assert from 'node:assert/strict';
import { ASSET_CONSTRUCTION_PROFILES, BLOCK_CONSTRUCTION_ASSET_IDS } from '../../src/model/snap/assetProfiles.js';
import { findTypedSnapCandidate } from '../../src/model/snap/candidateSearch.js';
import { connectedComponentLayerIds } from '../../src/model/snap/connectionGraph.js';
import { doorwayReservedSpaceValidator, evaluateDoorwayForDoor } from '../../src/model/snap/doorwayFormation.js';
import { DOORWAY_SLOT_CELLS } from '../../src/model/snap/doorProfiles.js';
import { sourceArtPointToWorld } from '../../src/model/snap/coordinateTransforms.js';
import { transformedPort } from '../../src/model/snap/portModel.js';
import { applySnapTransaction, planSnapTransaction } from '../../src/model/snap/snapTransaction.js';

const BRICK = 'sticker-blockfolk-brick-stone-block';
const LOG = 'sticker-blockfolk-wood-log-block';
const STONE_DOOR = 'sticker-blockfolk-stone-door';
const WOOD_DOOR = 'sticker-blockfolk-wood-door';
const object = (layerId, assetId, x, y, overrides = {}) => {
  const profile = ASSET_CONSTRUCTION_PROFILES[assetId]; const scale = profile.canonicalInsertScale;
  return { layerId, assetId, x, y, scaleX: scale, scaleY: scale, angle: 0, flipX: false, flipY: false, orientationId: 'default', ...overrides };
};
const port = (item, portId) => {
  const profile = ASSET_CONSTRUCTION_PROFILES[item.assetId];
  return transformedPort(profile, item, profile.ports.find((candidate) => candidate.id === portId));
};
const positionCellMountAt = (layerId, assetId, worldPoint, offset = { x: 0, y: 0 }) => {
  const atZero = object(layerId, assetId, 0, 0); const mount = port(atZero, 'cellMount').worldPoint;
  return object(layerId, assetId, worldPoint.x - mount.x + offset.x, worldPoint.y - mount.y + offset.y);
};
const connection = (id, a, aPortId, b, bPortId, plane = 'wall-iso-a') => ({
  id, schemaVersion: 1, aLayerId: a.layerId, aAssetId: a.assetId, aPortId,
  bLayerId: b.layerId, bAssetId: b.assetId, bPortId, plane,
  relativeTransform: { dx: b.x - a.x, dy: b.y - a.y, scale: a.scaleX / b.scaleX, orientation: 'default', flipped: false }
});

assert.equal(BLOCK_CONSTRUCTION_ASSET_IDS.length, 10);
assert.equal(BLOCK_CONSTRUCTION_ASSET_IDS.every((assetId) => ASSET_CONSTRUCTION_PROFILES[assetId].productionEnabled), true);
assert.equal(ASSET_CONSTRUCTION_PROFILES[STONE_DOOR].productionEnabled, true);
assert.equal(ASSET_CONSTRUCTION_PROFILES[WOOD_DOOR].productionEnabled, true);
assert.deepEqual(ASSET_CONSTRUCTION_PROFILES[STONE_DOOR].visibleBounds, { left: 25, top: 25, right: 235, bottom: 398 });
assert.deepEqual(ASSET_CONSTRUCTION_PROFILES[STONE_DOOR].constructionOrigin, { x: 130, y: 398 });
assert.deepEqual(ASSET_CONSTRUCTION_PROFILES[STONE_DOOR].ports.map(({ id }) => id), Object.keys(DOORWAY_SLOT_CELLS));
assert.equal(new Set(ASSET_CONSTRUCTION_PROFILES[STONE_DOOR].ports.map(({ localPoint }) => `${localPoint.x}:${localPoint.y}`)).size, 5);

const door = object('door', STONE_DOOR, 900, 900);
const lowerLeftPoint = port(door, 'frameLowerLeft').worldPoint;
const nearLowerLeft = positionCellMountAt('brick-left', BRICK, lowerLeftPoint, { x: 8, y: 5 });
const partialProposal = findTypedSnapCandidate({
  movingObjects: [nearLowerLeft], stationaryObjects: [door], profiles: ASSET_CONSTRUCTION_PROFILES, connections: []
});
assert.equal(partialProposal.rejectionReason, null);
assert.deepEqual([partialProposal.candidate.movingPortId, partialProposal.candidate.targetPortId], ['cellMount', 'frameLowerLeft']);
const partialPlan = planSnapTransaction({
  state: { objects: [nearLowerLeft, door], connections: [] }, candidate: partialProposal.candidate,
  movingLayerIds: new Set([nearLowerLeft.layerId]), profiles: ASSET_CONSTRUCTION_PROFILES, idFactory: () => 'partial-edge'
});
assert.equal(partialPlan.ok, true);
const partialApplied = applySnapTransaction({ objects: [nearLowerLeft, door], connections: [] }, partialPlan);
assert.equal(partialApplied.ok, true); assert.equal(partialApplied.state.connections.length, 1);
const partial = evaluateDoorwayForDoor({ door, objects: partialApplied.state.objects, connections: partialApplied.state.connections, profiles: ASSET_CONSTRUCTION_PROFILES });
assert.equal(partial.status, 'partial'); assert.deepEqual(partial.occupiedRequiredSlots, ['frameLowerLeft']); assert.equal(partial.totalRequiredSlots, 5);

const fullBlocks = Object.keys(DOORWAY_SLOT_CELLS).map((slotId, index) => positionCellMountAt(`frame-${index}`, BRICK, port(door, slotId).worldPoint));
const fullConnections = fullBlocks.map((block, index) => connection(`frame-edge-${index}`, door, Object.keys(DOORWAY_SLOT_CELLS)[index], block, 'cellMount'));
const full = evaluateDoorwayForDoor({ door, objects: [door, ...fullBlocks], connections: fullConnections, profiles: ASSET_CONSTRUCTION_PROFILES });
assert.equal(full.status, 'complete'); assert.equal(full.occupiedRequiredSlots.length, 5); assert.equal(full.reservedViolations.length, 0);
assert.equal(fullConnections.length, 5, 'formation completion must not create synthetic edges');
assert.equal(connectedComponentLayerIds(fullConnections, door.layerId).size, 6);

const logReplacement = positionCellMountAt(fullBlocks[4].layerId, LOG, port(door, 'frameLintel').worldPoint);
const mixedObjects = [door, ...fullBlocks.slice(0, 4), logReplacement];
const mixed = evaluateDoorwayForDoor({ door, objects: mixedObjects, connections: fullConnections.map((item, index) => index === 4 ? connection(item.id, door, 'frameLintel', logReplacement, 'cellMount') : item), profiles: ASSET_CONSTRUCTION_PROFILES });
assert.equal(mixed.status, 'partial'); assert.equal(mixed.mixedPolicyPending, true); assert.equal(mixed.occupiedRequiredSlots.length, 5);

const doorProfile = ASSET_CONSTRUCTION_PROFILES[STONE_DOOR];
const reservedPoint = sourceArtPointToWorld(doorProfile, door, doorProfile.constructionOrigin);
const behindDoor = positionCellMountAt('behind-door', BRICK, reservedPoint);
const invalidObjects = [door, fullBlocks[0], behindDoor];
const reservedValidator = doorwayReservedSpaceValidator({
  objects: invalidObjects, connections: [fullConnections[0]], movingLayerIds: new Set([behindDoor.layerId]), profiles: ASSET_CONSTRUCTION_PROFILES
});
const fakeProposal = { movingPort: port(behindDoor, 'wallLeft'), targetPort: port(fullBlocks[0], 'wallRight'), plane: 'wall-iso-a', worldDelta: { x: 0, y: 0 } };
assert.equal(reservedValidator(fakeProposal), false, 'a connected block cannot occupy either reserved doorway cell');

console.log('BLOCKFOLK_DOORWAY_FORMATION_MODEL PASS', JSON.stringify({
  typedBlocks: BLOCK_CONSTRUCTION_ASSET_IDS.length, doorProfiles: 2, partial: partial.occupiedRequiredSlots.length,
  complete: full.occupiedRequiredSlots.length, mixedPolicyPending: mixed.mixedPolicyPending
}));
