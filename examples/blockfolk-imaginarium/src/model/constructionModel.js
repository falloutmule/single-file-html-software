import { BLOCKFOLK_DEFAULT_WORLD_EXTENT } from './blockfolkStickerLibrary.js';
import { createStableId } from './ids.js';

// These anchors describe the painted footprint rather than the transparent PNG
// rectangle. Values are fractions of the scaled half-width/half-height.
const BLOCK_IDS = [
  'sticker-blockfolk-grass-dirt-block', 'sticker-blockfolk-dirt-block', 'sticker-blockfolk-stone-block',
  'sticker-blockfolk-sand-block', 'sticker-blockfolk-snow-block', 'sticker-blockfolk-water-block',
  'sticker-blockfolk-lava-block', 'sticker-blockfolk-wood-log-block', 'sticker-blockfolk-leaf-block',
  'sticker-blockfolk-brick-stone-block'
];
export const STONE_DOOR_ASSET_ID = 'sticker-blockfolk-stone-door';
const FACE_IDS = [
  'sticker-blockfolk-wood-door', STONE_DOOR_ASSET_ID,
  'sticker-blockfolk-square-window', 'sticker-blockfolk-round-window'
];

export const DOORWAY_BLOCK_ASSET_IDS = Object.freeze([
  'sticker-blockfolk-brick-stone-block',
  'sticker-blockfolk-wood-log-block'
]);

export const BUILDING_UNIT_WORLD_EXTENT = BLOCKFOLK_DEFAULT_WORLD_EXTENT;
export const DOORWAY_COLUMN_PITCH = 96.1322435461142;
export const DOORWAY_TIER_RISE = 68.8194771631714;
export const DOORWAY_SCALE_TOLERANCE = .01;
export const DOORWAY_ALIGNMENT_EPSILON = .75;

export const AUTHORED_CONSTRUCTION_GEOMETRY = Object.freeze({
  [STONE_DOOR_ASSET_ID]: Object.freeze({
    width: 261, height: 424,
    visibleBounds: Object.freeze({ left: 25, top: 25, right: 235, bottom: 398 }),
    origin: Object.freeze({ x: 130.5, y: 398 })
  }),
  'sticker-blockfolk-brick-stone-block': Object.freeze({
    width: 273, height: 325,
    visibleBounds: Object.freeze({ left: 25, top: 25, right: 247, bottom: 300 }),
    origin: Object.freeze({ x: 136.5, y: 300 })
  }),
  'sticker-blockfolk-wood-log-block': Object.freeze({
    width: 274, height: 326,
    visibleBounds: Object.freeze({ left: 24, top: 24, right: 249, bottom: 301 }),
    origin: Object.freeze({ x: 137, y: 301 })
  })
});

export const DOORWAY_SLOT_DEFINITIONS = Object.freeze([
  Object.freeze({ doorAnchorId: 'doorJambLowerLeft', blockAnchorId: 'blockJambLowerLeft', column: -1, tier: 0, role: 'lower', priority: 10 }),
  Object.freeze({ doorAnchorId: 'doorJambLowerRight', blockAnchorId: 'blockJambLowerRight', column: 1, tier: 0, role: 'lower', priority: 20 }),
  Object.freeze({ doorAnchorId: 'doorJambUpperLeft', blockAnchorId: 'blockJambUpperLeft', column: -1, tier: 1, role: 'upper', priority: 30 }),
  Object.freeze({ doorAnchorId: 'doorJambUpperRight', blockAnchorId: 'blockJambUpperRight', column: 1, tier: 1, role: 'upper', priority: 40 }),
  Object.freeze({ doorAnchorId: 'doorLintel', blockAnchorId: 'blockLintel', column: 0, tier: 2, role: 'lintel', priority: 50 })
]);

export const DOORWAY_FORBIDDEN_CELLS = Object.freeze([
  Object.freeze({ column: 0, tier: 0 }),
  Object.freeze({ column: 0, tier: 1 })
]);

