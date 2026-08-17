export const ASSET_LIMITS = Object.freeze({
  zipBytes: 24 * 1024 * 1024,
  files: 80,
  decompressedBytes: 48 * 1024 * 1024,
  imageBytes: 4 * 1024 * 1024,
  imageDimension: 4096,
  retainedBytes: 64 * 1024 * 1024,
  alphaThreshold: 8
});

export function mimeFromFilename(name = '') {
  const extension = name.split('.').pop()?.toLowerCase();
  return ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' })[extension] || null;
}

export function isSupportedImageFilename(name) { return !!mimeFromFilename(name); }
export function baseFilename(path = '') { return path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'sticker'; }
export function dataUrlBytes(dataUrl = '') {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return 0;
  const payload = dataUrl.slice(comma + 1).replace(/\s/g, '');
  return dataUrl.includes(';base64,') ? Math.max(0, Math.floor((payload.length * 3) / 4) - (payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0)) : payload.length;
}
