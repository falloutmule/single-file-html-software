import { BLOCKFOLK_STICKERS } from '../blockfolkStickerLibrary.js';
import { SNAP_PROFILE_SCHEMA_VERSION } from './policy.js';
import { PILOT_BLOCK_ASSET_IDS, calibratedBlockProfile } from './blockProfiles.js';

export const BLOCK_CONSTRUCTION_ASSET_IDS = Object.freeze([
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

export const DOOR_CONSTRUCTION_ASSET_IDS = Object.freeze([
  'sticker-blockfolk-wood-door',
  'sticker-blockfolk-stone-door'
]);

export const WINDOW_CONSTRUCTION_ASSET_IDS = Object.freeze([
  'sticker-blockfolk-square-window',
  'sticker-blockfolk-round-window'
]);

export const CONSTRUCTION_ASSET_IDS = Object.freeze([
  ...BLOCK_CONSTRUCTION_ASSET_IDS,
  ...DOOR_CONSTRUCTION_ASSET_IDS,
  ...WINDOW_CONSTRUCTION_ASSET_IDS
]);

const stickerById = new Map(BLOCKFOLK_STICKERS.map((sticker) => [sticker.id, sticker]));

function familyForAsset(assetId) {
  if (BLOCK_CONSTRUCTION_ASSET_IDS.includes(assetId)) return 'block';
  if (DOOR_CONSTRUCTION_ASSET_IDS.includes(assetId)) return 'door';
  if (WINDOW_CONSTRUCTION_ASSET_IDS.includes(assetId)) return 'window';
  return 'none';
}

function makeUncalibratedProfile(assetId) {
  const sticker = stickerById.get(assetId);
  if (!sticker) throw new Error(`Missing BlockFolk sticker metadata for ${assetId}.`);
  return Object.freeze({
    assetId,
    version: SNAP_PROFILE_SCHEMA_VERSION,
    family: familyForAsset(assetId),
    calibrationStatus: 'uncalibrated',
    productionEnabled: false,
    canonicalScaleClass: null,
    sourceSize: Object.freeze({ width: sticker.width, height: sticker.height }),
    visibleBounds: null,
    constructionOrigin: null,
    logicalFootprint: null,
    supportedPlanes: Object.freeze([]),
    supportedAngles: Object.freeze([0]),
    flipPlaneMap: Object.freeze({}),
    ports: Object.freeze([])
  });
}

export const ASSET_CONSTRUCTION_PROFILES = Object.freeze(Object.fromEntries(
  CONSTRUCTION_ASSET_IDS.map((assetId) => [assetId, PILOT_BLOCK_ASSET_IDS.includes(assetId)
    ? calibratedBlockProfile(assetId, { productionEnabled: true })
    : makeUncalibratedProfile(assetId)])
));

export function profileForAsset(assetId, profiles = ASSET_CONSTRUCTION_PROFILES) {
  return profiles[assetId] || null;
}

export function validateConstructionPort(port) {
  if (!port || typeof port.id !== 'string' || !port.id || typeof port.type !== 'string' || !port.type) return false;
  if (!Number.isFinite(port.localPoint?.x) || !Number.isFinite(port.localPoint?.y)) return false;
  if (!Number.isFinite(port.localNormal?.x) || !Number.isFinite(port.localNormal?.y)) return false;
  if (!Number.isInteger(port.capacity) || port.capacity < 1) return false;
  if (!Array.isArray(port.compatibleTypes) || !port.compatibleTypes.every((type) => typeof type === 'string' && type)) return false;
  return typeof port.plane === 'string' && !!port.plane;
}

export function validateConstructionProfile(profile) {
  if (!profile || typeof profile.assetId !== 'string' || !profile.assetId) return false;
  if (!Number.isInteger(profile.version) || profile.version < 1) return false;
  if (!['block', 'door', 'window', 'nature', 'none'].includes(profile.family)) return false;
  if (!Number.isFinite(profile.sourceSize?.width) || profile.sourceSize.width <= 0 || !Number.isFinite(profile.sourceSize?.height) || profile.sourceSize.height <= 0) return false;
  if (!Array.isArray(profile.supportedPlanes) || !Array.isArray(profile.ports)) return false;
  const portIds = new Set();
  for (const port of profile.ports) {
    if (!validateConstructionPort(port) || portIds.has(port.id)) return false;
    portIds.add(port.id);
  }
  return true;
}
