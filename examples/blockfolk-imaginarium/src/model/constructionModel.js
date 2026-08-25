import { createStableId } from './ids.js';
import { BLOCKFOLK_DEFAULT_WORLD_EXTENT } from './blockfolkStickerLibrary.js';

const ALL_BLOCK_IDS = Object.freeze([
  'sticker-blockfolk-grass-dirt-block', 'sticker-blockfolk-dirt-block', 'sticker-blockfolk-stone-block',
  'sticker-blockfolk-sand-block', 'sticker-blockfolk-snow-block', 'sticker-blockfolk-water-block',
  'sticker-blockfolk-lava-block', 'sticker-blockfolk-wood-log-block', 'sticker-blockfolk-leaf-block',
  'sticker-blockfolk-brick-stone-block'
]);
const PILOT_BLOCK_IDS = Object.freeze([
  'sticker-blockfolk-wood-log-block',
  'sticker-blockfolk-brick-stone-block'
]);
const FACE_IDS = Object.freeze([
  'sticker-blockfolk-wood-door', 'sticker-blockfolk-stone-door',
  'sticker-blockfolk-square-window', 'sticker-blockfolk-round-window'
]);

export const GRID_DIRECTIONS = Object.freeze({
  '+A': Object.freeze({ a: 1, b: 0, z: 0, opposite: '-A', portId: 'southEast' }),
  '-A': Object.freeze({ a: -1, b: 0, z: 0, opposite: '+A', portId: 'northWest' }),
  '+B': Object.freeze({ a: 0, b: 1, z: 0, opposite: '-B', portId: 'southWest' }),
  '-B': Object.freeze({ a: 0, b: -1, z: 0, opposite: '+B', portId: 'northEast' }),
  '+Z': Object.freeze({ a: 0, b: 0, z: 1, opposite: '-Z', portId: 'stackTop' }),
  '-Z': Object.freeze({ a: 0, b: 0, z: -1, opposite: '+Z', portId: 'stackBase' })
});
export const PORT_DIRECTION = Object.freeze(Object.fromEntries(
  Object.entries(GRID_DIRECTIONS).map(([direction, value]) => [value.portId, direction])
));

export const CANONICAL_BLOCK_EXTENT_WORLD = BLOCKFOLK_DEFAULT_WORLD_EXTENT;
export const CANONICAL_Z_TIER_WORLD = 73.1;
export const Z_TIER_EXTENT_RATIO = CANONICAL_Z_TIER_WORLD / CANONICAL_BLOCK_EXTENT_WORLD;

const edgeAnchors = (x, y, extra = {}) => Object.freeze({
  left: Object.freeze({ x: -x, y: 0, nx: -1, ny: 0, mate: 'right', ...extra }),
  right: Object.freeze({ x, y: 0, nx: 1, ny: 0, mate: 'left', ...extra }),
  top: Object.freeze({ x: 0, y: -y, nx: 0, ny: -1, mate: 'bottom', ...extra }),
  bottom: Object.freeze({ x: 0, y, nx: 0, ny: 1, mate: 'top', ...extra })
});

// Fractions are accepted painted-cell calibration, not transparent PNG bounds.
// A/B retain the physically working Stage 1 geometry. Z derives from the named
// 73.1-world-unit canonical tier and scales with the block extent. Logical grid
// relations remain authoritative; calibration only projects them onto the art.
const blockAnchors = Object.freeze({
  ...edgeAnchors(.72, .66, { legacy: true }),
  northWest: Object.freeze({ x: -.4, y: -.2, nx: -1, ny: -1, mate: 'southEast' }),
  northEast: Object.freeze({ x: .4, y: -.2, nx: 1, ny: -1, mate: 'southWest' }),
  southWest: Object.freeze({ x: -.4, y: .2, nx: -1, ny: 1, mate: 'northEast' }),
  southEast: Object.freeze({ x: .4, y: .2, nx: 1, ny: 1, mate: 'northWest' }),
  stackTop: Object.freeze({ x: 0, y: -Z_TIER_EXTENT_RATIO, nx: 0, ny: -1, mate: 'stackBase' }),
  stackBase: Object.freeze({ x: 0, y: Z_TIER_EXTENT_RATIO, nx: 0, ny: 1, mate: 'stackTop' }),
  frontFace: Object.freeze({ x: 0, y: 0, nx: 0, ny: 1, mate: 'backFace' })
});
const buildingFaceAnchors = Object.freeze({
  ...edgeAnchors(.68, .84),
  backFace: Object.freeze({ x: 0, y: 0, nx: 0, ny: -1, mate: 'frontFace' })
});

