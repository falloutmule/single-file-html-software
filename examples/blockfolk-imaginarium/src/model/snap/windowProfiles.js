import { BLOCK_PILOT_CALIBRATION } from './blockProfiles.js';

export const TYPED_WINDOW_ASSET_IDS = Object.freeze([
  'sticker-blockfolk-square-window',
  'sticker-blockfolk-round-window'
]);

const WINDOW_ASSETS = Object.freeze({
  'sticker-blockfolk-square-window': Object.freeze({
    sourceSize: Object.freeze({ width: 268, height: 363 }),
    visibleBounds: Object.freeze({ left: 25, top: 25, right: 242, bottom: 337 })
  }),
  'sticker-blockfolk-round-window': Object.freeze({
    sourceSize: Object.freeze({ width: 305, height: 359 }),
    visibleBounds: Object.freeze({ left: 25, top: 25, right: 279, bottom: 333 })
  })
});

function normalizedColumnNormal() {
  const column = BLOCK_PILOT_CALIBRATION.plane.columnWorld; const length = Math.hypot(column.x, column.y);
  return Object.freeze({ x: -column.x / length, y: -column.y / length });
}

export function calibratedWindowProfile(assetId, { productionEnabled = true } = {}) {
  const asset = WINDOW_ASSETS[assetId]; if (!asset) return null;
  const constructionOrigin = Object.freeze({
    x: (asset.visibleBounds.left + asset.visibleBounds.right) / 2,
    y: (asset.visibleBounds.top + asset.visibleBounds.bottom) / 2
  });
  return Object.freeze({
    assetId, version: 1, family: 'window', calibrationStatus: 'typed-building-v1', productionEnabled,
    canonicalScaleClass: 'blockfolk-building-cell-v1',
    canonicalInsertScale: BLOCK_PILOT_CALIBRATION.canonicalWorldExtent / asset.sourceSize.height,
    sourceSize: asset.sourceSize, visibleBounds: asset.visibleBounds, constructionOrigin,
    logicalFootprint: Object.freeze({ columns: 1, tiers: 1 }), supportedPlanes: Object.freeze(['wall-iso-a', 'wall-iso-b']),
    supportedAngles: Object.freeze([0]), flipPlaneMap: Object.freeze({ 'wall-iso-a': 'wall-iso-b', 'wall-iso-b': 'wall-iso-a' }),
    defaultDepthBand: 4,
    ports: Object.freeze([Object.freeze({
      id: 'wallMount', type: 'window-wall-mount', localPoint: constructionOrigin, localNormal: normalizedColumnNormal(),
      plane: 'wall-iso-a', capacity: 1, compatibleTypes: Object.freeze(['wall-face-receiver']),
      role: 'wall-mount', enabledInVersion: 1, priority: 10
    })])
  });
}

