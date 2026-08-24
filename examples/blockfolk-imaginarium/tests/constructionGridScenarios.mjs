import assert from 'node:assert/strict';
import {
  CONSTRUCTION_PROFILES, GRID_DIRECTIONS, PORT_DIRECTION, SNAP_AMBIGUITY_SCREEN_PX,
  boundaryPortsFor, buildComponentGrid, constructionOrientation, duplicateConnections,
  findGridSnapCandidate, gridCellKey, profileForAsset, removeMemberConnections
} from '../src/model/constructionModel.js';

const LOG = 'sticker-blockfolk-wood-log-block';
const BRICK = 'sticker-blockfolk-brick-stone-block';
const mate = (portId) => GRID_DIRECTIONS[PORT_DIRECTION[portId]].opposite;
const matePort = (portId) => GRID_DIRECTIONS[mate(portId)].portId;
const member = (layerId, assetId = BRICK) => ({ layerId, assetId });
const edge = (id, aLayerId, bLayerId, aAnchorId, aAssetId = BRICK, bAssetId = BRICK) => ({
  id, aLayerId, bLayerId, aAssetId, bAssetId, aAnchorId, bAnchorId: matePort(aAnchorId)
});
const object = (layerId, left, top, assetId = BRICK, extra = {}) => ({
  blockfolkLayerId: layerId, blockfolkAssetId: assetId, left, top, angle: 0, flipX: false,
  getScaledWidth: () => 100, getScaledHeight: () => 200, ...extra
});
const originObject = (grid, id) => ({ ...grid.origins.get(id) });
const sortedOrigins = (grid) => [...grid.origins].sort(([a], [b]) => a.localeCompare(b));

assert.deepEqual(Object.fromEntries(Object.entries(GRID_DIRECTIONS).map(([id, value]) => [id, [value.a, value.b, value.z, value.opposite]])), {
  '+A': [1, 0, 0, '-A'], '-A': [-1, 0, 0, '+A'], '+B': [0, 1, 0, '-B'], '-B': [0, -1, 0, '+B'], '+Z': [0, 0, 1, '-Z'], '-Z': [0, 0, -1, '+Z']
}, 'direction opposites and integer A/B/Z deltas must be exact');
assert.equal(profileForAsset(LOG), profileForAsset(BRICK), 'representative materials share one logical profile object');
assert.deepEqual(Object.keys(CONSTRUCTION_PROFILES), [LOG, BRICK], 'Stage 1 registry must contain only its representative assets');
assert.equal(new Set(profileForAsset(BRICK).directions.map((direction) => GRID_DIRECTIONS[direction].portId)).size, 6, 'one-cell block ports must be unique');

const rowEdges = [edge('e01', 'm0', 'm1', 'southEast'), edge('e12', 'm1', 'm2', 'southEast'), edge('e23', 'm2', 'm3', 'southEast')];
const rowMembers = ['m0', 'm1', 'm2', 'm3'].map((id, index) => member(id, index % 2 ? LOG : BRICK));
const row = buildComponentGrid(rowEdges, rowMembers, 'm2');
assert.equal(row.consistent, true); assert.equal(row.stableRoot, 'm0'); assert.equal(row.memberIds.size, 4);
assert.deepEqual(originObject(row, 'm0'), { a: 0, b: 0, z: 0 });
assert.deepEqual(originObject(row, 'm1'), { a: 1, b: 0, z: 0 });
assert.deepEqual(originObject(row, 'm2'), { a: 2, b: 0, z: 0 });
assert.deepEqual(originObject(row, 'm3'), { a: 3, b: 0, z: 0 }, 'third, fourth, and later members traverse normally');
const reversedRow = buildComponentGrid([...rowEdges].reverse(), [...rowMembers].reverse(), 'm1');
assert.deepEqual(sortedOrigins(reversedRow), sortedOrigins(row), 'component traversal must not depend on input order or requested member');

const bRow = buildComponentGrid([edge('b01', 'b0', 'b1', 'southWest'), edge('b12', 'b1', 'b2', 'southWest')], ['b0', 'b1', 'b2'].map((id) => member(id)), 'b2');
assert.deepEqual(originObject(bRow, 'b2'), { a: 0, b: 2, z: 0 }, 'B-axis rows must use B, not A');
const stack = buildComponentGrid([edge('z01', 'z0', 'z1', 'stackTop'), edge('z12', 'z1', 'z2', 'stackTop')], ['z0', 'z1', 'z2'].map((id) => member(id)), 'z0');
assert.deepEqual(originObject(stack, 'z2'), { a: 0, b: 0, z: 2 }, 'Z stacks must advance whole tiers');
const corner = buildComponentGrid([edge('c01', 'c0', 'c1', 'southEast'), edge('c12', 'c1', 'c2', 'southWest')], ['c0', 'c1', 'c2'].map((id) => member(id)), 'c0');
assert.deepEqual(originObject(corner, 'c2'), { a: 1, b: 1, z: 0 }, 'A/B corners must preserve both horizontal axes');

