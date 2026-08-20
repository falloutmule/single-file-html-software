/* global Buffer */
import assert from 'node:assert/strict';
import {
  BLOCK_CALIBRATION,
  CALIBRATION_SCHEMA,
  calibratedBlockProfile,
  exportCalibration,
  importCalibration
} from '../../tools/snap-authoring/blockCalibration.js';

const EXPECTED_EXTENT = 420 / (1.1 ** 10);
const FIXTURES = Object.freeze({
  'sticker-blockfolk-brick-stone-block': Object.freeze({
    sourceSize: { width: 273, height: 325 },
    alphaBounds: { left: 25, top: 25, right: 247, bottom: 300 },
    origin: { x: 136.5, y: 163 },
    scale: EXPECTED_EXTENT / 325
  }),
  'sticker-blockfolk-wood-log-block': Object.freeze({
    sourceSize: { width: 274, height: 326 },
    alphaBounds: { left: 24, top: 24, right: 249, bottom: 301 },
    origin: { x: 136.5, y: 163 },
    scale: EXPECTED_EXTENT / 326
  })
});
const EXPECTED_PORTS = ['cellMount', 'wallLeft', 'wallRight', 'stackTop', 'stackBase', 'wallFace'];

assert.equal(BLOCK_CALIBRATION.schema, CALIBRATION_SCHEMA);
assert.equal(BLOCK_CALIBRATION.status, 'phase3-pilot');
assert.equal(BLOCK_CALIBRATION.canonicalWorldExtent, EXPECTED_EXTENT);
assert.deepEqual(BLOCK_CALIBRATION.plane.columnWorld, { x: 55.6, y: 32.1 });
assert.deepEqual(BLOCK_CALIBRATION.plane.tierWorld, { x: 0, y: -73.1 });

for (const [assetId, fixture] of Object.entries(FIXTURES)) {
  const asset = BLOCK_CALIBRATION.assets[assetId];
  assert.ok(asset, `missing calibration asset ${assetId}`);
  assert.deepEqual(asset.sourceSize, fixture.sourceSize);
  assert.deepEqual(asset.alphaBounds, fixture.alphaBounds);
  assert.deepEqual(asset.constructionOrigin, fixture.origin);
  assert.equal(asset.canonicalInsertScale, fixture.scale);
  assert.equal(asset.canonicalInsertScale * asset.sourceSize.height, EXPECTED_EXTENT);

  const profile = calibratedBlockProfile(assetId);
  assert.equal(profile.productionEnabled, false);
  assert.equal(profile.calibrationStatus, 'phase3-pilot');
  assert.deepEqual(profile.supportedPlanes, ['wall-iso-a', 'wall-iso-b']);
  assert.deepEqual(profile.supportedAngles, [0]);
  assert.deepEqual(profile.flipPlaneMap, { 'wall-iso-a': 'wall-iso-b', 'wall-iso-b': 'wall-iso-a' });
  assert.deepEqual(profile.ports.map(({ id }) => id), EXPECTED_PORTS);
  assert.equal(profile.ports.every(({ capacity }) => capacity === 1), true);
  assert.deepEqual(profile.ports.find(({ id }) => id === 'wallFace').compatibleTypes, ['window-wall-mount']);
  assert.deepEqual(profile.ports.find(({ id }) => id === 'cellMount').compatibleTypes, ['door-frame-slot']);
  assert.notDeepEqual(profile.ports.find(({ id }) => id === 'wallFace').localPoint, profile.ports.find(({ id }) => id === 'cellMount').localPoint);
}

assert.equal(calibratedBlockProfile('not-a-real-asset'), null);
const firstExport = exportCalibration();
const secondExport = exportCalibration();
assert.equal(firstExport, secondExport, 'calibration export must be byte deterministic');
const imported = importCalibration(firstExport);
assert.equal(JSON.stringify(imported), JSON.stringify(JSON.parse(firstExport)), 'import must preserve every exported number and identity');
assert.throws(() => importCalibration('{"schema":"wrong"}'), /Unsupported calibration/u);

console.log(JSON.stringify({
  schema: CALIBRATION_SCHEMA,
  assets: Object.keys(FIXTURES).length,
  portsPerAsset: EXPECTED_PORTS.length,
  productionEnabled: false,
  exportBytes: Buffer.byteLength(firstExport)
}));
