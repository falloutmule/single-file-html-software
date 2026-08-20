import assert from 'node:assert/strict';
import { ASSET_CONSTRUCTION_PROFILES } from '../../src/model/snap/assetProfiles.js';
import { findTypedSnapCandidate } from '../../src/model/snap/candidateSearch.js';
import { connectedComponentLayerIds, removeIncidentConnections } from '../../src/model/snap/connectionGraph.js';
import { applySnapTransaction, planSnapTransaction } from '../../src/model/snap/snapTransaction.js';
import { isTypedSnapConnection, validConnections } from '../../src/model/constructionModel.js';
import { createPicture, createSticker, normalizePicture } from '../../src/model/pageModel.js';
import { BLOCK_CONSTRUCTION_ASSET_IDS, DOOR_CONSTRUCTION_ASSET_IDS, WINDOW_CONSTRUCTION_ASSET_IDS } from '../../src/model/snap/assetProfiles.js';

const BRICK = 'sticker-blockfolk-brick-stone-block';
const LOG = 'sticker-blockfolk-wood-log-block';
const brickProfile = ASSET_CONSTRUCTION_PROFILES[BRICK]; const logProfile = ASSET_CONSTRUCTION_PROFILES[LOG];
const object = (layerId, assetId, x, y, scale = ASSET_CONSTRUCTION_PROFILES[assetId].canonicalInsertScale, overrides = {}) => ({
  layerId, assetId, x, y, scaleX: scale, scaleY: scale, angle: 0, flipX: false, flipY: false, orientationId: 'default', ...overrides
});
const candidateFor = (moving, target, extra = {}) => findTypedSnapCandidate({
  movingObjects: [moving], stationaryObjects: [target], profiles: ASSET_CONSTRUCTION_PROFILES, ...extra
});

assert.equal(brickProfile.productionEnabled, true); assert.equal(logProfile.productionEnabled, true);
assert.equal(brickProfile.canonicalInsertScale * brickProfile.sourceSize.height, 420 / (1.1 ** 10));
assert.equal(logProfile.canonicalInsertScale * logProfile.sourceSize.height, 420 / (1.1 ** 10));
for (const assetId of BLOCK_CONSTRUCTION_ASSET_IDS) {
  const profile = ASSET_CONSTRUCTION_PROFILES[assetId];
  assert.equal(profile.productionEnabled, true);
  assert.ok(Math.abs(profile.canonicalInsertScale * profile.sourceSize.height - 420 / (1.1 ** 10)) < 1e-9, `${assetId} must enter at the common construction-unit extent`);
  const candidate = candidateFor(object(`moving-${assetId}`, assetId, 70, 35), object(`target-${assetId}`, BRICK, 0, 0));
  assert.equal(candidate.rejectionReason, null, `${assetId} must connect through the typed wall plane`);
  assert.deepEqual([candidate.candidate.movingPortId, candidate.candidate.targetPortId], ['wallLeft', 'wallRight']);
}
for (const assetId of [...DOOR_CONSTRUCTION_ASSET_IDS, ...WINDOW_CONSTRUCTION_ASSET_IDS]) {
  assert.equal(ASSET_CONSTRUCTION_PROFILES[assetId].productionEnabled, true);
  assert.ok(ASSET_CONSTRUCTION_PROFILES[assetId].canonicalInsertScale > 0, `${assetId} must have an authored insertion scale`);
}

const targetBrick = object('brick-target', BRICK, 0, 0);
const horizontalBrick = object('brick-moving', BRICK, 70, 35);
const horizontal = candidateFor(horizontalBrick, targetBrick);
assert.equal(horizontal.rejectionReason, null);
assert.deepEqual([horizontal.candidate.movingPortId, horizontal.candidate.targetPortId], ['wallLeft', 'wallRight']);
assert.ok(Math.abs(horizontal.candidate.worldDelta.x + 14.4) < 1e-6);
assert.ok(Math.abs(horizontal.candidate.worldDelta.y + 2.9) < 1e-6);

const verticalLog = object('log-moving', LOG, 0, -65);
const vertical = candidateFor(verticalLog, object('log-target', LOG, 0, 0));
assert.equal(vertical.rejectionReason, null);
assert.deepEqual([vertical.candidate.movingPortId, vertical.candidate.targetPortId], ['stackBase', 'stackTop']);
assert.ok(Math.abs(vertical.candidate.worldDelta.y + 8.1) < .2, 'reviewed tier fixture must land without deriving its expectation from the profile');

