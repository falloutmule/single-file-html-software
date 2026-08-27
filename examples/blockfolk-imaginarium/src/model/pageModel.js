import { createStableId } from './ids.js';
import { migrateBuiltInCategory } from './categoryModel.js';
import { DEFAULT_CAMERA, WORLD_BACKGROUND_ID, WORLD_SIZE, normalizeCamera, normalizeWorldBackgroundId } from './worldModel.js';
import { duplicateConnections, isSnappableAsset, validConnections } from './constructionModel.js';

export const PAGE_SCHEMA = 'blockfolk-imaginarium.page@3';
export const PREVIOUS_PAGE_SCHEMA = 'blockfolk-imaginarium.page@2';
export const LEGACY_PAGE_SCHEMA = 'blockfolk-imaginarium.page@1';
export const PAGE_WIDTH = WORLD_SIZE;
export const PAGE_HEIGHT = WORLD_SIZE;
export const GALLERY_LIMIT = 24;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 32;
const ATTACHABLE_WINDOW_ASSET_IDS = new Set([
  'sticker-blockfolk-square-window', 'sticker-blockfolk-round-window'
]);

export function validWindowAttachments(attachments = [], stickers = []) {
  if (!Array.isArray(attachments)) return [];
  const byId = new Map((stickers || []).filter((sticker) => sticker && typeof sticker.layerId === 'string').map((sticker) => [sticker.layerId, sticker]));
  const seenChildren = new Set(); const valid = [];
  for (const attachment of attachments) {
    const childLayerId = attachment?.childLayerId; const hostLayerId = attachment?.hostLayerId;
    if (typeof childLayerId !== 'string' || typeof hostLayerId !== 'string' || !childLayerId || !hostLayerId || childLayerId === hostLayerId || seenChildren.has(childLayerId)) continue;
    const child = byId.get(childLayerId); const host = byId.get(hostLayerId);
    if (!child || !host || !ATTACHABLE_WINDOW_ASSET_IDS.has(child.assetId) || !isSnappableAsset(host.assetId)) continue;
    seenChildren.add(childLayerId); valid.push({ childLayerId, hostLayerId });
  }
  return valid.sort((left, right) => left.childLayerId.localeCompare(right.childLayerId));
}

export function createPicture({ id = createStableId('blockfolk-picture'), title = 'My BlockFolk Picture', now = new Date().toISOString(), camera = DEFAULT_CAMERA, category = 'animals' } = {}) {
  return {
    schema: PAGE_SCHEMA, id, title, createdAt: now, updatedAt: now,
    page: { width: PAGE_WIDTH, height: PAGE_HEIGHT, backgroundAssetId: WORLD_BACKGROUND_ID, camera: normalizeCamera(camera) },
    ui: { category: migrateBuiltInCategory(category) },
    stickers: [], connections: [], attachments: [], embeddedAssets: [], promptId: null
  };
}

function validateSticker(sticker, layerIds) {
  if (!sticker || typeof sticker.layerId !== 'string' || !sticker.layerId || layerIds.has(sticker.layerId)) throw new Error('Picture has an invalid sticker identity.');
  layerIds.add(sticker.layerId);
  if (typeof sticker.assetId !== 'string' || !Number.isFinite(sticker.x) || !Number.isFinite(sticker.y) || !Number.isFinite(sticker.scaleX) || !Number.isFinite(sticker.scaleY) || !Number.isFinite(sticker.angle)) throw new Error('Picture has invalid sticker settings.');
  if ((sticker.flipX !== undefined && typeof sticker.flipX !== 'boolean') || (sticker.flipY !== undefined && typeof sticker.flipY !== 'boolean') || (sticker.opacity !== undefined && !Number.isFinite(sticker.opacity)) || (sticker.zIndex !== undefined && !Number.isFinite(sticker.zIndex)) || (sticker.sourceEmoji !== undefined && typeof sticker.sourceEmoji !== 'string')) throw new Error('Picture has invalid sticker settings.');
}

export function validatePicture(value) {
  if (!value || typeof value !== 'object') throw new Error('Picture data is missing.');
  if (![PAGE_SCHEMA, PREVIOUS_PAGE_SCHEMA, LEGACY_PAGE_SCHEMA].includes(value.schema)) throw new Error(`Picture version ${value.schema || 'unknown'} is not supported.`);
  if (typeof value.id !== 'string' || !value.id || typeof value.title !== 'string') throw new Error('Picture identity is invalid.');
  const legacy = value.schema === LEGACY_PAGE_SCHEMA;
  const validPage = legacy
    ? value.page?.width === 1080 && value.page?.height === 1440 && (value.page?.backgroundAssetId === null || typeof value.page?.backgroundAssetId === 'string')
    : value.page?.width === PAGE_WIDTH && value.page?.height === PAGE_HEIGHT && !!normalizeWorldBackgroundId(value.page?.backgroundAssetId) && value.page?.camera && Number.isFinite(value.page.camera.centerX) && Number.isFinite(value.page.camera.centerY) && Number.isFinite(value.page.camera.zoom);
  if (!validPage) throw new Error('Picture page settings are invalid.');
  if (!Array.isArray(value.stickers) || !Array.isArray(value.embeddedAssets || [])) throw new Error('Picture content is invalid.');
  const layerIds = new Set();
  for (const sticker of value.stickers) validateSticker(sticker, layerIds);
  if (value.schema === PAGE_SCHEMA && !Array.isArray(value.connections)) throw new Error('Picture construction settings are invalid.');
  if (Array.isArray(value.connections) && validConnections(value.connections, layerIds).length !== value.connections.length) throw new Error('Picture construction settings are invalid.');
  for (const asset of value.embeddedAssets || []) {
    const imageAsset = typeof asset?.dataUrl === 'string' && asset.dataUrl.startsWith('data:image/');
    const emojiAsset = asset?.kind === 'emoji' && typeof asset.glyph === 'string' && asset.glyph;
    if (!asset || typeof asset.id !== 'string' || (!imageAsset && !emojiAsset)) throw new Error('Picture has an invalid embedded sticker.');
  }
  return true;
}