const edgeAnchors = (x, y, extra = {}) => Object.freeze({
  left: Object.freeze({ x: -x, y: 0, nx: -1, ny: 0, mate: 'right', ...extra }), right: Object.freeze({ x, y: 0, nx: 1, ny: 0, mate: 'left', ...extra }),
  top: Object.freeze({ x: 0, y: -y, nx: 0, ny: -1, mate: 'bottom', ...extra }), bottom: Object.freeze({ x: 0, y, nx: 0, ny: 1, mate: 'top', ...extra })
});

// A BlockFolk cube is an isometric terrain cell. The old cardinal sockets stay
// validation-only so earlier saved assemblies remain loadable.
const blockAnchors = Object.freeze({
  ...edgeAnchors(.72, .66, { legacy: true }),
  northWest: Object.freeze({ x: -.4, y: -.2, nx: -1, ny: -1, mate: 'southEast', priority: 100 }),
  northEast: Object.freeze({ x: .4, y: -.2, nx: 1, ny: -1, mate: 'southWest', priority: 110 }),
  southWest: Object.freeze({ x: -.4, y: .2, nx: -1, ny: 1, mate: 'northEast', priority: 120 }),
  southEast: Object.freeze({ x: .4, y: .2, nx: 1, ny: 1, mate: 'northWest', priority: 130 }),
  stackTop: Object.freeze({ x: 0, y: -.425, nx: 0, ny: -1, mate: 'stackBase', priority: 140 }),
  stackBase: Object.freeze({ x: 0, y: .425, nx: 0, ny: 1, mate: 'stackTop', priority: 150 }),
  frontFace: Object.freeze({ x: 0, y: 0, nx: 0, ny: 1, mate: 'backFace', priority: 160 })
});
const buildingFaceAnchors = Object.freeze({
  ...edgeAnchors(.68, .84),
  backFace: Object.freeze({ x: 0, y: 0, nx: 0, ny: -1, mate: 'frontFace', priority: 160 })
});

const doorwayDoorAnchors = Object.freeze(Object.fromEntries([
  ...DOORWAY_SLOT_DEFINITIONS.map((slot) => [slot.doorAnchorId, Object.freeze({
    mate: slot.blockAnchorId, column: slot.column, tier: slot.tier,
    role: slot.role, priority: slot.priority, authored: 'doorway-cell'
  })]),
  ['backFace', Object.freeze({ x: 0, y: 0, nx: 0, ny: -1, mate: 'frontFace', legacy: true, priority: 999 })]
]));

const doorwayBlockAnchors = Object.freeze({
  ...blockAnchors,
  ...Object.fromEntries(DOORWAY_SLOT_DEFINITIONS.map((slot) => [slot.blockAnchorId, Object.freeze({
    mate: slot.doorAnchorId, role: slot.role, priority: slot.priority,
    authored: 'visible-bottom-origin'
  })]))
});

export const SNAP_TOLERANCE_SCREEN_PX = 80;
export const SNAPPABLE_ASSET_METADATA = Object.freeze(Object.fromEntries([
  ...BLOCK_IDS.map((id) => [id, Object.freeze({
    kind: DOORWAY_BLOCK_ASSET_IDS.includes(id) ? 'doorway-block' : 'block',
    anchors: DOORWAY_BLOCK_ASSET_IDS.includes(id) ? doorwayBlockAnchors : blockAnchors,
    geometry: AUTHORED_CONSTRUCTION_GEOMETRY[id] || null
  })]),
  ...FACE_IDS.map((id) => [id, Object.freeze({ kind: 'building-face', anchors: buildingFaceAnchors })]),
  [STONE_DOOR_ASSET_ID, Object.freeze({ kind: 'stone-doorway', anchors: doorwayDoorAnchors, geometry: AUTHORED_CONSTRUCTION_GEOMETRY[STONE_DOOR_ASSET_ID] })]
]));

