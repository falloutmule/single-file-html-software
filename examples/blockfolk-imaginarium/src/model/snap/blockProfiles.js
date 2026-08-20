import { BLOCKFOLK_DEFAULT_WORLD_EXTENT } from '../blockfolkStickerLibrary.js';

export const BLOCK_CALIBRATION_SCHEMA = 'blockfolk-snap-calibration@1';
export const TYPED_BLOCK_ASSET_IDS = Object.freeze([
  'sticker-blockfolk-grass-dirt-block',
  'sticker-blockfolk-dirt-block',
  'sticker-blockfolk-stone-block',
  'sticker-blockfolk-sand-block',
  'sticker-blockfolk-snow-block',
  'sticker-blockfolk-water-block',
  'sticker-blockfolk-lava-block',
  'sticker-blockfolk-wood-log-block',
  'sticker-blockfolk-leaf-block',
  'sticker-blockfolk-brick-stone-block'
]);
export const PILOT_BLOCK_ASSET_IDS = TYPED_BLOCK_ASSET_IDS;
export const DOORWAY_FRAME_BLOCK_ASSET_IDS = Object.freeze([
  'sticker-blockfolk-brick-stone-block',
  'sticker-blockfolk-wood-log-block'
]);

export const BLOCK_PILOT_CALIBRATION = Object.freeze({
  schema: BLOCK_CALIBRATION_SCHEMA,
  status: 'typed-building-v1',
  wallScope: 'one frontal isometric axis plus vertical tiers',
  canonicalWorldExtent: BLOCKFOLK_DEFAULT_WORLD_EXTENT,
  plane: Object.freeze({
    id: 'wall-iso-a',
    flippedId: 'wall-iso-b',
    columnWorld: Object.freeze({ x: 55.6, y: 32.1 }),
    tierWorld: Object.freeze({ x: 0, y: -73.1 })
  }),
  assets: Object.freeze({
    'sticker-blockfolk-grass-dirt-block': Object.freeze({
      filename: 'grass_dirt_block.png', sourceSize: Object.freeze({ width: 273, height: 320 }),
      alphaBounds: Object.freeze({ left: 24, top: 24, right: 247, bottom: 295 }), constructionOrigin: Object.freeze({ x: 136.5, y: 160 }), canonicalInsertScale: BLOCKFOLK_DEFAULT_WORLD_EXTENT / 320
    }),
    'sticker-blockfolk-dirt-block': Object.freeze({
      filename: 'dirt_block.png', sourceSize: Object.freeze({ width: 275, height: 320 }),
      alphaBounds: Object.freeze({ left: 24, top: 24, right: 249, bottom: 295 }), constructionOrigin: Object.freeze({ x: 137.5, y: 160 }), canonicalInsertScale: BLOCKFOLK_DEFAULT_WORLD_EXTENT / 320
    }),
    'sticker-blockfolk-stone-block': Object.freeze({
      filename: 'stone_block.png', sourceSize: Object.freeze({ width: 273, height: 319 }),
      alphaBounds: Object.freeze({ left: 25, top: 25, right: 248, bottom: 294 }), constructionOrigin: Object.freeze({ x: 136.5, y: 159.5 }), canonicalInsertScale: BLOCKFOLK_DEFAULT_WORLD_EXTENT / 319
    }),
    'sticker-blockfolk-sand-block': Object.freeze({
      filename: 'sand_block.png', sourceSize: Object.freeze({ width: 273, height: 320 }),
      alphaBounds: Object.freeze({ left: 25, top: 24, right: 247, bottom: 295 }), constructionOrigin: Object.freeze({ x: 136.5, y: 160 }), canonicalInsertScale: BLOCKFOLK_DEFAULT_WORLD_EXTENT / 320
    }),
    'sticker-blockfolk-snow-block': Object.freeze({
      filename: 'snow_block.png', sourceSize: Object.freeze({ width: 274, height: 320 }),
      alphaBounds: Object.freeze({ left: 25, top: 24, right: 249, bottom: 295 }), constructionOrigin: Object.freeze({ x: 137, y: 160 }), canonicalInsertScale: BLOCKFOLK_DEFAULT_WORLD_EXTENT / 320
    }),
    'sticker-blockfolk-water-block': Object.freeze({
      filename: 'water_block.png', sourceSize: Object.freeze({ width: 274, height: 325 }),
      alphaBounds: Object.freeze({ left: 24, top: 25, right: 249, bottom: 300 }), constructionOrigin: Object.freeze({ x: 137, y: 162.5 }), canonicalInsertScale: BLOCKFOLK_DEFAULT_WORLD_EXTENT / 325
    }),
    'sticker-blockfolk-lava-block': Object.freeze({
      filename: 'lava_block.png', sourceSize: Object.freeze({ width: 275, height: 326 }),
      alphaBounds: Object.freeze({ left: 24, top: 24, right: 249, bottom: 301 }), constructionOrigin: Object.freeze({ x: 137.5, y: 163 }), canonicalInsertScale: BLOCKFOLK_DEFAULT_WORLD_EXTENT / 326
    }),
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
      canonicalInsertScale: BLOCKFOLK_DEFAULT_WORLD_EXTENT / 326
    }),
    'sticker-blockfolk-leaf-block': Object.freeze({
      filename: 'leaf_block.png', sourceSize: Object.freeze({ width: 273, height: 325 }),
      alphaBounds: Object.freeze({ left: 24, top: 25, right: 247, bottom: 300 }), constructionOrigin: Object.freeze({ x: 136.5, y: 162.5 }), canonicalInsertScale: BLOCKFOLK_DEFAULT_WORLD_EXTENT / 325
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
  const faceCenter = asset.faceCenter || { x: origin.x + column.x / 2, y: origin.y + column.y / 2 };
  const frameEligible = DOORWAY_FRAME_BLOCK_ASSET_IDS.includes(assetId);
  return Object.freeze({
    assetId, version: 1, family: 'block', calibrationStatus: calibration.status, productionEnabled,
    canonicalScaleClass: 'blockfolk-building-cell-v1', canonicalInsertScale: asset.canonicalInsertScale,
    sourceSize: Object.freeze({ ...asset.sourceSize }), visibleBounds: Object.freeze({ ...asset.alphaBounds }),
    constructionOrigin: Object.freeze({ ...origin }), logicalFootprint: Object.freeze({ columns: 1, tiers: 1 }),
    supportedPlanes: Object.freeze(['wall-iso-a', 'wall-iso-b']), supportedAngles: Object.freeze([0]),
    flipPlaneMap: Object.freeze({ 'wall-iso-a': 'wall-iso-b', 'wall-iso-b': 'wall-iso-a' }), defaultDepthBand: 2,
    ports: Object.freeze([
      makePort('cellMount', frameEligible ? 'block-cell-mount' : 'block-cell-mount-inert', origin, { x: 0, y: 1 }, 'cell-mount', frameEligible ? ['door-frame-slot'] : [], 10),
      makePort('wallLeft', 'wall-edge-left', { x: origin.x - column.x / 2, y: origin.y - column.y / 2 }, { x: -columnNormal.x, y: -columnNormal.y }, 'edge', ['wall-edge-right'], 20),
      makePort('wallRight', 'wall-edge-right', { x: origin.x + column.x / 2, y: origin.y + column.y / 2 }, columnNormal, 'edge', ['wall-edge-left'], 30),
      makePort('stackTop', 'stack-top', { x: origin.x + tier.x / 2, y: origin.y + tier.y / 2 }, tierNormal, 'edge', ['stack-base'], 40),
      makePort('stackBase', 'stack-base', { x: origin.x - tier.x / 2, y: origin.y - tier.y / 2 }, { x: -tierNormal.x, y: -tierNormal.y }, 'edge', ['stack-top'], 50),
      makePort('wallFace', 'wall-face-receiver', faceCenter, columnNormal, 'wall-face', ['window-wall-mount'], 60)
    ])
  });
}
