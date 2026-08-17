import { createStableId } from './ids.js';

export const PAGE_SCHEMA = 'imaginarium.page@1';
export const PAGE_WIDTH = 1080;
export const PAGE_HEIGHT = 1440;
export const GALLERY_LIMIT = 24;
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;

export function createPicture({ id = createStableId('picture'), title = 'My Picture', backgroundAssetId = 'background-paper', now = new Date().toISOString() } = {}) {
  return {
    schema: PAGE_SCHEMA,
    id,
    title,
    createdAt: now,
    updatedAt: now,
    page: { width: PAGE_WIDTH, height: PAGE_HEIGHT, backgroundAssetId },
    stickers: [],
    embeddedAssets: [],
    promptId: null
  };
}

export function validatePicture(value) {
  if (!value || typeof value !== 'object') throw new Error('Picture data is missing.');
  if (value.schema !== PAGE_SCHEMA) throw new Error(`Picture version ${value.schema || 'unknown'} is not supported.`);
  if (typeof value.id !== 'string' || !value.id || typeof value.title !== 'string') throw new Error('Picture identity is invalid.');
  if (value.page?.width !== PAGE_WIDTH || value.page?.height !== PAGE_HEIGHT || typeof value.page?.backgroundAssetId !== 'string') throw new Error('Picture page settings are invalid.');
  if (!Array.isArray(value.stickers) || !Array.isArray(value.embeddedAssets || [])) throw new Error('Picture content is invalid.');
  const layerIds = new Set();
  for (const sticker of value.stickers) {
    if (!sticker || typeof sticker.layerId !== 'string' || !sticker.layerId || layerIds.has(sticker.layerId)) throw new Error('Picture has an invalid sticker identity.');
    layerIds.add(sticker.layerId);
    if (typeof sticker.assetId !== 'string' || !Number.isFinite(sticker.x) || !Number.isFinite(sticker.y)
      || !Number.isFinite(sticker.scaleX) || !Number.isFinite(sticker.scaleY) || !Number.isFinite(sticker.angle)) {
      throw new Error('Picture has invalid sticker settings.');
    }
    if ((sticker.flipX !== undefined && typeof sticker.flipX !== 'boolean')
      || (sticker.flipY !== undefined && typeof sticker.flipY !== 'boolean')
      || (sticker.opacity !== undefined && !Number.isFinite(sticker.opacity))
      || (sticker.zIndex !== undefined && !Number.isFinite(sticker.zIndex))) {
      throw new Error('Picture has invalid sticker settings.');
    }
  }
  for (const asset of value.embeddedAssets || []) {
    if (!asset || typeof asset.id !== 'string' || typeof asset.dataUrl !== 'string' || !asset.dataUrl.startsWith('data:image/')) throw new Error('Picture has an invalid embedded sticker.');
  }
  return true;
}

export function normalizePicture(value) {
  validatePicture(value);
  return JSON.parse(JSON.stringify({
    ...value,
    stickers: value.stickers.map((sticker, index) => ({
      ...sticker,
      flipX: sticker.flipX ?? false,
      flipY: sticker.flipY ?? false,
      opacity: sticker.opacity ?? 1,
      zIndex: sticker.zIndex ?? index
    })),
    embeddedAssets: value.embeddedAssets || []
  }));
}

export function createSticker(assetId, { x = PAGE_WIDTH / 2, y = PAGE_HEIGHT / 2, scale = 0.78, layerId = createStableId('sticker') } = {}) {
  return { layerId, assetId, x, y, scaleX: scale, scaleY: scale, angle: 0, flipX: false, flipY: false, opacity: 1, zIndex: 0 };
}

export function resizeSticker(sticker, factor) {
  const ratio = Math.max(MIN_SCALE, Math.min(MAX_SCALE, sticker.scaleX * factor));
  return { ...sticker, scaleX: ratio, scaleY: Math.max(MIN_SCALE, Math.min(MAX_SCALE, sticker.scaleY * factor)) };
}

export function rotateSticker(sticker, degrees = 15) {
  return { ...sticker, angle: ((sticker.angle + degrees) % 360 + 360) % 360 };
}

export function flipSticker(sticker) {
  return { ...sticker, flipX: !sticker.flipX };
}

export function moveStickerOneStep(stickers, layerId, direction) {
  const ordered = stickers.map((sticker) => ({ ...sticker }));
  const index = ordered.findIndex((sticker) => sticker.layerId === layerId);
  const step = direction < 0 ? -1 : direction > 0 ? 1 : 0;
  const target = index + step;
  if (index >= 0 && step && target >= 0 && target < ordered.length) {
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  }
  return ordered.map((sticker, zIndex) => ({ ...sticker, zIndex }));
}

export function clampStickerPosition(sticker, renderedWidth, renderedHeight, visibleRatio = 0.1) {
  const edgeX = renderedWidth * (0.5 - visibleRatio);
  const edgeY = renderedHeight * (0.5 - visibleRatio);
  const minX = -edgeX;
  const maxX = PAGE_WIDTH + edgeX;
  const minY = -edgeY;
  const maxY = PAGE_HEIGHT + edgeY;
  return { ...sticker, x: Math.max(minX, Math.min(maxX, sticker.x)), y: Math.max(minY, Math.min(maxY, sticker.y)) };
}

export function duplicateSticker(sticker, layerId = createStableId('sticker')) {
  return { ...sticker, layerId, x: sticker.x + 44, y: sticker.y + 44, zIndex: sticker.zIndex + 1 };
}

export function duplicatePicture(picture, title, now = new Date().toISOString()) {
  const copy = normalizePicture(picture);
  copy.id = createStableId('picture');
  copy.title = title || `${picture.title} Copy`;
  copy.createdAt = now;
  copy.updatedAt = now;
  copy.stickers = copy.stickers.map((sticker) => ({ ...sticker, layerId: createStableId('sticker') }));
  return copy;
}

export function mapChildSafeError(error) {
  const message = String(error?.message || error || '');
  if (/quota|space|storage/i.test(message)) return 'This picture could not be saved on the device. You can still download it.';
  if (/zip|pack|archive|decompress/i.test(message)) return 'Some stickers could not be added. A grown-up can see the details.';
  if (/image|sticker|decode/i.test(message)) return 'That sticker could not be opened.';
  return 'Something wobbled. Your picture is still here.';
}
