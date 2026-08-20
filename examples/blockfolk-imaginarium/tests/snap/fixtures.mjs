const port = (id, type, x, y, nx, ny, priority) => Object.freeze({
  id,
  type,
  localPoint: Object.freeze({ x, y }),
  localNormal: Object.freeze({ x: nx, y: ny }),
  plane: 'wall-iso-a',
  capacity: 1,
  compatibleTypes: Object.freeze([type]),
  role: 'edge',
  enabledInVersion: 1,
  priority
});

const profile = (assetId, ports) => Object.freeze({
  assetId,
  version: 1,
  family: 'block',
  calibrationStatus: 'fixture-reviewed',
  productionEnabled: true,
  canonicalScaleClass: 'fixture-cell-v1',
  canonicalInsertScale: 1,
  sourceSize: Object.freeze({ width: 100, height: 100 }),
  visibleBounds: Object.freeze({ left: 0, top: 0, right: 100, bottom: 100 }),
  constructionOrigin: Object.freeze({ x: 50, y: 50 }),
  logicalFootprint: Object.freeze({ columns: 1, tiers: 1 }),
  supportedPlanes: Object.freeze(['wall-iso-a', 'wall-iso-b']),
  supportedAngles: Object.freeze([0]),
  flipPlaneMap: Object.freeze({ 'wall-iso-a': 'wall-iso-b', 'wall-iso-b': 'wall-iso-a' }),
  ports: Object.freeze(ports)
});

export const MOVING_ASSET_ID = 'fixture-moving-block';
export const TARGET_ASSET_ID = 'fixture-target-block';

export const SNAP_FIXTURE_PROFILES = Object.freeze({
  [MOVING_ASSET_ID]: profile(MOVING_ASSET_ID, [
    port('rightLower', 'fixture-lower', 100, 40, 1, 0, 10),
    port('rightUpper', 'fixture-upper', 100, 60, 1, 0, 20)
  ]),
  [TARGET_ASSET_ID]: profile(TARGET_ASSET_ID, [
    port('leftLower', 'fixture-lower', 0, 40, -1, 0, 10),
    port('leftUpper', 'fixture-upper', 0, 60, -1, 0, 20)
  ])
});

export const fixtureObject = (layerId, assetId, x, y = 0, overrides = {}) => ({
  layerId,
  assetId,
  x,
  y,
  scaleX: 1,
  scaleY: 1,
  angle: 0,
  flipX: false,
  flipY: false,
  orientationId: 'default',
  constructionScaleMultiplier: 1,
  ...overrides
});

export const REVIEWED_EXPECTATIONS = Object.freeze({
  sourceCenterToLocal: Object.freeze({ x: 0, y: 0 }),
  sourceRightLowerToLocal: Object.freeze({ x: 50, y: -10 }),
  translatedRightLowerWorld: Object.freeze({ x: 60, y: 10 }),
  consensusDelta: Object.freeze({ x: 5, y: 0 }),
  reviewer: 'independent Phase 1 fixture',
  date: '2026-08-20'
});