const ONE_CELL_BLOCK_PROFILE = Object.freeze({
  id: 'blockfolk-one-cell-block@1', kind: 'block', calibrationVersion: 1,
  footprint: Object.freeze([Object.freeze({ a: 0, b: 0, z: 0 })]),
  directions: Object.freeze(Object.keys(GRID_DIRECTIONS)),
  supportedOrientations: Object.freeze(['iso-a', 'iso-b']),
  anchors: blockAnchors,
  visibleOrigin: Object.freeze({ x: 0, y: 0 })
});

// Stage 1 registers only the two representative assets. Enabling another
// material is a registry-only Stage 2 change; the engine has no asset-pair path.
export const CONSTRUCTION_PROFILES = Object.freeze(Object.fromEntries(
  PILOT_BLOCK_IDS.map((assetId) => [assetId, ONE_CELL_BLOCK_PROFILE])
));
export const SNAPPABLE_ASSET_METADATA = Object.freeze(Object.fromEntries(
  Object.entries(CONSTRUCTION_PROFILES).map(([assetId, profile]) => [assetId, Object.freeze({ kind: profile.kind, anchors: profile.anchors, profile })])
));
export const SNAPPABLE_ASSET_IDS = Object.freeze(Object.keys(CONSTRUCTION_PROFILES));
export const ALL_BLOCK_ASSET_IDS = ALL_BLOCK_IDS;

// Page@3 readers retain every historic block/face anchor. Reader compatibility
// is not a second candidate engine: only CONSTRUCTION_PROFILES can extend a grid.
const LEGACY_CONNECTION_ASSET_METADATA = Object.freeze(Object.fromEntries([
  ...ALL_BLOCK_IDS.map((id) => [id, Object.freeze({ kind: 'block', anchors: blockAnchors })]),
  ...FACE_IDS.map((id) => [id, Object.freeze({ kind: 'building-face', anchors: buildingFaceAnchors })])
]));

export const SNAP_TOLERANCE_SCREEN_PX = 80;
export const SNAP_AMBIGUITY_SCREEN_PX = 2;
export const SNAP_CROSS_AXIS_AMBIGUITY_SCREEN_PX = 12;
export const SNAP_EXACT_POSE_SCREEN_PX = 4;
export const SNAP_Z_INTENT_LATERAL_SCREEN_PX = 20;
export const SNAP_Z_INTENT_VERTICAL_SCREEN_PX = 12;
export const SNAP_SCALE_TOLERANCE = .02;

export function profileForAsset(assetId) { return CONSTRUCTION_PROFILES[assetId] || null; }
export function isSnappableAsset(assetId) { return !!profileForAsset(assetId); }
export function anchorsForAsset(assetId) { return profileForAsset(assetId)?.anchors || null; }
function anchorsForConnectionAsset(assetId) { return LEGACY_CONNECTION_ASSET_METADATA[assetId]?.anchors || null; }

function rotate(x, y, degrees = 0) {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians); const sine = Math.sin(radians);
  return { x: x * cosine - y * sine, y: x * sine + y * cosine };
}

export function constructionOrientation(object) {
  const angle = ((Number(object?.angle || 0) % 360) + 360) % 360;
  if (!object?.flipX && Math.min(angle, 360 - angle) < .01) return 'iso-a';
  if (object?.flipX && Math.abs(angle - 180) < .01) return 'iso-b';
  return null;
}

export function constructionScale(object) {
  return Math.max(Math.abs(Number(object?.getScaledWidth?.() || 0)), Math.abs(Number(object?.getScaledHeight?.() || 0)));
}

