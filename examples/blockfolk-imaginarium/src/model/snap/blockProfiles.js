import { BLOCKFOLK_DEFAULT_WORLD_EXTENT } from '../blockfolkStickerLibrary.js';

export const BLOCK_CALIBRATION_SCHEMA = 'blockfolk-snap-calibration@1';
export const PILOT_BLOCK_ASSET_IDS = Object.freeze([
  'sticker-blockfolk-brick-stone-block',
  'sticker-blockfolk-wood-log-block'
]);

export const BLOCK_PILOT_CALIBRATION = Object.freeze({
  schema: BLOCK_CALIBRATION_SCHEMA,
  status: 'phase3-pilot',
  wallScope: 'one frontal isometric axis plus vertical tiers',
  canonicalWorldExtent: BLOCKFOLK_DEFAULT_WORLD_EXTENT,
  plane: Object.freeze({
    id: 'wall-iso-a',
    flippedId: 'wall-iso-b',
    columnWorld: Object.freeze({ x: 55.6, y: 32.1 }),
    tierWorld: Object.freeze({ x: 0, y: -73.1 })
  }),
  assets: Object.freeze({
    'sticker-blockfolk-brick-stone-block': Object.freeze({
      filename: 'brick_stone_block.png',
      sourceSize: Object.freeze({ width: 273, height: 325 }),
      alphaBounds: Object.freeze({ left: 25, top: 25, right: 247, bottom: 300 }),
      constructionOrigin: Object.freeze({ x: 136.5, y: 163 }),
      faceCenter: Object.freeze({ x: 191.5, y: 194.5 }),
      canonicalInsertScale: BLOCKFOLK_DEFAULT_WORLD_EXTENT / 325
    }),
    'sticker-blockfolk-wood-log-block': Object.freeze({
      filename: 'wood_log_block.png',
      sourceSize: Object.freeze({ width: 274, height: 326 }),
      alphaBounds: Object.freeze({ left: 24, top: 24, right: 249, bottom: 301 }),
      constructionOrigin: Object.freeze({ x: 136.5, y: 163 }),
      faceCenter: Object.freeze({ x: 192, y: 195 }),
      canonicalInsertScale: BLOCKFOLK_DEFAULT_WORLD_EXTENT / 326
    })
  })
});

function round(value) { return Number(Number(value).toFixed(9)); }
function sourceVector(worldVector, scale) { return { x: worldVector.x / scale, y: worldVector.y / scale }; }
function normalize(vector) { const length = Math.hypot(vector.x, vector.y); return { x: vector.x / length, y: vector.y / length }; }
function makePort(id, type, point, normal, role, compatibleTypes, priority) {
  return Object.freeze({
    id, type,
    localPoint: Object.freeze({ x: round(point.x), y: round(point.y) }),
    localNormal: Object.freeze({ x: round(normal.x), y: round(normal.y) }),
    plane: 'wall-iso-a', capacity: 1, compatibleTypes: Object.freeze(compatibleTypes),
    role, enabledInVersion: 1, priority
  });
}

export function calibratedBlockProfile(assetId, { calibration = BLOCK_PILOT_CALIBRATION, productionEnabled = true } = {}) {
  const asset = calibration.assets[assetId];
  if (!asset) return null;
  const column = sourceVector(calibration.plane.columnWorld, asset.canonicalInsertScale);
  const tier = sourceVector(calibration.plane.tierWorld, asset.canonicalInsertScale);
  const origin = asset.constructionOrigin; const columnNormal = normalize(column); const tierNormal = normalize(tier);
  return Object.freeze({
    assetId, version: 1, family: 'block', calibrationStatus: calibration.status, productionEnabled,
    canonicalScaleClass: 'blockfolk-building-cell-v1', canonicalInsertScale: asset.canonicalInsertScale,
    sourceSize: Object.freeze({ ...asset.sourceSize }), visibleBounds: Object.freeze({ ...asset.alphaBounds }),
    constructionOrigin: Object.freeze({ ...origin }), logicalFootprint: Object.freeze({ columns: 1, tiers: 1 }),
    supportedPlanes: Object.freeze(['wall-iso-a', 'wall-iso-b']), supportedAngles: Object.freeze([0]),
    flipPlaneMap: Object.freeze({ 'wall-iso-a': 'wall-iso-b', 'wall-iso-b': 'wall-iso-a' }),
    ports: Object.freeze([
      makePort('cellMount', 'block-cell-mount', origin, { x: 0, y: 1 }, 'cell-mount', ['door-frame-slot'], 10),
      makePort('wallLeft', 'wall-edge-left', { x: origin.x - column.x / 2, y: origin.y - column.y / 2 }, { x: -columnNormal.x, y: -columnNormal.y }, 'edge', ['wall-edge-right'], 20),
      makePort('wallRight', 'wall-edge-right', { x: origin.x + column.x / 2, y: origin.y + column.y / 2 }, columnNormal, 'edge', ['wall-edge-left'], 30),
      makePort('stackTop', 'stack-top', { x: origin.x + tier.x / 2, y: origin.y + tier.y / 2 }, tierNormal, 'edge', ['stack-base'], 40),
      makePort('stackBase', 'stack-base', { x: origin.x - tier.x / 2, y: origin.y - tier.y / 2 }, { x: -tierNormal.x, y: -tierNormal.y }, 'edge', ['stack-top'], 50),
      makePort('wallFace', 'wall-face-receiver', asset.faceCenter, columnNormal, 'wall-face', ['window-wall-mount'], 60)
    ])
  });
}
