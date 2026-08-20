import { BLOCK_PILOT_CALIBRATION } from './blockProfiles.js';

export const TYPED_DOOR_ASSET_IDS = Object.freeze([
  'sticker-blockfolk-wood-door',
  'sticker-blockfolk-stone-door'
]);

const DOOR_ASSETS = Object.freeze({
  'sticker-blockfolk-wood-door': Object.freeze({
    filename: 'wood_door.png', sourceSize: Object.freeze({ width: 236, height: 416 }),
    visibleBounds: Object.freeze({ left: 25, top: 25, right: 210, bottom: 390 }),
    constructionOrigin: Object.freeze({ x: 117.5, y: 390 })
  }),
  'sticker-blockfolk-stone-door': Object.freeze({
    filename: 'stone_door.png', sourceSize: Object.freeze({ width: 261, height: 424 }),
    visibleBounds: Object.freeze({ left: 25, top: 25, right: 235, bottom: 398 }),
    constructionOrigin: Object.freeze({ x: 130, y: 398 })
  })
});

export const DOORWAY_SLOT_CELLS = Object.freeze({
  frameLowerLeft: Object.freeze({ column: -1, tier: 0, priority: 10 }),
  frameLowerRight: Object.freeze({ column: 1, tier: 0, priority: 20 }),
  frameUpperLeft: Object.freeze({ column: -1, tier: 1, priority: 30 }),
  frameUpperRight: Object.freeze({ column: 1, tier: 1, priority: 40 }),
  frameLintel: Object.freeze({ column: 0, tier: 2, priority: 50 })
});

export const DOORWAY_RESERVED_CELLS = Object.freeze([
  Object.freeze({ column: 0, tier: 0 }),
  Object.freeze({ column: 0, tier: 1 })
]);

function round(value) { return Number(Number(value).toFixed(9)); }
function pointAtCell(origin, columnSource, tierSource, cell) {
  return Object.freeze({
    x: round(origin.x + columnSource.x * cell.column + tierSource.x * cell.tier),
    y: round(origin.y + columnSource.y * cell.column + tierSource.y * cell.tier)
  });
}

export function calibratedDoorProfile(assetId, { productionEnabled = true } = {}) {
  const asset = DOOR_ASSETS[assetId]; if (!asset) return null;
  const visibleHeight = asset.visibleBounds.bottom - asset.visibleBounds.top;
  const tierLength = Math.hypot(BLOCK_PILOT_CALIBRATION.plane.tierWorld.x, BLOCK_PILOT_CALIBRATION.plane.tierWorld.y);
  const canonicalInsertScale = (tierLength * 2) / visibleHeight;
  const columnSource = {
    x: BLOCK_PILOT_CALIBRATION.plane.columnWorld.x / canonicalInsertScale,
    y: BLOCK_PILOT_CALIBRATION.plane.columnWorld.y / canonicalInsertScale
  };
  const tierSource = {
    x: BLOCK_PILOT_CALIBRATION.plane.tierWorld.x / canonicalInsertScale,
    y: BLOCK_PILOT_CALIBRATION.plane.tierWorld.y / canonicalInsertScale
  };
  const ports = Object.entries(DOORWAY_SLOT_CELLS).map(([id, cell]) => Object.freeze({
    id, type: 'door-frame-slot', localPoint: pointAtCell(asset.constructionOrigin, columnSource, tierSource, cell),
    localNormal: Object.freeze({ x: 0, y: -1 }), plane: 'wall-iso-a', capacity: 1,
    compatibleTypes: Object.freeze(['block-cell-mount']), role: 'structural-slot', enabledInVersion: 1, priority: cell.priority
  }));
  return Object.freeze({
    assetId, version: 1, family: 'door', calibrationStatus: 'typed-building-v1', productionEnabled,
    canonicalScaleClass: 'blockfolk-building-cell-v1', canonicalInsertScale,
    sourceSize: asset.sourceSize, visibleBounds: asset.visibleBounds, constructionOrigin: asset.constructionOrigin,
    logicalFootprint: Object.freeze({ columns: 1, tiers: 2 }), supportedPlanes: Object.freeze(['wall-iso-a', 'wall-iso-b']),
    supportedAngles: Object.freeze([0]), flipPlaneMap: Object.freeze({ 'wall-iso-a': 'wall-iso-b', 'wall-iso-b': 'wall-iso-a' }),
    defaultDepthBand: 4, formationKind: 'doorway-1x2', ports: Object.freeze(ports)
  });
}