export function objectAnchor(object, anchorId) {
  const anchor = anchorsForAsset(object?.blockfolkAssetId)?.[anchorId];
  if (!anchor) return null;
  const width = Math.abs(Number(object.getScaledWidth?.() || 0)) / 2;
  const height = Math.abs(Number(object.getScaledHeight?.() || 0)) / 2;
  const offset = rotate(anchor.x * width, anchor.y * height, Number(object.angle || 0));
  const normal = rotate(anchor.nx, anchor.ny, Number(object.angle || 0));
  return {
    id: anchorId, direction: PORT_DIRECTION[anchorId] || null, mate: anchor.mate,
    x: Number(object.left || 0) + offset.x, y: Number(object.top || 0) + offset.y,
    nx: normal.x, ny: normal.y
  };
}

export function allObjectAnchors(object) {
  const anchors = anchorsForAsset(object?.blockfolkAssetId);
  return anchors ? Object.keys(anchors).filter((id) => PORT_DIRECTION[id]).map((id) => objectAnchor(object, id)).filter(Boolean) : [];
}

export function connectedLayerIds(connections = [], layerId) {
  if (!layerId) return new Set();
  const visited = new Set([layerId]); const queue = [layerId];
  while (queue.length) {
    const current = queue.shift();
    for (const connection of connections || []) {
      const next = connection?.aLayerId === current ? connection.bLayerId : connection?.bLayerId === current ? connection.aLayerId : null;
      if (next && !visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  return visited;
}

export function hasAssembly(connections = [], layerId) { return connectedLayerIds(connections, layerId).size > 1; }

export function validConnections(connections = [], layerIds = new Set()) {
  const seenPairs = new Set(); const seenIds = new Set(); const result = [];
  for (const connection of connections || []) {
    if (!connection || typeof connection.id !== 'string' || !connection.id || seenIds.has(connection.id)) continue;
    if (typeof connection.aLayerId !== 'string' || typeof connection.bLayerId !== 'string') continue;
    if (!layerIds.has(connection.aLayerId) || !layerIds.has(connection.bLayerId) || connection.aLayerId === connection.bLayerId) continue;
    const aAnchor = anchorsForConnectionAsset(connection.aAssetId)?.[connection.aAnchorId];
    const bAnchor = anchorsForConnectionAsset(connection.bAssetId)?.[connection.bAnchorId];
    if (!aAnchor || !bAnchor) continue;
    const pair = [connection.aLayerId, connection.bLayerId].sort().join('::');
    if (seenPairs.has(pair)) continue;
    seenIds.add(connection.id); seenPairs.add(pair);
    result.push({
      id: connection.id,
      aLayerId: connection.aLayerId, bLayerId: connection.bLayerId,
      aAssetId: connection.aAssetId, bAssetId: connection.bAssetId,
      aAnchorId: connection.aAnchorId, bAnchorId: connection.bAnchorId
    });
  }
  return result;
}

const coord = (a = 0, b = 0, z = 0) => ({ a, b, z });
const addCoord = (left, right) => coord(left.a + right.a, left.b + right.b, left.z + right.z);
const subtractCoord = (left, right) => coord(left.a - right.a, left.b - right.b, left.z - right.z);
const sameCoord = (left, right) => left?.a === right?.a && left?.b === right?.b && left?.z === right?.z;
export const gridCellKey = (value) => `${value.a},${value.b},${value.z}`;
const endpointKey = (layerId, portId) => `${layerId}:${portId}`;

function profileMapFor(members = [], connections = []) {
  const map = new Map();
  if (members instanceof Map) {
    for (const [layerId, value] of members) map.set(layerId, value?.footprint ? value : profileForAsset(value?.assetId || value?.blockfolkAssetId || value));
  } else if (Array.isArray(members)) {
    for (const member of members) {
      const layerId = member?.layerId || member?.blockfolkLayerId;
      if (layerId) map.set(layerId, member.profile || profileForAsset(member.assetId || member.blockfolkAssetId));
    }
  } else if (members && typeof members === 'object') {
    for (const [layerId, value] of Object.entries(members)) map.set(layerId, value?.footprint ? value : profileForAsset(value?.assetId || value?.blockfolkAssetId || value));
  }
  for (const edge of connections || []) {
    if (!map.has(edge.aLayerId)) map.set(edge.aLayerId, profileForAsset(edge.aAssetId));
    if (!map.has(edge.bLayerId)) map.set(edge.bLayerId, profileForAsset(edge.bAssetId));
  }
  return map;
}

function edgeDelta(edge) {
  const aDirection = PORT_DIRECTION[edge?.aAnchorId]; const bDirection = PORT_DIRECTION[edge?.bAnchorId];
  if (!aDirection || !bDirection || GRID_DIRECTIONS[aDirection].opposite !== bDirection) return null;
  return GRID_DIRECTIONS[aDirection];
}

export function buildComponentGrid(connections = [], profiles = [], rootLayerId) {
  const memberProfiles = profileMapFor(profiles, connections);
  const memberIds = [...connectedLayerIds(connections, rootLayerId)].sort();
  const stableRoot = memberIds[0] || rootLayerId || null;
  const origins = new Map(); const usedPorts = new Set(); const issues = [];
  if (stableRoot) origins.set(stableRoot, coord());
  const memberSet = new Set(memberIds);
  const relevant = (connections || []).filter((edge) => memberSet.has(edge.aLayerId) && memberSet.has(edge.bLayerId));
  const adjacency = new Map(memberIds.map((id) => [id, []]));
  for (const edge of relevant) {
    const delta = edgeDelta(edge);
    if (!delta) { issues.push({ type: 'unsupported-edge', edgeId: edge.id }); continue; }
    usedPorts.add(endpointKey(edge.aLayerId, edge.aAnchorId)); usedPorts.add(endpointKey(edge.bLayerId, edge.bAnchorId));
    adjacency.get(edge.aLayerId)?.push({ edge, neighbor: edge.bLayerId, delta: coord(delta.a, delta.b, delta.z) });
    adjacency.get(edge.bLayerId)?.push({ edge, neighbor: edge.aLayerId, delta: coord(-delta.a, -delta.b, -delta.z) });
  }
  for (const edges of adjacency.values()) edges.sort((left, right) => `${left.neighbor}:${left.edge.id}`.localeCompare(`${right.neighbor}:${right.edge.id}`));
  const queue = stableRoot ? [stableRoot] : [];
  while (queue.length) {
    const current = queue.shift();
    for (const link of adjacency.get(current) || []) {
      const implied = addCoord(origins.get(current), link.delta);
      if (!origins.has(link.neighbor)) { origins.set(link.neighbor, implied); queue.push(link.neighbor); }
      else if (!sameCoord(origins.get(link.neighbor), implied)) issues.push({ type: 'contradictory-coordinate', edgeId: link.edge.id, layerId: link.neighbor });
    }
  }
  for (const memberId of memberIds) {
    if (!memberProfiles.get(memberId)) issues.push({ type: 'missing-profile', layerId: memberId });
    if (!origins.has(memberId)) issues.push({ type: 'unmapped-member', layerId: memberId });
  }
  const occupiedCells = new Map();
  for (const memberId of memberIds) {
    const profile = memberProfiles.get(memberId); const origin = origins.get(memberId);
    if (!profile || !origin) continue;
    for (const cell of profile.footprint) {
      const absolute = addCoord(origin, cell); const key = gridCellKey(absolute);
      if (occupiedCells.has(key) && occupiedCells.get(key).layerId !== memberId) issues.push({ type: 'duplicate-occupancy', cell: key, layerIds: [occupiedCells.get(key).layerId, memberId].sort() });
      else occupiedCells.set(key, { layerId: memberId, cell: absolute });
    }
  }
  return {
    memberIds: new Set(memberIds), stableRoot, origins, usedPorts, occupiedCells,
    consistent: issues.length === 0, issues
  };
}

export function boundaryPortsFor(profile, origin = coord(), occupiedCells = new Map(), layerId = '') {
  if (!profile) return [];
  const ports = [];
  for (const cell of profile.footprint) for (const direction of profile.directions) {
    const delta = GRID_DIRECTIONS[direction]; const absolute = addCoord(origin, cell);
    const neighbor = addCoord(absolute, delta);
    if (occupiedCells.has(gridCellKey(neighbor))) continue;
    ports.push({ layerId, cell: absolute, direction, portId: delta.portId, neighbor });
  }
  return ports.sort((left, right) => `${gridCellKey(left.cell)}:${left.direction}:${left.layerId}`.localeCompare(`${gridCellKey(right.cell)}:${right.direction}:${right.layerId}`));
}

function componentObjects(rootObject, objects, connections) {
  const ids = connectedLayerIds(connections, rootObject.blockfolkLayerId);
  return objects.filter((object) => ids.has(object.blockfolkLayerId));
}

function objectProfiles(objects) {
  return objects.map((object) => ({ layerId: object.blockfolkLayerId, assetId: object.blockfolkAssetId }));
}

function compatibleScaleAndOrientation(source, target) {
  const sourceOrientation = constructionOrientation(source); const targetOrientation = constructionOrientation(target);
  if (!sourceOrientation || !targetOrientation || sourceOrientation !== targetOrientation) return false;
  const sourceScale = constructionScale(source); const targetScale = constructionScale(target);
  return sourceScale > 0 && targetScale > 0 && Math.abs(sourceScale - targetScale) / Math.max(sourceScale, targetScale) <= SNAP_SCALE_TOLERANCE;
}

function contactKey(contact) {
  return `${contact.source.blockfolkLayerId}:${contact.sourceAnchor.id}->${contact.target.blockfolkLayerId}:${contact.targetAnchor.id}`;
}

function contactAxisFamily(contact) {
  return String(contact?.sourceAnchor?.direction || '').endsWith('Z') ? 'z' : 'horizontal';
}

function poseAxisFamily(contacts = []) {
  const families = new Set(contacts.map(contactAxisFamily));
  return families.size === 1 ? [...families][0] : 'mixed';
}

function crossAxisCompetitors(left, right) {
  return left?.axisFamily !== 'mixed' && right?.axisFamily !== 'mixed' && left?.axisFamily !== right?.axisFamily;
}

export function findGridSnapCandidate({
  movingObjects = [], stationaryObjects = [], connections = [], screenScale = 1,
  screenTolerance = SNAP_TOLERANCE_SCREEN_PX, ambiguityScreen = SNAP_AMBIGUITY_SCREEN_PX,
  crossAxisAmbiguityScreen = SNAP_CROSS_AXIS_AMBIGUITY_SCREEN_PX,
  exactPoseScreen = SNAP_EXACT_POSE_SCREEN_PX,
  zIntentLateralScreen = SNAP_Z_INTENT_LATERAL_SCREEN_PX,
  zIntentVerticalScreen = SNAP_Z_INTENT_VERTICAL_SCREEN_PX
}) {
  if (!movingObjects.length || !stationaryObjects.length) return { status: 'none' };
  const movingRoot = [...movingObjects].sort((a, b) => a.blockfolkLayerId.localeCompare(b.blockfolkLayerId))[0];
  const movingGrid = buildComponentGrid(connections, objectProfiles(movingObjects), movingRoot.blockfolkLayerId);
  if (!movingGrid.consistent || movingGrid.memberIds.size !== movingObjects.length) return { status: 'none', reason: 'inconsistent-moving-component' };

  const allStationary = [...stationaryObjects]; const targetRoots = [];
  const seenTargets = new Set();
  for (const object of [...allStationary].sort((a, b) => a.blockfolkLayerId.localeCompare(b.blockfolkLayerId))) {
    if (seenTargets.has(object.blockfolkLayerId)) continue;
    const members = componentObjects(object, allStationary, connections);
    for (const member of members) seenTargets.add(member.blockfolkLayerId);
    targetRoots.push({ root: object, members });
  }

  const grouped = new Map(); const occupiedContacts = [];
  for (const targetComponent of targetRoots) {
    const targetGrid = buildComponentGrid(connections, objectProfiles(targetComponent.members), targetComponent.root.blockfolkLayerId);
    if (!targetGrid.consistent || targetGrid.memberIds.size !== targetComponent.members.length) continue;
    for (const source of movingObjects) for (const sourceAnchor of allObjectAnchors(source)) {
      if (movingGrid.usedPorts.has(endpointKey(source.blockfolkLayerId, sourceAnchor.id))) continue;
      for (const target of targetComponent.members) for (const targetAnchor of allObjectAnchors(target)) {
        if (sourceAnchor.mate !== targetAnchor.id || targetAnchor.mate !== sourceAnchor.id) continue;
        if (!compatibleScaleAndOrientation(source, target)) continue;
        const dx = targetAnchor.x - sourceAnchor.x; const dy = targetAnchor.y - sourceAnchor.y;
        const screenDistance = Math.hypot(dx, dy) * Math.max(.0001, screenScale);
        if (screenDistance > screenTolerance) continue;
        const sourceOrigin = movingGrid.origins.get(source.blockfolkLayerId);
        const targetOrigin = targetGrid.origins.get(target.blockfolkLayerId);
        const direction = GRID_DIRECTIONS[sourceAnchor.direction];
        const offset = subtractCoord(subtractCoord(targetOrigin, direction), sourceOrigin);
        const poseKey = `${targetGrid.stableRoot}|${gridCellKey(offset)}`;
        let occupied = false;
        for (const movingCell of movingGrid.occupiedCells.values()) {
          if (targetGrid.occupiedCells.has(gridCellKey(addCoord(movingCell.cell, offset)))) { occupied = true; break; }
        }
        const targetUsed = targetGrid.usedPorts.has(endpointKey(target.blockfolkLayerId, targetAnchor.id));
        const contact = { source, target, sourceAnchor, targetAnchor, dx, dy, screenDistance };
        if (occupied || targetUsed) { occupiedContacts.push({ screenDistance, axisFamily: contactAxisFamily(contact) }); continue; }
        if (!grouped.has(poseKey)) grouped.set(poseKey, { poseKey, targetRoot: targetGrid.stableRoot, offset, contacts: [] });
        grouped.get(poseKey).contacts.push(contact);
      }
    }
  }

  const poses = [...grouped.values()].map((pose) => {
    pose.contacts.sort((left, right) => contactKey(left).localeCompare(contactKey(right)));
    const dx = pose.contacts.reduce((sum, contact) => sum + contact.dx, 0) / pose.contacts.length;
    const dy = pose.contacts.reduce((sum, contact) => sum + contact.dy, 0) / pose.contacts.length;
    const fitResidualScreen = Math.sqrt(pose.contacts.reduce((sum, contact) => sum + ((contact.dx - dx) ** 2) + ((contact.dy - dy) ** 2), 0) / pose.contacts.length) * Math.max(.0001, screenScale);
    const canonicalContact = [...pose.contacts].sort((left, right) => {
      const leftResidual = Math.hypot(left.dx - dx, left.dy - dy);
      const rightResidual = Math.hypot(right.dx - dx, right.dy - dy);
      return leftResidual - rightResidual || contactKey(left).localeCompare(contactKey(right));
    })[0];
    return {
      ...pose, canonicalContact, dx, dy,
      screenDistance: Math.hypot(dx, dy) * Math.max(.0001, screenScale),
      fitResidualScreen, support: pose.contacts.length, axisFamily: poseAxisFamily(pose.contacts)
    };
  }).sort((left, right) => left.screenDistance - right.screenDistance || right.support - left.support || left.fitResidualScreen - right.fitResidualScreen || left.poseKey.localeCompare(right.poseKey) || contactKey(left.canonicalContact).localeCompare(contactKey(right.canonicalContact)));

  occupiedContacts.sort((left, right) => left.screenDistance - right.screenDistance || left.axisFamily.localeCompare(right.axisFamily));
  const closestOccupied = occupiedContacts[0] || null;
  if (!poses.length) return closestOccupied ? { status: 'occupied' } : { status: 'none' };
  const clearZ = zIntentLateralScreen > 0 && zIntentVerticalScreen > 0
    ? poses.filter((pose) => pose.axisFamily === 'z' && Math.abs(pose.dx) * Math.max(.0001, screenScale) <= zIntentLateralScreen && Math.abs(pose.dy) * Math.max(.0001, screenScale) <= zIntentVerticalScreen)
      .sort((left, right) => right.support - left.support || left.screenDistance - right.screenDistance || left.fitResidualScreen - right.fitResidualScreen || left.poseKey.localeCompare(right.poseKey))[0]
    : null;
  const exactPose = exactPoseScreen > 0 && poses[0].screenDistance <= exactPoseScreen ? poses[0] : null;
  const axisLockedPose = exactPose || clearZ;
  const winner = axisLockedPose || poses[0];
  const occupiedContender = occupiedContacts.find((item) => {
    if (axisLockedPose && item.axisFamily !== winner.axisFamily) return false;
    const margin = item.axisFamily === winner.axisFamily || winner.axisFamily === 'mixed' ? ambiguityScreen : crossAxisAmbiguityScreen;
    return item.screenDistance <= winner.screenDistance + margin;
  });
  if (occupiedContender) {
    if (occupiedContender.axisFamily !== winner.axisFamily && winner.axisFamily !== 'mixed' && Math.abs(occupiedContender.screenDistance - winner.screenDistance) <= crossAxisAmbiguityScreen) {
      return { status: 'ambiguous', poses: [{ poseKey: winner.poseKey, screenDistance: winner.screenDistance, fitResidualScreen: winner.fitResidualScreen, support: winner.support, axisFamily: winner.axisFamily }, { occupied: true, screenDistance: occupiedContender.screenDistance, axisFamily: occupiedContender.axisFamily }] };
    }
    return { status: 'occupied' };
  }
  const contender = poses.find((pose) => {
    if (pose === winner) return false;
    if (axisLockedPose && crossAxisCompetitors(winner, pose)) return false;
    const margin = crossAxisCompetitors(winner, pose) ? crossAxisAmbiguityScreen : ambiguityScreen;
    return Math.abs(pose.screenDistance - winner.screenDistance) <= margin;
  });
  if (contender) {
    return { status: 'ambiguous', poses: [winner, contender].map(({ poseKey, screenDistance, fitResidualScreen, support, axisFamily }) => ({ poseKey, screenDistance, fitResidualScreen, support, axisFamily })) };
  }
  return { status: 'ok', pose: winner, canonicalContact: winner.canonicalContact, dx: winner.dx, dy: winner.dy };
}

// Compatibility wrapper for older source fixtures. It delegates to the grid
// candidate engine and never owns an alternate candidate path.
export function findSnapCandidate({ movingObjects = [], stationaryObjects = [], worldTolerance = Infinity }) {
  const result = findGridSnapCandidate({
    movingObjects, stationaryObjects, connections: [], screenScale: 1, screenTolerance: worldTolerance,
    ambiguityScreen: 0, crossAxisAmbiguityScreen: 0, exactPoseScreen: 0, zIntentLateralScreen: 0, zIntentVerticalScreen: 0
  });
  return result.status === 'ok' ? { ...result.canonicalContact, dx: result.dx, dy: result.dy, distance: result.pose.screenDistance } : null;
}

export function makeConnection(candidate) {
  const contact = candidate?.canonicalContact || candidate;
  const source = contact?.source; const sourceAnchor = contact?.sourceAnchor;
  const target = contact?.target; const targetAnchor = contact?.targetAnchor;
  if (!source || !sourceAnchor || !target || !targetAnchor) return null;
  return {
    id: createStableId('blockfolk-connection'),
    aLayerId: source.blockfolkLayerId, bLayerId: target.blockfolkLayerId,
    aAssetId: source.blockfolkAssetId, bAssetId: target.blockfolkAssetId,
    aAnchorId: sourceAnchor.id, bAnchorId: targetAnchor.id
  };
}

export function duplicateConnections(connections, idMap) {
  return (connections || []).filter((connection) => idMap.has(connection.aLayerId) && idMap.has(connection.bLayerId)).map((connection) => ({
    ...connection, id: createStableId('blockfolk-connection'),
    aLayerId: idMap.get(connection.aLayerId), bLayerId: idMap.get(connection.bLayerId)
  }));
}

export function removeMemberConnections(connections, layerId) {
  return (connections || []).filter((connection) => connection.aLayerId !== layerId && connection.bLayerId !== layerId);
}