export const SNAPPABLE_ASSET_IDS = Object.freeze(Object.keys(SNAPPABLE_ASSET_METADATA));

export function isSnappableAsset(assetId) { return Object.hasOwn(SNAPPABLE_ASSET_METADATA, assetId); }
export function anchorsForAsset(assetId) { return SNAPPABLE_ASSET_METADATA[assetId]?.anchors || null; }

function rotate(x, y, degrees = 0) {
  const radians = degrees * Math.PI / 180; const cosine = Math.cos(radians); const sine = Math.sin(radians);
  return { x: x * cosine - y * sine, y: x * sine + y * cosine };
}

function objectScale(object, axis, sourceExtent) {
  const explicit = Math.abs(Number(axis === 'x' ? object?.scaleX : object?.scaleY));
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const scaled = Math.abs(Number(axis === 'x' ? object?.getScaledWidth?.() : object?.getScaledHeight?.()));
  return Number.isFinite(scaled) && scaled > 0 && sourceExtent > 0 ? scaled / sourceExtent : 1;
}

export function authoredPointToWorld(object, point) {
  const geometry = AUTHORED_CONSTRUCTION_GEOMETRY[object?.blockfolkAssetId];
  if (!geometry || !point) return null;
  const scaleX = objectScale(object, 'x', geometry.width); const scaleY = objectScale(object, 'y', geometry.height);
  const flipX = object?.flipX ? -1 : 1; const flipY = object?.flipY ? -1 : 1;
  const localX = (Number(point.x) - geometry.width / 2) * scaleX * flipX;
  const localY = (Number(point.y) - geometry.height / 2) * scaleY * flipY;
  const offset = rotate(localX, localY, Number(object?.angle || 0));
  return { x: Number(object?.left || 0) + offset.x, y: Number(object?.top || 0) + offset.y };
}

export function constructionScaleMultiplier(object) {
  const geometry = AUTHORED_CONSTRUCTION_GEOMETRY[object?.blockfolkAssetId];
  if (!geometry) return null;
  const defaultScale = BUILDING_UNIT_WORLD_EXTENT / geometry.height;
  const multiplierX = objectScale(object, 'x', geometry.width) / defaultScale;
  const multiplierY = objectScale(object, 'y', geometry.height) / defaultScale;
  return (multiplierX + multiplierY) / 2;
}

export function doorwayScaleCompatible(first, second) {
  const a = constructionScaleMultiplier(first); const b = constructionScaleMultiplier(second);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), .0001) <= DOORWAY_SCALE_TOLERANCE;
}

export function doorwayCellPoint(door, column, tier) {
  if (door?.blockfolkAssetId !== STONE_DOOR_ASSET_ID) return null;
  const origin = authoredPointToWorld(door, AUTHORED_CONSTRUCTION_GEOMETRY[STONE_DOOR_ASSET_ID].origin);
  if (!origin) return null;
  const multiplier = constructionScaleMultiplier(door) || 1;
  const flipX = door.flipX ? -1 : 1; const flipY = door.flipY ? -1 : 1;
  const logicalOffset = rotate(
    Number(column) * DOORWAY_COLUMN_PITCH * multiplier * flipX,
    -Number(tier) * DOORWAY_TIER_RISE * multiplier * flipY,
    Number(door.angle || 0)
  );
  return { x: origin.x + logicalOffset.x, y: origin.y + logicalOffset.y };
}

