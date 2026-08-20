import {
  BLOCK_CALIBRATION_SCHEMA as CALIBRATION_SCHEMA,
  BLOCK_PILOT_CALIBRATION as BLOCK_CALIBRATION,
  calibratedBlockProfile as productionBlockProfile
} from '../../src/model/snap/blockProfiles.js';

export { CALIBRATION_SCHEMA, BLOCK_CALIBRATION };

export function calibratedBlockProfile(assetId, calibration = BLOCK_CALIBRATION) {
  return productionBlockProfile(assetId, { calibration, productionEnabled: false });
}

export function exportCalibration(calibration = BLOCK_CALIBRATION) {
  const profiles = Object.keys(calibration.assets).sort().map((assetId) => calibratedBlockProfile(assetId, calibration));
  return JSON.stringify({ schema: CALIBRATION_SCHEMA, calibration, profiles }, null, 2);
}

export function importCalibration(text) {
  const parsed = JSON.parse(text);
  if (parsed?.schema !== CALIBRATION_SCHEMA || parsed?.calibration?.schema !== CALIBRATION_SCHEMA) throw new Error('Unsupported calibration document.');
  return parsed;
}
