/* global Image, TextDecoder, btoa */
import { unzipSync } from 'fflate';
import { ASSET_LIMITS, baseFilename, dataUrlBytes, isSupportedImageFilename, mimeFromFilename } from './assetModel.js';
import { trimDataUrl } from './trimTransparent.js';

export const PACK_SCHEMA = 'imaginarium.sticker-pack@1';

export function normalizeArchivePath(path = '') {
  const normalized = String(path).replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || /^[a-z]:/i.test(normalized) || normalized.includes('\0')) return null;
  const parts = normalized.split('/').filter(Boolean);
  if (parts.some((part) => part === '..')) return null;
  return parts.join('/');
}

export function safeId(value, fallback = 'item') {
  return String(value || fallback).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

export function resolveImportCategory(defaultCategory, itemCategory = 'imported') {
  return defaultCategory ? safeId(defaultCategory, 'imported') : safeId(itemCategory, 'imported');
}

export function validatePackManifest(value) {
  if (!value || value.schema !== PACK_SCHEMA) throw new Error('Sticker pack version is not supported.');
  if (typeof value.id !== 'string' || !value.id || typeof value.title !== 'string' || !value.title) throw new Error('Sticker pack identity is missing.');
  const collections = ['stickers', 'backgrounds'];
  for (const collection of collections) {
    if (value[collection] !== undefined && !Array.isArray(value[collection])) throw new Error(`Sticker pack ${collection} list is invalid.`);
    for (const item of value[collection] || []) {
      if (!item || !normalizeArchivePath(item.path) || typeof item.id !== 'string' || typeof item.name !== 'string') throw new Error(`Sticker pack has an invalid ${collection.slice(0, -1)} entry.`);
    }
  }
  return true;
}

export function inferPackManifest(paths, title = 'Imported Sticker Pack') {
  const images = paths.map(normalizeArchivePath).filter(Boolean).filter(isSupportedImageFilename);
  const stickers = []; const backgrounds = []; const used = new Set();
  for (const path of images) {
    const parts = path.split('/'); const lower = parts.map((part) => part.toLowerCase());
    const isBackground = lower.includes('backgrounds') || lower.includes('background');
    const filename = baseFilename(path); const display = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    let id = safeId(display); let suffix = 2;
    while (used.has(id)) { id = `${safeId(display)}-${suffix}`; suffix += 1; }
    used.add(id);
    if (isBackground) backgrounds.push({ path, id, name: display });
    else {
      const stickerIndex = lower.indexOf('stickers');
      const category = stickerIndex >= 0 && parts[stickerIndex + 1] && parts[stickerIndex + 1] !== filename ? safeId(parts[stickerIndex + 1]) : safeId(parts.at(-2) || 'imported');
      stickers.push({ path, id, name: display, category, alt: display });
    }
  }
  return { schema: PACK_SCHEMA, id: safeId(title), title, version: '1.0.0', creator: '', description: 'Folder structure inferred locally.', categories: [], stickers, backgrounds, inferred: true };
}

function bytesToDataUrl(bytes, mime) {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  return `data:${mime};base64,${btoa(binary)}`;
}

function imageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Image could not be opened.'));
    image.src = dataUrl;
  });
}

function resolveManifestPath(root, path) {
  return normalizeArchivePath([root, path].filter(Boolean).join('/'));
}