function migrateLegacyPicture(value) {
  const worldScale = WORLD_SIZE / 1080;
  const legacyCategory = value.ui?.category ?? value.ui?.selectedCategory ?? value.selectedCategory ?? value.category;
  return {
    ...value, schema: PAGE_SCHEMA,
    page: { width: WORLD_SIZE, height: WORLD_SIZE, backgroundAssetId: WORLD_BACKGROUND_ID, camera: normalizeCamera(DEFAULT_CAMERA) },
    ui: { category: migrateBuiltInCategory(legacyCategory) },
    stickers: value.stickers.map((sticker) => ({ ...sticker, x: sticker.x * (WORLD_SIZE / 1080), y: sticker.y * (WORLD_SIZE / 1440), scaleX: sticker.scaleX * worldScale, scaleY: sticker.scaleY * worldScale })), connections: []
  };
}

export function normalizePicture(value) {
  validatePicture(value);
  const inputSchema = value.schema;
  const migrated = value.schema === LEGACY_PAGE_SCHEMA ? migrateLegacyPicture(value) : value;
  const layerIds = new Set((migrated.stickers || []).map((sticker) => sticker.layerId));
  const normalized = {
    ...migrated, schema: PAGE_SCHEMA,
    page: { ...migrated.page, backgroundAssetId: normalizeWorldBackgroundId(migrated.page.backgroundAssetId) || WORLD_BACKGROUND_ID, camera: normalizeCamera(migrated.page.camera) },
    ui: { category: migrateBuiltInCategory(migrated.ui?.category) },
    stickers: migrated.stickers.map((sticker, index) => ({ ...sticker, flipX: sticker.flipX ?? false, flipY: sticker.flipY ?? false, opacity: sticker.opacity ?? 1, zIndex: sticker.zIndex ?? index })),
    connections: validConnections(migrated.connections || [], layerIds),
    attachments: inputSchema === PAGE_SCHEMA ? validWindowAttachments(migrated.attachments, migrated.stickers) : [],
    embeddedAssets: migrated.embeddedAssets || []
  };
  validatePicture(normalized);
  return JSON.parse(JSON.stringify(normalized));
}

export function createSticker(assetId, { x = PAGE_WIDTH / 2, y = PAGE_HEIGHT / 2, scale = 1, layerId = createStableId('blockfolk-sticker'), sourceEmoji } = {}) {
  return { layerId, assetId, x, y, scaleX: scale, scaleY: scale, angle: 0, flipX: false, flipY: false, opacity: 1, zIndex: 0, ...(sourceEmoji ? { sourceEmoji } : {}) };
}

export function resizeSticker(sticker, factor) {
  const ratio = Math.max(MIN_SCALE, Math.min(MAX_SCALE, sticker.scaleX * factor));
  return { ...sticker, scaleX: ratio, scaleY: Math.max(MIN_SCALE, Math.min(MAX_SCALE, sticker.scaleY * factor)) };
}

export function rotateSticker(sticker, degrees = 15) { return { ...sticker, angle: ((sticker.angle + degrees) % 360 + 360) % 360 }; }
export function flipSticker(sticker) { return { ...sticker, flipX: !sticker.flipX }; }

export function moveStickerOneStep(stickers, layerId, direction) {
  const ordered = stickers.map((sticker) => ({ ...sticker }));
  const index = ordered.findIndex((sticker) => sticker.layerId === layerId); const step = direction < 0 ? -1 : direction > 0 ? 1 : 0; const target = index + step;
  if (index >= 0 && step && target >= 0 && target < ordered.length) [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return ordered.map((sticker, zIndex) => ({ ...sticker, zIndex }));
}

export function clampStickerPosition(sticker, renderedWidth, renderedHeight, visibleRatio = 0.1) {
  const edgeX = renderedWidth * (0.5 - visibleRatio); const edgeY = renderedHeight * (0.5 - visibleRatio);
  return { ...sticker, x: Math.max(-edgeX, Math.min(PAGE_WIDTH + edgeX, sticker.x)), y: Math.max(-edgeY, Math.min(PAGE_HEIGHT + edgeY, sticker.y)) };
}

export function duplicateSticker(sticker, layerId = createStableId('blockfolk-sticker')) { return { ...sticker, layerId, x: sticker.x + 44, y: sticker.y + 44, zIndex: sticker.zIndex + 1 }; }

export function duplicatePicture(picture, title, now = new Date().toISOString()) {
  const copy = normalizePicture(picture); copy.id = createStableId('blockfolk-picture'); copy.title = title || `${picture.title} Copy`; copy.createdAt = now; copy.updatedAt = now;
  const idMap = new Map();
  copy.stickers = copy.stickers.map((sticker) => { const layerId = createStableId('blockfolk-sticker'); idMap.set(sticker.layerId, layerId); return { ...sticker, layerId }; });
  copy.connections = duplicateConnections(copy.connections || [], idMap); copy.attachments = []; return copy;
}

export function mapChildSafeError(error) {
  const message = String(error?.message || error || '');
  if (/quota|space|storage/i.test(message)) return 'This picture could not be saved on the device. You can still download it.';
  if (/zip|pack|archive|decompress/i.test(message)) return 'Some stickers could not be added. A grown-up can see the details.';
  if (/image|sticker|decode/i.test(message)) return 'That sticker could not be opened.';
  return 'Something wobbled. Your picture is still here.';
}
