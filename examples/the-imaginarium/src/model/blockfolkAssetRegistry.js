const urls = new Map();

export function registerBlockfolkAssets(entries) {
  for (const [filename, dataUrl] of Object.entries(entries || {})) urls.set(filename, dataUrl);
}

export function blockfolkAssetUrl(filename) {
  return urls.get(filename) || 'data:image/png;base64,';
}
