import assert from 'node:assert/strict';
import {
  ALL_WINDOW_ASSET_IDS, CANONICAL_BLOCK_EXTENT_WORLD, CANONICAL_Z_TIER_WORLD, CONSTRUCTION_PROFILES,
  GRID_DIRECTIONS, PORT_DIRECTION, boundaryPortsFor, buildComponentGrid, constructionOrientation,
  findGridSnapCandidate, objectAnchor, profileForAsset, validConnections
} from '../src/model/constructionModel.js';

const BRICK = 'sticker-blockfolk-brick-stone-block';
const LOG = 'sticker-blockfolk-wood-log-block';
const SQUARE = 'sticker-blockfolk-square-window';
const ROUND = 'sticker-blockfolk-round-window';
const sizes = {
  [BRICK]: { width: 273, height: 325 }, [LOG]: { width: 274, height: 326 },
  [SQUARE]: { width: 268, height: 363 }, [ROUND]: { width: 305, height: 359 }
};
const mateDirection = (portId) => GRID_DIRECTIONS[PORT_DIRECTION[portId]].opposite;
const matePort = (portId) => GRID_DIRECTIONS[mateDirection(portId)].portId;
const edge = (id, aLayerId, bLayerId, aAnchorId, aAssetId, bAssetId) => ({
  id, aLayerId, bLayerId, aAssetId, bAssetId, aAnchorId, bAnchorId: matePort(aAnchorId)
});
const member = (layerId, assetId) => ({ layerId, assetId });
const constructionObject = (layerId, assetId, left = 0, top = 0, extra = {}) => {
  const source = sizes[assetId]; const extent = extra.extent || CANONICAL_BLOCK_EXTENT_WORLD;
  return {
    blockfolkLayerId: layerId, blockfolkAssetId: assetId, left, top,
    angle: extra.angle || 0, flipX: !!extra.flipX,
    getScaledWidth: () => extent * source.width / source.height,
    getScaledHeight: () => extent
  };
};
const placeForContact = (source, target, sourceAnchorId, targetAnchorId) => {
  const sourceAnchor = objectAnchor(source, sourceAnchorId); const targetAnchor = objectAnchor(target, targetAnchorId);
  source.left += targetAnchor.x - sourceAnchor.x; source.top += targetAnchor.y - sourceAnchor.y;
  return source;
};
const exactCandidate = (source, target) => findGridSnapCandidate({ movingObjects: [source], stationaryObjects: [target], screenTolerance: .001, ambiguityScreen: 0 });

assert.deepEqual(ALL_WINDOW_ASSET_IDS, [SQUARE, ROUND]);
assert.deepEqual(Object.keys(CONSTRUCTION_PROFILES).slice(-2), [SQUARE, ROUND]);
for (const assetId of ALL_WINDOW_ASSET_IDS) {
  const profile = profileForAsset(assetId);
  assert.equal(profile.id, 'blockfolk-one-cell-window@1'); assert.equal(profile.kind, 'window');
  assert.deepEqual(profile.footprint, [{ a: 0, b: 0, z: 0 }]);
  assert.deepEqual(profile.directions, ['+A', '-A', '+Z', '-Z']);
  assert.deepEqual(profile.supportedOrientations, ['iso-a', 'iso-b']);
  assert.deepEqual(profile.wallPlanes, ['wall-iso-a', 'wall-iso-b']);
  assert.deepEqual(profile.visibleOrigin, { x: 0, y: 0 });
  assert.equal(Object.isFrozen(profile), true); assert.equal(Object.isFrozen(profile.anchors), true);
  assert.equal(Number.isFinite(profile.anchors.northWest.x), true); assert.equal(Number.isFinite(profile.anchors.stackTop.y), true);
  assert.deepEqual(Object.keys(profile.anchors), ['northWest', 'southEast', 'stackTop', 'stackBase']);
  const ports = boundaryPortsFor(profile, { a: 0, b: 0, z: 0 }, new Map(), assetId);
  assert.equal(ports.length, 4); assert.deepEqual(ports.map((port) => port.direction).sort(), ['+A', '+Z', '-A', '-Z']);
  assert.equal(new Set(ports.map((port) => `${port.cell.a},${port.cell.b},${port.cell.z}:${port.direction}`)).size, 4);
}

