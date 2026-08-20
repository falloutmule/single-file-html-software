import { createStableId } from './ids.js';
import { ASSET_CONSTRUCTION_PROFILES } from './snap/assetProfiles.js';
import { resolveConstructionPlane } from './snap/coordinateTransforms.js';
import { SNAP_CONNECTION_SCHEMA_VERSION } from './snap/policy.js';
export { SNAP_CORE_RUNTIME_BOUNDARY } from './snap/runtimeBoundary.js';

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
export const DOOR_ASSET_IDS = Object.freeze([
  'sticker-blockfolk-wood-door', 'sticker-blockfolk-stone-door'
]);
const WINDOW_IDS = [
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

// Phase 0 safety boundary: the failed doorway experiment emitted these endpoint
// IDs into page@3 saves. They remain validation-only so those pictures load
// byte-for-byte, but allObjectAnchors() filters them and no new door connection
// can be proposed. Do not restore the old centered face-overlay fallback.
const legacyDoorAnchors = Object.freeze({
  doorJambLowerLeft: Object.freeze({ mate: 'blockJambLowerLeft', legacy: true }),
  doorJambLowerRight: Object.freeze({ mate: 'blockJambLowerRight', legacy: true }),
  doorJambUpperLeft: Object.freeze({ mate: 'blockJambUpperLeft', legacy: true }),
  doorJambUpperRight: Object.freeze({ mate: 'blockJambUpperRight', legacy: true }),
  doorLintel: Object.freeze({ mate: 'blockLintel', legacy: true }),
  backFace: Object.freeze({ mate: 'frontFace', legacy: true })
});
const legacyDoorwayBlockAnchors = Object.freeze({
  ...blockAnchors,
  blockJambLowerLeft: Object.freeze({ mate: 'doorJambLowerLeft', legacy: true }),
  blockJambLowerRight: Object.freeze({ mate: 'doorJambLowerRight', legacy: true }),
  blockJambUpperLeft: Object.freeze({ mate: 'doorJambUpperLeft', legacy: true }),
  blockJambUpperRight: Object.freeze({ mate: 'doorJambUpperRight', legacy: true }),
  blockLintel: Object.freeze({ mate: 'doorLintel', legacy: true })
});

// This is intentionally measured on the screen, not in world units: an 80px
// magnetic catch area remains equally forgiving at every camera zoom.
export const SNAP_TOLERANCE_SCREEN_PX = 80;
export const SNAPPABLE_ASSET_METADATA = Object.freeze(Object.fromEntries([
  ...BLOCK_IDS.map((id) => [id, Object.freeze({ kind: 'block', anchors: ['sticker-blockfolk-brick-stone-block', 'sticker-blockfolk-wood-log-block'].includes(id) ? legacyDoorwayBlockAnchors : blockAnchors, candidateEnabled: true })]),
  ...WINDOW_IDS.map((id) => [id, Object.freeze({ kind: 'building-face', anchors: buildingFaceAnchors, candidateEnabled: true })]),
  ...DOOR_ASSET_IDS.map((id) => [id, Object.freeze({ kind: 'door-validation-only', anchors: legacyDoorAnchors, candidateEnabled: false })])
]));

export const SNAPPABLE_ASSET_IDS = Object.freeze(Object.entries(SNAPPABLE_ASSET_METADATA).filter(([, metadata]) => metadata.candidateEnabled).map(([id]) => id));

export function isSnappableAsset(assetId) { return SNAPPABLE_ASSET_METADATA[assetId]?.candidateEnabled === true; }
export function anchorsForAsset(assetId) { return SNAPPABLE_ASSET_METADATA[assetId]?.anchors || null; }

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

export function isTypedSnapConnection(connection) {
  return connection?.schemaVersion === SNAP_CONNECTION_SCHEMA_VERSION
    && typeof connection?.aPortId === 'string' && typeof connection?.bPortId === 'string';
}

function asLayerMap(layers = []) {
  if (layers instanceof Map) return layers;
  return new Map((Array.isArray(layers) ? layers : []).map((layer) => [layer.layerId || layer.blockfolkLayerId, layer]));
}

function validRelativeTransform(transform) {
  return Number.isFinite(transform?.dx) && Number.isFinite(transform?.dy) && Number.isFinite(transform?.scale)
    && typeof transform?.orientation === 'string' && typeof transform?.flipped === 'boolean';
}

export function validConnections(connections = [], layerIds = new Set(), layers = []) {
  const seen = new Set(); const endpointOccupancy = new Map(); const result = []; const layerMap = asLayerMap(layers);
  for (const connection of connections || []) {
    if (!connection || typeof connection.id !== 'string' || !connection.id || typeof connection.aLayerId !== 'string' || typeof connection.bLayerId !== 'string') continue;
    if (!layerIds.has(connection.aLayerId) || !layerIds.has(connection.bLayerId) || connection.aLayerId === connection.bLayerId) continue;
    const pair = [connection.aLayerId, connection.bLayerId].sort().join('::');
    if (seen.has(pair)) continue;
    if (isTypedSnapConnection(connection)) {
      const aProfile = ASSET_CONSTRUCTION_PROFILES[connection.aAssetId]; const bProfile = ASSET_CONSTRUCTION_PROFILES[connection.bAssetId];
      const aPort = aProfile?.ports?.find((port) => port.id === connection.aPortId); const bPort = bProfile?.ports?.find((port) => port.id === connection.bPortId);
      const aLayer = layerMap.get(connection.aLayerId); const bLayer = layerMap.get(connection.bLayerId);
      if (!aProfile?.productionEnabled || !bProfile?.productionEnabled || !aPort || !bPort || !validRelativeTransform(connection.relativeTransform)) continue;
      if (!aPort.compatibleTypes.includes(bPort.type) || !bPort.compatibleTypes.includes(aPort.type)) continue;
      if (aLayer && (aLayer.assetId || aLayer.blockfolkAssetId) !== connection.aAssetId) continue;
      if (bLayer && (bLayer.assetId || bLayer.blockfolkAssetId) !== connection.bAssetId) continue;
      if (resolveConstructionPlane(aProfile, aPort, aLayer || {}, connection.plane) !== connection.plane
        || resolveConstructionPlane(bProfile, bPort, bLayer || {}, connection.plane) !== connection.plane) continue;
      const aEndpoint = `${connection.aLayerId}::${connection.aPortId}`; const bEndpoint = `${connection.bLayerId}::${connection.bPortId}`;
      const nextA = (endpointOccupancy.get(aEndpoint) || 0) + 1; const nextB = (endpointOccupancy.get(bEndpoint) || 0) + 1;
      if (nextA > aPort.capacity || nextB > bPort.capacity) continue;
      endpointOccupancy.set(aEndpoint, nextA); endpointOccupancy.set(bEndpoint, nextB); seen.add(pair);
      result.push({ ...connection, relativeTransform: { ...connection.relativeTransform } });
      continue;
    }
    if (!anchorsForAsset(connection.aAssetId)?.[connection.aAnchorId] || !anchorsForAsset(connection.bAssetId)?.[connection.bAnchorId]) continue;
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
    ...connection, id: createStableId(isTypedSnapConnection(connection) ? 'blockfolk-snap-connection' : 'blockfolk-connection'), aLayerId: idMap.get(connection.aLayerId), bLayerId: idMap.get(connection.bLayerId),
    ...(connection.relativeTransform ? { relativeTransform: { ...connection.relativeTransform } } : {})
  }));
}

export function removeMemberConnections(connections, layerId) { return connections.filter((connection) => connection.aLayerId !== layerId && connection.bLayerId !== layerId); }