const sixtyFourEdges = Array.from({ length: 63 }, (_, index) => edge(`g${index}`, `g${index}`, `g${index + 1}`, 'southEast'));
const sixtyFour = buildComponentGrid(sixtyFourEdges, Array.from({ length: 64 }, (_, index) => member(`g${index}`, index % 2 ? LOG : BRICK)), 'g63');
assert.equal(sixtyFour.consistent, true); assert.equal(sixtyFour.memberIds.size, 64); assert.equal(sixtyFour.occupiedCells.size, 64);
assert.deepEqual(originObject(sixtyFour, 'g63'), { a: 63, b: 0, z: 0 }, 'the generated grid must not contain a hidden small assembly cap');

const agreeingCycle = buildComponentGrid([
  edge('cycle-a', 'cycle-root', 'cycle-a', 'southEast'),
  edge('cycle-b', 'cycle-root', 'cycle-b', 'southWest'),
  edge('cycle-c1', 'cycle-a', 'cycle-c', 'southWest'),
  edge('cycle-c2', 'cycle-b', 'cycle-c', 'southEast')
], ['cycle-root', 'cycle-a', 'cycle-b', 'cycle-c'].map((id) => member(id)), 'cycle-c');
assert.equal(agreeingCycle.consistent, true); assert.deepEqual(originObject(agreeingCycle, 'cycle-c'), { a: 0, b: 1, z: 0 }, 'an agreeing cycle is a valid component grid relative to its stable lexical root');

const contradictoryCycle = buildComponentGrid([
  edge('ca', 'r', 'a', 'southEast'), edge('cb', 'a', 'b', 'southWest'), edge('cc', 'r', 'b', 'southEast'), edge('cd', 'b', 'a', 'northEast')
], ['r', 'a', 'b'].map((id) => member(id)), 'r');
// The extra parallel logical route above is intentionally contradictory.
assert.equal(contradictoryCycle.consistent, false); assert.ok(contradictoryCycle.issues.some((issue) => issue.type === 'contradictory-coordinate'));
const duplicate = buildComponentGrid([edge('d1', 'root', 'one', 'southEast'), edge('d2', 'root', 'two', 'southEast')], ['root', 'one', 'two'].map((id) => member(id)), 'root');
assert.equal(duplicate.consistent, false); assert.ok(duplicate.issues.some((issue) => issue.type === 'duplicate-occupancy'));
const legacy = buildComponentGrid([{ ...edge('legacy', 'l0', 'l1', 'southEast'), aAnchorId: 'right', bAnchorId: 'left' }], ['l0', 'l1'].map((id) => member(id)), 'l0');
assert.equal(legacy.consistent, false); assert.ok(legacy.issues.some((issue) => issue.type === 'unsupported-edge'), 'legacy cardinal links remain readable but cannot extend a new grid');

const boundary = boundaryPortsFor(profileForAsset(BRICK), { a: 0, b: 0, z: 0 }, new Map(), 'p0');
assert.equal(boundary.length, 6);
const occupiedNeighbor = new Map([['1,0,0', { layerId: 'p1' }]]);
assert.equal(boundaryPortsFor(profileForAsset(BRICK), { a: 0, b: 0, z: 0 }, occupiedNeighbor, 'p0').some((port) => port.direction === '+A'), false, 'an occupied neighbor is not an exposed boundary face');
assert.equal(row.usedPorts.has('m1:southEast'), true); assert.equal(row.usedPorts.has('m2:northWest'), true, 'used endpoint capacity is derived from persisted edges');

const movingPairEdges = [edge('moving-b', 'ms0', 'ms1', 'southWest')];
const targetPairEdges = [edge('target-b', 'ts0', 'ts1', 'southWest')];
const consensusObjects = {
  moving: [object('ms0', 0, 0), object('ms1', -40, 40, LOG)],
  target: [object('ts0', 45, 42, LOG), object('ts1', 5, 82)]
};
const consensus = findGridSnapCandidate({
  movingObjects: consensusObjects.moving, stationaryObjects: consensusObjects.target,
  connections: [...movingPairEdges, ...targetPairEdges], screenTolerance: 5.5, ambiguityScreen: SNAP_AMBIGUITY_SCREEN_PX
});
assert.equal(consensus.status, 'ok'); assert.equal(consensus.pose.support, 2, 'same-pose supporting contacts reinforce one pose');
assert.ok(Math.abs(consensus.dx - 5) < .001 && Math.abs(consensus.dy - 2) < .001);

