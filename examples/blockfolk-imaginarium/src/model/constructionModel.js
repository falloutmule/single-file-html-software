import { createStableId } from './ids.js';

// These anchors describe the painted footprint rather than the transparent PNG
// rectangle. Values are fractions of the scaled half-width/half-height.
// Keeping the metadata per asset makes future art revisions explicit and avoids
// accidentally treating transparent padding as a construction face.
const BLOCK_IDS = [
  'sticker-blockfolk-grass-dirt-block', 'sticker-blockfolk-dirt-block', 'sticker-blockfolk-stone-block',
  'sticker-blockfolk-sand-block', 'sticker-blockfolk-snow-block', 'sticker-blockfolk-water-block',
  'sticker-blockfolk-lava-block', 'sticker-blockfolk-wood-log-block', 'sticker-blockfolk-leaf-block',
  'sticker-blockfolk-brick-stone-block'
];
const FACE_IDS = [
  'sticker-blockfolk-wood-door', 'sticker-blockfolk-stone-door',
  'sticker-blockfolk-square-window', 'sticker-blockfolk-round-window'
];

const edgeAnchors = (x, y, extra = {}) => Object.freeze({
  left: Object.freeze({ x: -x, y: 0, nx: -1, ny: 0, mate: 'right', ...extra }), right: Object.freeze({ x, y: 0, nx: 1, ny: 0, mate: 'left', ...extra }),
  top: Object.freeze({ x: 0, y: -y, nx: 0, ny: -1, mate: 'bottom', ...extra }), bottom: Object.freeze({ x: 0, y, nx: 0, ny: 1, mate: 'top', ...extra })
});

// These center anchors describe the painted front of a block and the painted
// back of a door/window, so compatible faces can attach without treating the
// transparent source rectangle as visible artwork.
// A BlockFolk cube is an isometric terrain cell, not a rectangular tile. The
// four diamond sockets share the painted top-face edges; stackTop/stackBase
// align the visible vertical cube height. The old cardinal sockets remain only
// so pictures saved by the earlier implementation retain valid assemblies.
const blockAnchors = Object.freeze({
  ...edgeAnchors(.72, .66, { legacy: true }),
  northWest: Object.freeze({ x: -.4, y: -.2, nx: -1, ny: -1, mate: 'southEast' }),
  northEast: Object.freeze({ x: .4, y: -.2, nx: 1, ny: -1, mate: 'southWest' }),
  southWest: Object.freeze({ x: -.4, y: .2, nx: -1, ny: 1, mate: 'northEast' }),
  southEast: Object.freeze({ x: .4, y: .2, nx: 1, ny: 1, mate: 'northWest' }),
  stackTop: Object.freeze({ x: 0, y: -.425, nx: 0, ny: -1, mate: 'stackBase' }),
  stackBase: Object.freeze({ x: 0, y: .425, nx: 0, ny: 1, mate: 'stackTop' }),
  frontFace: Object.freeze({ x: 0, y: 0, nx: 0, ny: 1, mate: 'backFace' })
});
const buildingFaceAnchors = Object.freeze({ ...edgeAnchors(.68, .84), backFace: Object.freeze({ x: 0, y: 0, nx: 0, ny: -1, mate: 'frontFace' }) });

// This is intentionally measured on the screen, not in world units: an 80px
// magnetic catch area remains equally forgiving at every camera zoom.
export const SNAP_TOLERANCE_SCREEN_PX = 80;
export const SNAPPABLE_ASSET_METADATA = Object.freeze(Object.fromEntries(
  BLOCK_IDS.map((id) => [id, Object.freeze({ kind: 'block', anchors: blockAnchors })])
));

// Page@3 briefly allowed doors and windows to appear in generic saved edges.
// Keep those anchor identities for validation only; they are deliberately not
// exposed to candidate search or the Phase 0 Snap control.
const LEGACY_CONNECTION_ASSET_METADATA = Object.freeze(Object.fromEntries([
  ...Object.entries(SNAPPABLE_ASSET_METADATA),
  ...FACE_IDS.map((id) => [id, Object.freeze({ kind: 'building-face', anchors: buildingFaceAnchors })])
]));

export const SNAPPABLE_ASSET_IDS = Object.freeze(Object.keys(SNAPPABLE_ASSET_METADATA));

export function isSnappableAsset(assetId) { return Object.hasOwn(SNAPPABLE_ASSET_METADATA, assetId); }
export function anchorsForAsset(assetId) { return SNAPPABLE_ASSET_METADATA[assetId]?.anchors || null; }
function anchorsForConnectionAsset(assetId) { return LEGACY_CONNECTION_ASSET_METADATA[assetId]?.anchors || null; }

function rotate(x, y, degrees = 0) {
  const radians = degrees * Math.PI / 180; const cosine = Math.cos(radians); const sine = Math.sin(radians);
  return { x: x * cosine - y * sine, y: x * sine + y * cosine };
}

export function objectAnchor(object, anchorId) {
  const anchor = anchorsForAsset(object?.blockfolkAssetId)?.[anchorId];
  if (!anchor) return null;
  const width = Math.abs(Number(object.getScaledWidth?.() || 0)) / 2;
  const height = Math.abs(Number(object.getScaledHeight?.() || 0)) / 2;
  const offset = rotate(anchor.x * width, anchor.y * height, Number(object.angle || 0));
  const normal = rotate(anchor.nx, anchor.ny, Number(object.angle || 0));
  return { id: anchorId, mate: anchor.mate, x: Number(object.left || 0) + offset.x, y: Number(object.top || 0) + offset.y, nx: normal.x, ny: normal.y };
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
    if (!anchorsForConnectionAsset(connection.aAssetId)?.[connection.aAnchorId] || !anchorsForConnectionAsset(connection.bAssetId)?.[connection.bAnchorId]) continue;
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

export function findSnapCandidate({ movingObjects, stationaryObjects, worldTolerance }) {
  let best = null;
  for (const source of movingObjects) for (const sourceAnchor of allObjectAnchors(source)) for (const target of stationaryObjects) for (const targetAnchor of allObjectAnchors(target)) {
    if (sourceAnchor.mate !== targetAnchor.id || targetAnchor.mate !== sourceAnchor.id) continue;
    const dx = targetAnchor.x - sourceAnchor.x; const dy = targetAnchor.y - sourceAnchor.y; const distance = Math.hypot(dx, dy);
    if (distance > worldTolerance || (best && distance >= best.distance)) continue;
    best = { source, target, sourceAnchor, targetAnchor, dx, dy, distance };
  }
  return best;
}

export function duplicateConnections(connections, idMap) {
  return connections.filter((connection) => idMap.has(connection.aLayerId) && idMap.has(connection.bLayerId)).map((connection) => ({
    ...connection, id: createStableId('blockfolk-connection'), aLayerId: idMap.get(connection.aLayerId), bLayerId: idMap.get(connection.bLayerId)
  }));
}

export function removeMemberConnections(connections, layerId) { return connections.filter((connection) => connection.aLayerId !== layerId && connection.bLayerId !== layerId); }
