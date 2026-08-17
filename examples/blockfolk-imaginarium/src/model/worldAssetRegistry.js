let url = 'data:image/webp;base64,';

export function registerWorldAsset(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/webp;base64,')) throw new Error('BlockFolk Valley must be an embedded WebP data URL.');
  url = dataUrl;
}

export function worldAssetUrl() { return url; }
