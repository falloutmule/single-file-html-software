// Keep MIME-correct placeholders so source-only model tests can inspect the
// descriptors without importing binary assets; registerWorldAsset replaces both
// values before the app renders.
const urls = new Map([
  ['blockfolk-valley', 'data:image/webp;base64,'],
  ['blockfolk-valley-classic', 'data:image/png;base64,']
]);

export function registerWorldAsset(id, dataUrl) {
  if (typeof id !== 'string' || !id || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) throw new Error('BlockFolk world must be an embedded image data URL.');
  urls.set(id, dataUrl);
}

export function worldAssetUrl(id) {
  const url = urls.get(id);
  if (!url) throw new Error(`BlockFolk world ${id || 'unknown'} is not registered.`);
  return url;
}