const mixed = candidateFor(object('mixed-log', LOG, 70, 35), targetBrick);
assert.equal(mixed.rejectionReason, null, 'Brick and Log share the calibrated cell scale class');
assert.deepEqual([mixed.candidate.movingPortId, mixed.candidate.targetPortId], ['wallLeft', 'wallRight']);

const scaleMismatch = candidateFor(object('large-brick', BRICK, 70, 35, brickProfile.canonicalInsertScale * 1.02), targetBrick);
assert.equal(scaleMismatch.candidate, null); assert.equal(scaleMismatch.rejectionReason, 'scale');
const wrongPlane = candidateFor(object('flipped-brick', BRICK, 70, 35, brickProfile.canonicalInsertScale, { flipX: true }), targetBrick);
assert.equal(wrongPlane.candidate, null); assert.equal(wrongPlane.rejectionReason, 'plane');
const unsupportedAngle = candidateFor(object('turned-brick', BRICK, 70, 35, brickProfile.canonicalInsertScale, { angle: 15 }), targetBrick);
assert.equal(unsupportedAngle.candidate, null); assert.equal(unsupportedAngle.rejectionReason, 'orientation');

const state = { objects: [horizontalBrick, targetBrick], connections: [] };
const plan = planSnapTransaction({ state, candidate: horizontal.candidate, movingLayerIds: new Set(['brick-moving']), profiles: ASSET_CONSTRUCTION_PROFILES, idFactory: () => 'typed-pilot-edge' });
assert.equal(plan.ok, true); assert.equal(plan.connection.schemaVersion, 1); assert.equal(plan.connection.id, 'typed-pilot-edge');
assert.deepEqual([plan.connection.aPortId, plan.connection.bPortId], ['wallLeft', 'wallRight']);
const applied = applySnapTransaction(state, plan);
assert.equal(applied.ok, true); assert.equal(applied.state.connections.length, 1);
assert.deepEqual([...connectedComponentLayerIds(applied.state.connections, 'brick-moving')].sort(), ['brick-moving', 'brick-target']);
assert.equal(validConnections(applied.state.connections, new Set(['brick-moving', 'brick-target']), applied.state.objects).length, 1);
assert.equal(isTypedSnapConnection(applied.state.connections[0]), true);

const occupied = candidateFor(object('third-brick', BRICK, 70, 35), targetBrick, { connections: applied.state.connections });
assert.equal(occupied.candidate, null, 'a capacity-one occupied wall port cannot accept another block');
assert.equal(['capacity', 'same-component', 'duplicate'].includes(occupied.rejectionReason), true);
assert.equal(removeIncidentConnections(applied.state.connections, 'brick-moving').length, 0);

const picture = createPicture({ id: 'typed-pilot-picture' });
picture.stickers = applied.state.objects.map((item) => createSticker(item.assetId, { layerId: item.layerId, x: item.x, y: item.y, scale: item.scaleX })).map((item, zIndex) => ({ ...item, zIndex }));
picture.connections = applied.state.connections;
const normalized = normalizePicture(picture); const normalizedAgain = normalizePicture(normalized);
assert.deepEqual(normalizedAgain, normalized, 'typed pilot save/load normalization must be idempotent');
assert.equal(normalized.connections.length, 1); assert.equal(normalized.connections[0].aPortId, 'wallLeft');
const oldScalePicture = createPicture({ id: 'old-scale-picture' });
oldScalePicture.stickers = [createSticker(BRICK, { layerId: 'old-brick', scale: .81 })];
assert.equal(normalizePicture(oldScalePicture).stickers[0].scaleX, .81, 'existing saved sticker sizes must remain authoritative');

console.log('BLOCKFOLK_BLOCK_PILOT_MODEL PASS', JSON.stringify({
  productionProfiles: Object.values(ASSET_CONSTRUCTION_PROFILES).filter(({ productionEnabled }) => productionEnabled).length, horizontalPorts: ['wallLeft', 'wallRight'], verticalPorts: ['stackBase', 'stackTop'], typedEdges: normalized.connections.length
}));