const ambiguousMoving = [object('amb-moving', 0, 0)];
const ambiguousTargets = [object('amb-a', 50, 40, LOG), object('amb-b', -50, 40)];
const ambiguousBefore = JSON.stringify({ ambiguousMoving, ambiguousTargets });
const ambiguous = findGridSnapCandidate({ movingObjects: ambiguousMoving, stationaryObjects: ambiguousTargets, screenTolerance: 30, ambiguityScreen: 2 });
assert.equal(ambiguous.status, 'ambiguous'); assert.equal(ambiguous.poses.length, 2, 'different tied integer poses must reject explicitly');
assert.equal(JSON.stringify({ ambiguousMoving, ambiguousTargets }), ambiguousBefore, 'candidate inspection must be mutation-free');

const clearWinner = findGridSnapCandidate({ movingObjects: ambiguousMoving, stationaryObjects: [object('near', 49, 40), object('far', -54, 40, LOG)], screenTolerance: 30, ambiguityScreen: 2 });
assert.equal(clearWinner.status, 'ok', 'candidate distances outside the ambiguity threshold select the closer pose');
const thresholdTie = findGridSnapCandidate({ movingObjects: ambiguousMoving, stationaryObjects: [object('near2', 49, 40), object('tie2', -51, 40, LOG)], screenTolerance: 30, ambiguityScreen: 2 });
assert.equal(thresholdTie.status, 'ambiguous', 'the ambiguity threshold includes its tested boundary');

const occupiedConnections = [edge('full', 'full-neighbor', 'full-target', 'southEast')];
const occupied = findGridSnapCandidate({
  movingObjects: [object('full-moving', 4, 1)],
  stationaryObjects: [object('full-neighbor', 0, 0, LOG), object('full-target', 40, 40)],
  connections: occupiedConnections, screenTolerance: 90, ambiguityScreen: 2
});
assert.equal(occupied.status, 'occupied', 'the visibly closest filled cell must report occupied instead of selecting a farther face');

const none = findGridSnapCandidate({ movingObjects: [object('none-moving', 0, 0)], stationaryObjects: [object('none-target', 500, 500)], screenTolerance: 30 });
assert.equal(none.status, 'none');
const reversedConsensus = findGridSnapCandidate({ movingObjects: [...consensusObjects.moving].reverse(), stationaryObjects: [...consensusObjects.target].reverse(), connections: [...targetPairEdges, ...movingPairEdges].reverse(), screenTolerance: 5.5 });
assert.equal(reversedConsensus.status, 'ok'); assert.equal(reversedConsensus.pose.poseKey, consensus.pose.poseKey); assert.equal(reversedConsensus.canonicalContact.source.blockfolkLayerId, consensus.canonicalContact.source.blockfolkLayerId, 'candidate selection must be deterministic under reversed iteration');

const twoPlusTwoConnection = edge('merge', 'ms0', 'ts0', 'southEast', BRICK, LOG);
const merged = buildComponentGrid([...movingPairEdges, ...targetPairEdges, twoPlusTwoConnection], [...consensusObjects.moving, ...consensusObjects.target], 'ts1');
assert.equal(merged.consistent, true); assert.equal(merged.memberIds.size, 4, 'a 2 + 2 merge must become one component');
assert.equal([...removeMemberConnections([...movingPairEdges, ...targetPairEdges, twoPlusTwoConnection], 'ms0')].length, 1, 'Unsnap removes all immediate selected-member links and leaves unrelated topology');

const bridgeEdges = [edge('bridge-1', 'left', 'bridge', 'southEast'), edge('bridge-2', 'bridge', 'right', 'southEast')];
const bridgeRemoved = removeMemberConnections(bridgeEdges, 'bridge');
assert.deepEqual(bridgeRemoved, [], 'removing a bridge member can split the graph into multiple components without rewriting geometry');
const copied = duplicateConnections(rowEdges, new Map(rowMembers.map(({ layerId }) => [layerId, `copy-${layerId}`])));
assert.equal(copied.length, rowEdges.length); assert.equal(new Set(copied.map((item) => item.id)).size, copied.length); assert.ok(copied.every((item) => item.aLayerId.startsWith('copy-') && item.bLayerId.startsWith('copy-')), 'Copy preserves topology with fresh IDs');

assert.equal(constructionOrientation(object('orientation-a', 0, 0)), 'iso-a');
assert.equal(constructionOrientation(object('orientation-b', 0, 0, BRICK, { flipX: true, angle: 180 })), 'iso-b');
assert.equal(constructionOrientation(object('turned', 0, 0, BRICK, { angle: 15 })), null, 'a loose turned construction sticker cannot create a false grid snap');
assert.equal(gridCellKey({ a: -2, b: 4, z: 1 }), '-2,4,1');

console.log('BLOCKFOLK_CONSTRUCTION_GRID_SCENARIOS PASS', JSON.stringify({
  pilotProfiles: Object.keys(CONSTRUCTION_PROFILES).length,
  generatedMembers: sixtyFour.memberIds.size,
  consensusSupport: consensus.pose.support,
  ambiguity: ambiguous.status,
  occupied: occupied.status
}));