export function objectAnchor(object, anchorId) {
  const anchor = anchorsForAsset(object?.blockfolkAssetId)?.[anchorId];
  if (!anchor) return null;
  let point; let normal;
  if (anchor.authored === 'doorway-cell') {
    point = doorwayCellPoint(object, anchor.column, anchor.tier);
    normal = rotate(0, -1, Number(object.angle || 0));
  } else if (anchor.authored === 'visible-bottom-origin') {
    point = authoredPointToWorld(object, AUTHORED_CONSTRUCTION_GEOMETRY[object.blockfolkAssetId].origin);
    normal = rotate(0, 1, Number(object.angle || 0));
  } else {
    const width = Math.abs(Number(object.getScaledWidth?.() || 0)) / 2;
    const height = Math.abs(Number(object.getScaledHeight?.() || 0)) / 2;
    const flipX = object?.flipX ? -1 : 1; const flipY = object?.flipY ? -1 : 1;
    const offset = rotate(anchor.x * width * flipX, anchor.y * height * flipY, Number(object.angle || 0));
    point = { x: Number(object.left || 0) + offset.x, y: Number(object.top || 0) + offset.y };
    normal = rotate(anchor.nx * flipX, anchor.ny * flipY, Number(object.angle || 0));
  }
  if (!point) return null;
  return {
    id: anchorId, mate: anchor.mate, x: point.x, y: point.y,
    nx: normal.x, ny: normal.y, priority: Number(anchor.priority || 500),
    role: anchor.role || null, authored: anchor.authored || null
  };
}

export function allObjectAnchors(object) {
  const anchors = anchorsForAsset(object?.blockfolkAssetId);
  return anchors ? Object.entries(anchors).filter(([, anchor]) => !anchor.legacy).map(([id]) => objectAnchor(object, id)).filter(Boolean) : [];
}