export async function processStickerPack(file, { defaultCategory = null } = {}) {
  if (!file || file.size > ASSET_LIMITS.zipBytes) throw new Error('This sticker pack is too big for this device. The ZIP limit is 24 MiB.');
  let unzipped;
  try { unzipped = unzipSync(new Uint8Array(await file.arrayBuffer())); } catch { throw new Error('This ZIP sticker pack could not be opened.'); }
  const entries = new Map(); const report = []; let decompressed = 0;
  for (const [rawPath, bytes] of Object.entries(unzipped)) {
    const path = normalizeArchivePath(rawPath);
    if (!path || rawPath.endsWith('/')) { if (rawPath && !rawPath.endsWith('/')) report.push({ path: rawPath, status: 'skipped', reason: 'Unsafe path' }); continue; }
    decompressed += bytes.byteLength;
    if (decompressed > ASSET_LIMITS.decompressedBytes) { report.push({ path, status: 'skipped', reason: '48 MiB decompressed limit' }); continue; }
    entries.set(path, bytes);
  }
  const manifestPath = [...entries.keys()].filter((path) => /(^|\/)pack\.json$/i.test(path)).sort((a, b) => a.length - b.length)[0];
  const root = manifestPath?.includes('/') ? manifestPath.slice(0, manifestPath.lastIndexOf('/')) : '';
  let manifest;
  if (manifestPath) {
    try { manifest = JSON.parse(new TextDecoder().decode(entries.get(manifestPath))); validatePackManifest(manifest); }
    catch (error) { throw new Error(`Sticker pack instructions are invalid: ${error.message}`); }
  } else {
    manifest = inferPackManifest([...entries.keys()], file.name.replace(/\.zip$/i, ''));
  }
  const chosen = [
    ...(manifest.stickers || []).map((entry) => ({ ...entry, kind: 'sticker' })),
    ...(manifest.backgrounds || []).map((entry) => ({ ...entry, kind: 'background' }))
  ];
  const importCategory = defaultCategory ? safeId(defaultCategory, 'imported') : null;
  const assets = []; let retained = 0; let eligible = 0;
  for (const item of chosen) {
    const path = resolveManifestPath(root, item.path);
    const bytes = entries.get(path) || entries.get(normalizeArchivePath(item.path));
    const mime = mimeFromFilename(item.path);
    if (!bytes || !mime) { report.push({ path: item.path, status: 'skipped', reason: 'Missing or unsupported image' }); continue; }
    eligible += 1;
    if (eligible > ASSET_LIMITS.files) { report.push({ path, status: 'skipped', reason: '80 image limit' }); continue; }
    if (bytes.byteLength > ASSET_LIMITS.imageBytes) { report.push({ path, status: 'skipped', reason: '4 MiB image limit' }); continue; }
    try {
      const originalDataUrl = bytesToDataUrl(bytes, mime);
      const dimensions = await imageDimensions(originalDataUrl);
      if (dimensions.width > ASSET_LIMITS.imageDimension || dimensions.height > ASSET_LIMITS.imageDimension) { report.push({ path, status: 'skipped', reason: '4096 pixel dimension limit' }); continue; }
      let dataUrl = originalDataUrl; let trimStatus = mime === 'image/jpeg' || item.kind === 'background' ? 'not-needed' : 'unchanged';
      if (mime !== 'image/jpeg' && item.kind === 'sticker') {
        const trimmed = await trimDataUrl(originalDataUrl);
        if (trimmed.status === 'empty') { report.push({ path, status: 'skipped', reason: 'Fully transparent image' }); continue; }
        trimStatus = trimmed.status;
        dataUrl = trimmed.dataUrl || originalDataUrl;
      }
      const nextBytes = dataUrlBytes(originalDataUrl) + (dataUrl === originalDataUrl ? 0 : dataUrlBytes(dataUrl));
      if (retained + nextBytes > ASSET_LIMITS.retainedBytes) { report.push({ path, status: 'skipped', reason: '64 MiB retained asset limit' }); continue; }
      retained += nextBytes;
      assets.push({
        id: `pack-${safeId(manifest.id)}-${safeId(item.id)}`,
        packId: safeId(manifest.id),
        name: item.name,
        alt: item.alt || item.name,
        category: item.kind === 'sticker' ? resolveImportCategory(importCategory, item.category) : item.category || 'imported',
        kind: item.kind,
        dataUrl,
        originalDataUrl,
        mime,
        width: dimensions.width,
        height: dimensions.height,
        sourcePath: path,
        trimStatus,
        builtIn: false
      });
      report.push({ path, status: 'imported', reason: trimStatus === 'trimmed' ? 'Transparent padding trimmed' : 'Ready' });
    } catch (error) {
      report.push({ path, status: 'failed', reason: error.message || 'Could not import image' });
    }
  }
  return {
    id: safeId(manifest.id), schema: PACK_SCHEMA, title: manifest.title, version: manifest.version || '1.0.0',
    creator: manifest.creator || '', description: manifest.description || '', installedAt: new Date().toISOString(),
    inferred: !!manifest.inferred, importCategory, categories: manifest.categories || [], assets, report
  };
}
