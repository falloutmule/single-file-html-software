const urls = new Map();

export function registerBlockFolkStickerAssets(entries) {
  for (const [filename, dataUrl] of Object.entries(entries || {})) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) throw new Error(`BlockFolk sticker ${filename} must be an embedded PNG data URL.`);
    urls.set(filename, dataUrl);
  }
}

export function blockFolkStickerAssetUrl(filename) {
  const dataUrl = urls.get(filename);
  if (!dataUrl) throw new Error(`BlockFolk sticker asset is not registered: ${filename}`);
  return dataUrl;
}