for (const assetId of ALL_WINDOW_ASSET_IDS) {
  const target = constructionObject(`${assetId}-a-target`, BRICK);
  const source = placeForContact(constructionObject(`${assetId}-a-source`, assetId), target, 'northWest', 'southEast');
  const horizontal = exactCandidate(source, target);
  assert.equal(horizontal.status, 'ok', `${assetId} must occupy one exact A-plane wall cell beside a block`);
  assert.equal(horizontal.pose.axisFamily, 'horizontal'); assert.equal(horizontal.canonicalContact.sourceAnchor.id, 'northWest');
  assert.ok(Math.abs(horizontal.dx) < 1e-9 && Math.abs(horizontal.dy) < 1e-9);

  const wrongPlane = constructionObject(`${assetId}-b-source`, assetId, -source.left, source.top);
  assert.equal(exactCandidate(wrongPlane, target).status, 'none', `${assetId} must not expose the other horizontal plane before Flip`);

  const below = constructionObject(`${assetId}-z-target`, LOG);
  const above = placeForContact(constructionObject(`${assetId}-z-source`, assetId), below, 'stackBase', 'stackTop');
  const vertical = exactCandidate(above, below);
  assert.equal(vertical.status, 'ok'); assert.equal(vertical.pose.axisFamily, 'z');
  assert.ok(Math.abs(above.top + CANONICAL_Z_TIER_WORLD) < 1e-9, `${assetId} must retain the exact 73.1 Z tier`);

  const flippedTarget = constructionObject(`${assetId}-flip-target`, BRICK, 0, 0, { angle: 180, flipX: true });
  const flippedSource = placeForContact(constructionObject(`${assetId}-flip-source`, assetId, 0, 0, { angle: 180, flipX: true }), flippedTarget, 'northWest', 'southEast');
  const mirrored = exactCandidate(flippedSource, flippedTarget);
  assert.equal(constructionOrientation(flippedSource), 'iso-b'); assert.equal(mirrored.status, 'ok', `${assetId} must connect on the mirrored authored plane after Flip`);
  assert.equal(exactCandidate(constructionObject(`${assetId}-mixed-orientation`, assetId), flippedTarget).status, 'none', 'mixed authored orientations must not connect');
}

const squareProfile = profileForAsset(SQUARE); const roundProfile = profileForAsset(ROUND);
const squareHalf = objectAnchor(constructionObject('square-calibration', SQUARE), 'southEast');
const roundHalf = objectAnchor(constructionObject('round-calibration', ROUND), 'southEast');
assert.ok(Math.abs(squareHalf.x - roundHalf.x) < 1e-9 && Math.abs(squareHalf.y - roundHalf.y) < 1e-9, 'independent PNG aspect calibration must project both windows onto the same logical cell basis');
assert.notEqual(squareProfile, roundProfile, 'each window retains independent visible calibration data');

const wallEdges = [
  edge('wall-left-window', 'wall-left', 'wall-window', 'southEast', BRICK, SQUARE),
  edge('wall-window-right', 'wall-window', 'wall-right', 'southEast', SQUARE, LOG)
];
const wallGrid = buildComponentGrid(wallEdges, [member('wall-left', BRICK), member('wall-window', SQUARE), member('wall-right', LOG)], 'wall-window');
assert.equal(wallGrid.consistent, true); assert.equal(wallGrid.occupiedCells.size, 3);
assert.deepEqual(wallGrid.origins.get('wall-left'), { a: 0, b: 0, z: 0 });
assert.deepEqual(wallGrid.origins.get('wall-window'), { a: 1, b: 0, z: 0 });
assert.deepEqual(wallGrid.origins.get('wall-right'), { a: 2, b: 0, z: 0 }, 'a window between blocks occupies the middle cell without a hidden host block');

const stackEdges = [
  edge('stack-block-window', 'stack-bottom', 'stack-window', 'stackTop', BRICK, ROUND),
  edge('stack-window-block', 'stack-window', 'stack-top', 'stackTop', ROUND, LOG)
];
const stackGrid = buildComponentGrid(stackEdges, [member('stack-bottom', BRICK), member('stack-window', ROUND), member('stack-top', LOG)], 'stack-window');
assert.equal(stackGrid.consistent, true); assert.equal(stackGrid.occupiedCells.size, 3);
assert.deepEqual(stackGrid.origins.get('stack-window'), { a: 0, b: 0, z: 1 }); assert.deepEqual(stackGrid.origins.get('stack-top'), { a: 0, b: 0, z: 2 });

const occupiedRoot = constructionObject('occupied-root', BRICK); const occupiedSquare = placeForContact(constructionObject('occupied-square', SQUARE), occupiedRoot, 'northWest', 'southEast');
const occupiedRound = constructionObject('occupied-round', ROUND, occupiedSquare.left, occupiedSquare.top);
const occupied = findGridSnapCandidate({
  movingObjects: [occupiedRound], stationaryObjects: [occupiedRoot, occupiedSquare],
  connections: [edge('occupied-edge', 'occupied-root', 'occupied-square', 'southEast', BRICK, SQUARE)], screenTolerance: .001, ambiguityScreen: 0
});
assert.equal(occupied.status, 'occupied', 'a second window cannot overlap an occupied wall cell');

const historical = validConnections([{
  id: 'historical-window-face', aLayerId: 'historical-window', bLayerId: 'historical-block',
  aAssetId: SQUARE, bAssetId: BRICK, aAnchorId: 'backFace', bAnchorId: 'frontFace'
}], new Set(['historical-window', 'historical-block']));
assert.equal(historical.length, 1, 'historical window face links remain readable without becoming new candidates');

console.log('BLOCKFOLK_WINDOW_CONSTRUCTION_SCENARIOS PASS', JSON.stringify({ windows: ALL_WINDOW_ASSET_IDS.length, footprintCells: 1, wallDirections: 2, verticalDirections: 2, zTier: CANONICAL_Z_TIER_WORLD, hiddenBlocks: 0, occupied: occupied.status }));
