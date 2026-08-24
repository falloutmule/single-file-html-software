/* global TextEncoder, structuredClone */
import { WORLD_SIZE, normalizeCamera, normalizeWorldBackgroundId } from './worldModel.js';

export const READ_ONLY_LEGACY_SCHEMA = 'blockfolk-imaginarium.page@4';
export const READ_ONLY_LEGACY_NOTICE = 'This older picture is open read-only. Your stickers are safe, but its snap links are inactive.';

const READ_ONLY_CAPABILITIES = Object.freeze({
  camera: true,
  fit: true,
  orientation: true,
  pngExport: true,
  close: true,
  contentMutation: false,
  stickerEdit: false,
  snap: false,
  undoRedo: false,
  save: false,
  rename: false,
  duplicate: false,
  delete: false,
  recoveryExport: false,
  puzzle: false
});

function assertSticker(sticker, layerIds) {
  if (!sticker || typeof sticker !== 'object' || typeof sticker.layerId !== 'string' || !sticker.layerId || layerIds.has(sticker.layerId)) throw new Error('Picture has an invalid sticker identity.');
  layerIds.add(sticker.layerId);
  if (typeof sticker.assetId !== 'string' || !Number.isFinite(sticker.x) || !Number.isFinite(sticker.y) || !Number.isFinite(sticker.scaleX) || !Number.isFinite(sticker.scaleY) || !Number.isFinite(sticker.angle)) throw new Error('Picture has invalid sticker settings.');
  if ((sticker.flipX !== undefined && typeof sticker.flipX !== 'boolean') || (sticker.flipY !== undefined && typeof sticker.flipY !== 'boolean') || (sticker.opacity !== undefined && !Number.isFinite(sticker.opacity)) || (sticker.zIndex !== undefined && !Number.isFinite(sticker.zIndex)) || (sticker.sourceEmoji !== undefined && typeof sticker.sourceEmoji !== 'string')) throw new Error('Picture has invalid sticker settings.');
}

function assertPage4Record(record) {
  if (!record || typeof record !== 'object' || record.schema !== READ_ONLY_LEGACY_SCHEMA) throw new Error(`Picture version ${record?.schema || 'unknown'} is not supported.`);
  if (typeof record.id !== 'string' || !record.id || typeof record.title !== 'string') throw new Error('Picture identity is invalid.');
  if (record.page?.width !== WORLD_SIZE || record.page?.height !== WORLD_SIZE || !normalizeWorldBackgroundId(record.page?.backgroundAssetId) || !record.page?.camera) throw new Error('Picture page settings are invalid.');
  normalizeCamera(record.page.camera);
  if (!Array.isArray(record.stickers) || !Array.isArray(record.connections) || !Array.isArray(record.embeddedAssets || [])) throw new Error('Picture content is invalid.');
  const layerIds = new Set();
  for (const sticker of record.stickers) assertSticker(sticker, layerIds);
  for (const asset of record.embeddedAssets || []) {
    const imageAsset = typeof asset?.dataUrl === 'string' && asset.dataUrl.startsWith('data:image/');
    const emojiAsset = asset?.kind === 'emoji' && typeof asset.glyph === 'string' && asset.glyph;
    if (!asset || typeof asset.id !== 'string' || (!imageAsset && !emojiAsset)) throw new Error('Picture has an invalid embedded sticker.');
  }
}

export function stableCanonicalSerialize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableCanonicalSerialize(item)).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableCanonicalSerialize(value[key])}`).join(',')}}`;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class ReadOnlyLegacySession {
  static supports(record) { return record?.schema === READ_ONLY_LEGACY_SCHEMA; }

  static capabilitiesFor(record) { return ReadOnlyLegacySession.supports(record) ? READ_ONLY_CAPABILITIES : null; }

  static async openIfSupported(record) { return ReadOnlyLegacySession.supports(record) ? ReadOnlyLegacySession.open(record) : null; }

  static async open(record) {
    assertPage4Record(record);
    const originalRecord = structuredClone(record);
    const canonicalSerialization = stableCanonicalSerialize(originalRecord);
    const canonicalHash = await sha256Hex(canonicalSerialization);
    return new ReadOnlyLegacySession({ originalRecord, canonicalSerialization, canonicalHash });
  }

  constructor({ originalRecord, canonicalSerialization, canonicalHash }) {
    this.schema = READ_ONLY_LEGACY_SCHEMA;
    this.originalRecord = originalRecord;
    this.originalIdentity = Object.freeze({
      id: originalRecord.id,
      schema: originalRecord.schema,
      createdAt: originalRecord.createdAt,
      updatedAt: originalRecord.updatedAt
    });
    this.canonicalSerialization = canonicalSerialization;
    this.canonicalHash = canonicalHash;
    this.capabilities = READ_ONLY_CAPABILITIES;
    this.camera = normalizeCamera(originalRecord.page.camera);
    this.quarantinedConnections = structuredClone(originalRecord.connections);
    this.renderedStickerSnapshot = structuredClone(originalRecord.stickers);
    this.renderedPicture = {
      ...structuredClone(originalRecord),
      page: { ...structuredClone(originalRecord.page), camera: structuredClone(this.camera) },
      stickers: structuredClone(this.renderedStickerSnapshot),
      connections: []
    };
  }

  allows(capability) { return this.capabilities[capability] === true; }
}