export function connectedLayerIds(connections = [], layerId) {
  const visited = new Set([layerId]); const queue = [layerId];
  while (queue.length) {
    const current = queue.shift();
    for (const connection of connections) {
      const next = connection.aLayerId === current ? connection.bLayerId : connection.bLayerId === current ? connection.aLayerId : null;
      if (next && !visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  return visited;
}

export function hasAssembly(connections = [], layerId) { return connectedLayerIds(connections, layerId).size > 1; }

export function validConnections(connections = [], layerIds = new Set()) {
  const seen = new Set(); const result = [];
  for (const connection of connections || []) {
    if (!connection || typeof connection.id !== 'string' || !connection.id || typeof connection.aLayerId !== 'string' || typeof connection.bLayerId !== 'string') continue;
    if (!layerIds.has(connection.aLayerId) || !layerIds.has(connection.bLayerId) || connection.aLayerId === connection.bLayerId) continue;
    if (!anchorsForAsset(connection.aAssetId)?.[connection.aAnchorId] || !anchorsForAsset(connection.bAssetId)?.[connection.bAnchorId]) continue;
    const pair = [connection.aLayerId, connection.bLayerId].sort().join('::');
    if (seen.has(pair)) continue;
    seen.add(pair); result.push({ id: connection.id, aLayerId: connection.aLayerId, bLayerId: connection.bLayerId, aAssetId: connection.aAssetId, bAssetId: connection.bAssetId, aAnchorId: connection.aAnchorId, bAnchorId: connection.bAnchorId });
  }
  return result;
}

export function makeConnection({ source, sourceAnchor, target, targetAnchor }) {
  return {
    id: createStableId('blockfolk-connection'),
    aLayerId: source.blockfolkLayerId, bLayerId: target.blockfolkLayerId,
    aAssetId: source.blockfolkAssetId, bAssetId: target.blockfolkAssetId,
    aAnchorId: sourceAnchor.id, bAnchorId: targetAnchor.id
  };
}

function endpointKey(layerId, anchorId) { return `${layerId}::${anchorId}`; }
function connectionPairKey(firstLayerId, secondLayerId) { return [firstLayerId, secondLayerId].sort().join('::'); }

function usedConnectionState(connections = []) {
  const endpoints = new Set(); const pairs = new Set();
  for (const connection of connections) {
    endpoints.add(endpointKey(connection.aLayerId, connection.aAnchorId));
    endpoints.add(endpointKey(connection.bLayerId, connection.bAnchorId));
    pairs.add(connectionPairKey(connection.aLayerId, connection.bLayerId));
  }
  return { endpoints, pairs };
}

function isDoorwayPair(source, target, sourceAnchor, targetAnchor) {
  return sourceAnchor.authored && targetAnchor.authored
    && ((source.blockfolkAssetId === STONE_DOOR_ASSET_ID && DOORWAY_BLOCK_ASSET_IDS.includes(target.blockfolkAssetId))
      || (target.blockfolkAssetId === STONE_DOOR_ASSET_ID && DOORWAY_BLOCK_ASSET_IDS.includes(source.blockfolkAssetId)));
}

function compareCandidates(first, second) {
  if (Math.abs(first.distance - second.distance) > 1e-9) return first.distance - second.distance;
  return String(first.source.blockfolkLayerId).localeCompare(String(second.source.blockfolkLayerId))
    || String(first.target.blockfolkLayerId).localeCompare(String(second.target.blockfolkLayerId))
    || first.sourceAnchor.priority - second.sourceAnchor.priority
    || String(first.sourceAnchor.id).localeCompare(String(second.sourceAnchor.id))
    || first.targetAnchor.priority - second.targetAnchor.priority
    || String(first.targetAnchor.id).localeCompare(String(second.targetAnchor.id));
}

export function findSnapProposal({ movingObjects, stationaryObjects, worldTolerance, connections = [] }) {
  const { endpoints, pairs } = usedConnectionState(connections);
  const candidates = []; let scaleRejected = false;
  for (const source of movingObjects) for (const sourceAnchor of allObjectAnchors(source)) for (const target of stationaryObjects) for (const targetAnchor of allObjectAnchors(target)) {
    if (sourceAnchor.mate !== targetAnchor.id || targetAnchor.mate !== sourceAnchor.id) continue;
    if (pairs.has(connectionPairKey(source.blockfolkLayerId, target.blockfolkLayerId))) continue;
    if (endpoints.has(endpointKey(source.blockfolkLayerId, sourceAnchor.id)) || endpoints.has(endpointKey(target.blockfolkLayerId, targetAnchor.id))) continue;
    const dx = targetAnchor.x - sourceAnchor.x; const dy = targetAnchor.y - sourceAnchor.y; const distance = Math.hypot(dx, dy);
    if (distance > worldTolerance) continue;
    if (isDoorwayPair(source, target, sourceAnchor, targetAnchor) && !doorwayScaleCompatible(source, target)) { scaleRejected = true; continue; }
    candidates.push({ source, target, sourceAnchor, targetAnchor, dx, dy, distance });
  }
  candidates.sort(compareCandidates);
  return { candidate: candidates[0] || null, rejectionReason: !candidates.length && scaleRejected ? 'scale' : null };
}

export function findSnapCandidate(options) { return findSnapProposal(options).candidate; }

export function doorwayPlacementConflict(objects = [], epsilon = DOORWAY_ALIGNMENT_EPSILON) {
  const doors = objects.filter((object) => object.blockfolkAssetId === STONE_DOOR_ASSET_ID);
  const blocks = objects.filter((object) => DOORWAY_BLOCK_ASSET_IDS.includes(object.blockfolkAssetId));
  for (const door of doors) for (const cell of DOORWAY_FORBIDDEN_CELLS) {
    const forbidden = doorwayCellPoint(door, cell.column, cell.tier);
    if (!forbidden) continue;
    for (const block of blocks) {
      const origin = authoredPointToWorld(block, AUTHORED_CONSTRUCTION_GEOMETRY[block.blockfolkAssetId].origin);
      if (origin && Math.hypot(origin.x - forbidden.x, origin.y - forbidden.y) <= epsilon * Math.max(1, constructionScaleMultiplier(door) || 1)) return { kind: 'opening', door, block, cell };
    }
  }
  for (const door of doors) for (const slot of DOORWAY_SLOT_DEFINITIONS) {
    const point = doorwayCellPoint(door, slot.column, slot.tier); const occupying = [];
    for (const block of blocks) {
      const origin = authoredPointToWorld(block, AUTHORED_CONSTRUCTION_GEOMETRY[block.blockfolkAssetId].origin);
      if (origin && Math.hypot(origin.x - point.x, origin.y - point.y) <= epsilon * Math.max(1, constructionScaleMultiplier(door) || 1)) occupying.push(block);
    }
    if (occupying.length > 1) return { kind: 'duplicate', door, block: occupying.at(-1), slot, occupying };
  }
  return null;
}

export function alignedDoorwayCandidates({ objects = [], connections = [], seedLayerIds = new Set(), epsilon = DOORWAY_ALIGNMENT_EPSILON }) {
  const includedIds = new Set();
  for (const id of seedLayerIds) for (const connected of connectedLayerIds(connections, id)) includedIds.add(connected);
  const included = objects.filter((object) => includedIds.has(object.blockfolkLayerId));
  const doors = included.filter((object) => object.blockfolkAssetId === STONE_DOOR_ASSET_ID);
  const blocks = included.filter((object) => DOORWAY_BLOCK_ASSET_IDS.includes(object.blockfolkAssetId));
  const state = usedConnectionState(connections); const candidates = [];
  for (const door of doors) for (const slot of DOORWAY_SLOT_DEFINITIONS) for (const block of blocks) {
    if (!doorwayScaleCompatible(door, block)) continue;
    if (state.pairs.has(connectionPairKey(door.blockfolkLayerId, block.blockfolkLayerId))) continue;
    if (state.endpoints.has(endpointKey(door.blockfolkLayerId, slot.doorAnchorId)) || state.endpoints.has(endpointKey(block.blockfolkLayerId, slot.blockAnchorId))) continue;
    const doorAnchor = objectAnchor(door, slot.doorAnchorId); const blockAnchor = objectAnchor(block, slot.blockAnchorId);
    const distance = Math.hypot(doorAnchor.x - blockAnchor.x, doorAnchor.y - blockAnchor.y);
    if (distance > epsilon * Math.max(1, constructionScaleMultiplier(door) || 1)) continue;
    candidates.push({ source: door, target: block, sourceAnchor: doorAnchor, targetAnchor: blockAnchor, dx: 0, dy: 0, distance });
    state.pairs.add(connectionPairKey(door.blockfolkLayerId, block.blockfolkLayerId));
    state.endpoints.add(endpointKey(door.blockfolkLayerId, slot.doorAnchorId));
    state.endpoints.add(endpointKey(block.blockfolkLayerId, slot.blockAnchorId));
  }
  candidates.sort(compareCandidates);
  return candidates;
}

export function doorwayLayerRank(object, connections = []) {
  if (object?.blockfolkAssetId === STONE_DOOR_ASSET_ID) return 30;
  const connection = connections.find((item) => (item.aLayerId === object?.blockfolkLayerId || item.bLayerId === object?.blockfolkLayerId)
    && (item.aAssetId === STONE_DOOR_ASSET_ID || item.bAssetId === STONE_DOOR_ASSET_ID));
  if (!connection) return 15;
  const anchorId = connection.aLayerId === object.blockfolkLayerId ? connection.bAnchorId : connection.aAnchorId;
  const slot = DOORWAY_SLOT_DEFINITIONS.find((item) => item.doorAnchorId === anchorId);
  if (!slot) return 15;
  return slot.role === 'upper' || slot.role === 'lintel' ? 0 : 10;
}

export function duplicateConnections(connections, idMap) {
  return connections.filter((connection) => idMap.has(connection.aLayerId) && idMap.has(connection.bLayerId)).map((connection) => ({
    ...connection, id: createStableId('blockfolk-connection'), aLayerId: idMap.get(connection.aLayerId), bLayerId: idMap.get(connection.bLayerId)
  }));
}

export function removeMemberConnections(connections, layerId) { return connections.filter((connection) => connection.aLayerId !== layerId && connection.bLayerId !== layerId); }
