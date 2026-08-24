import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const argumentsList = process.argv.slice(2);
let artifactPath = join(root, 'dist', 'index.html');
let reportPath = null;
let artifactArgumentSeen = false;
for (let index = 0; index < argumentsList.length; index += 1) {
  const argument = argumentsList[index];
  if (argument === '--report') {
    const value = argumentsList[index + 1];
    if (!value) throw new Error('--report requires an output path.');
    reportPath = resolve(process.cwd(), value); index += 1;
  } else if (!argument.startsWith('-') && !artifactArgumentSeen) {
    artifactPath = resolve(process.cwd(), argument); artifactArgumentSeen = true;
  } else throw new Error(`Unknown packed-audit argument: ${argument}`);
}

const artifactBytes = readFileSync(artifactPath);
const artifact = artifactBytes.toString('utf8');
const violations = [];
const requireCondition = (condition, message) => { if (!condition) violations.push(message); };
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const portablePath = (path) => path.split('\\').join('/');
const safeArtifactPath = (() => {
  const projectRelative = portablePath(relative(root, artifactPath));
  return projectRelative.startsWith('../') ? basename(artifactPath) : projectRelative;
})();

const inheritedMarkers = [
  'the-imaginarium-library-v1', 'the-imaginarium.preferences@1', 'window.Imaginarium',
  'background-paper', 'background-bedroom',
  'sticker-animals-cat', 'paper-cut sticker', 'paper-cut background',
  'blockfolk-valley.png', 'Minecraft'
];
for (const marker of inheritedMarkers) requireCondition(!artifact.includes(marker), `packed artifact must not contain ${marker}`);
for (const marker of [
  '<title>BlockFolk Imaginarium</title>', 'blockfolk-imaginarium-library-v1',
  'blockfolk-imaginarium.preferences@1', 'blockfolk-imaginarium.page@2',
  'blockfolk-imaginarium.sticker-pack@1', 'blockfolk-imaginarium.puzzle@1',
  'blockfolk-valley', 'Classic BlockFolk Valley', 'sticker-blockfolk-', 'Wolf', 'red-dragon', 'Dragon',
  'camera-zoom-in', 'camera-zoom-out', 'camera-fit', 'Add Emoji'
]) requireCondition(artifact.includes(marker), `packed artifact must contain ${marker}`);
for (const marker of ['show-world-locations', 'close-world-locations', 'choose-world', 'world-sheet', 'location-grid', 'background-grid', 'STARTING_LOCATIONS']) {
  requireCondition(!artifact.includes(marker), `packed artifact must not contain removed world/location marker ${marker}`);
}
for (const obsoleteDefinition of [
  /id:\s*["']things["']\s*,\s*title:\s*["']Things["']/,
  /id:\s*["']silly["']\s*,\s*title:\s*["']Silly["']/,
  /id:\s*["']words["']\s*,\s*title:\s*["']Words["']/,
  /data-category=["'](?:things|silly|words)["']/,
  /<option\s+value=["'](?:things|silly|words)["']/
]) requireCondition(!obsoleteDefinition.test(artifact), `packed artifact must not contain obsolete category definition ${obsoleteDefinition}`);
requireCondition(!/<script[^>]+src=/iu.test(artifact), 'packed artifact must not load an external script');
requireCondition(!/<link[^>]+rel=["']?stylesheet/iu.test(artifact), 'packed artifact must not load an external stylesheet');
requireCondition(!/(?:src|href)=["']https?:/iu.test(artifact), 'packed artifact must not request runtime network resources');
requireCondition(!artifact.includes('DEBUG WORLD • NOT PRODUCTION') && !artifact.includes('OCEAN BAY'), 'debug world payload must not remain in the packed product');

const manifest = JSON.parse(readFileSync(join(root, 'src', 'assets', 'manifest.json'), 'utf8'));
const manifestEntries = manifest.bundles.flatMap((bundle) => (bundle.assets || []).map((asset) => ({ ...asset, bundle: bundle.name })));
const stickerLibrarySource = readFileSync(join(root, 'src', 'model', 'blockfolkStickerLibrary.js'), 'utf8');
const stickerConsumers = [...stickerLibrarySource.matchAll(/makeBlockFolkSticker\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+\.png)'/gu)].map((match) => ({
  id: `sticker-blockfolk-${match[1]}`, name: match[2], category: match[3], filename: match[4]
}));
const consumerByFilename = new Map(stickerConsumers.map((consumer) => [consumer.filename, consumer]));
requireCondition(stickerConsumers.length === 30 && consumerByFilename.size === 30, 'production library must consume exactly 30 uniquely named BlockFolk sticker files');

const stickerRegistrationSource = readFileSync(join(root, 'src', 'model', 'registerBlockFolkStickerAssets.js'), 'utf8');
const importedStickerPathByVariable = new Map([...stickerRegistrationSource.matchAll(/import\s+([A-Za-z0-9_$]+)\s+from\s+['"]\.\.\/assets\/(blockfolk\/[^'"]+\.png)['"]/gu)].map((match) => [match[1], match[2]]));
const registeredStickerVariableByFilename = new Map([...stickerRegistrationSource.matchAll(/['"]([^'"]+\.png)['"]\s*:\s*([A-Za-z0-9_$]+)/gu)].map((match) => [match[1], match[2]]));
requireCondition(importedStickerPathByVariable.size === 30 && registeredStickerVariableByFilename.size === 30, 'sticker registry must import and register exactly 30 PNG files');
for (const consumer of stickerConsumers) {
  const variable = registeredStickerVariableByFilename.get(consumer.filename);
  requireCondition(variable && importedStickerPathByVariable.get(variable) === `blockfolk/${consumer.filename}`, `${consumer.filename} must connect library consumer → registry → exact source file`);
}

const worldRegistrationSource = readFileSync(join(root, 'src', 'model', 'registerWorldAsset.js'), 'utf8');
const worldImport = /import\s+([A-Za-z0-9_$]+)\s+from\s+['"]\.\.\/assets\/(backgrounds\/blockfolk-valley-classic\.png)['"]/u.exec(worldRegistrationSource);
requireCondition(Boolean(worldImport) && new RegExp(`registerWorldAsset\\(\\s*['"]blockfolk-valley['"]\\s*,\\s*${worldImport?.[1] || 'MISSING'}\\s*\\)`, 'u').test(worldRegistrationSource), 'Classic world must connect canonical ID → registry → exact source file');

const manifestStickerPaths = manifestEntries.filter((entry) => entry.bundle === 'blockfolk-stickers').map((entry) => entry.src).sort();
const registeredStickerPaths = [...registeredStickerVariableByFilename.entries()].map(([filename, variable]) => importedStickerPathByVariable.get(variable) || `MISSING/${filename}`).sort();
requireCondition(manifest.bundles.length === 2 && manifestEntries.length === 31, 'asset manifest must declare exactly two bundles and 31 assets');
requireCondition(JSON.stringify(manifestStickerPaths) === JSON.stringify(registeredStickerPaths), 'manifest sticker set must exactly match the active production registry');
requireCondition(manifestEntries.filter((entry) => entry.alias === 'blockfolk-valley' && entry.src === 'backgrounds/blockfolk-valley-classic.png').length === 1, 'manifest must expose exactly one Classic world under the canonical ID');
requireCondition(new Set(manifestEntries.map((entry) => entry.alias)).size === manifestEntries.length && new Set(manifestEntries.map((entry) => entry.src)).size === manifestEntries.length, 'manifest aliases and source paths must be unique');

const expectedAssets = [];
const expectedByHash = new Map();
for (const entry of manifestEntries) {
  const sourcePath = join(root, 'src', 'assets', entry.src);
  if (!existsSync(sourcePath)) { violations.push(`manifest source is missing: ${entry.src}`); continue; }
  const bytes = readFileSync(sourcePath);
  const hash = sha256(bytes);
  const consumer = entry.bundle === 'blockfolk-world'
    ? { id: 'blockfolk-valley', name: 'Classic BlockFolk Valley', category: 'world', filename: basename(entry.src) }
    : consumerByFilename.get(basename(entry.src));
  requireCondition(Boolean(consumer), `manifest asset has no active production consumer: ${entry.src}`);
  const expected = { ...entry, sourcePath: `src/assets/${portablePath(entry.src)}`, bytes, hash, consumer };
  expectedAssets.push(expected);
  const matches = expectedByHash.get(hash) || []; matches.push(expected); expectedByHash.set(hash, matches);
}
for (const [hash, matches] of expectedByHash) requireCondition(matches.length === 1, `production sources duplicate SHA-256 ${hash}: ${matches.map((item) => item.src).join(', ')}`);

const mediaPattern = /data:(?<mime>[a-z]+\/[a-z0-9.+-]+);base64,(?<payload>[A-Za-z0-9+/]+={0,2})/giu;
const packedMedia = [...artifact.matchAll(mediaPattern)].map((match, index) => {
  const bytes = Buffer.from(match.groups.payload, 'base64');
  const hash = sha256(bytes);
  const expectedMatches = expectedByHash.get(hash) || [];
  const expected = expectedMatches.length === 1 ? expectedMatches[0] : null;
  return {
    sequence: index + 1,
    index: match.index,
    end: match.index + match[0].length,
    payloadStart: match.index + match[0].indexOf(match.groups.payload),
    payloadEnd: match.index + match[0].indexOf(match.groups.payload) + match.groups.payload.length,
    mime: match.groups.mime.toLowerCase(),
    packedBytes: Buffer.byteLength(match[0]),
    decodedBytes: bytes.length,
    sha256: hash,
    sourcePath: expected?.sourcePath || null,
    productId: expected?.consumer?.id || null,
    name: expected?.consumer?.name || null,
    category: expected?.consumer?.category || null,
    classification: expected ? (expected.bundle === 'blockfolk-world' ? 'active-blockfolk-world' : 'active-blockfolk-sticker') : 'unclaimed'
  };
});
requireCondition(packedMedia.length === 31, `packed artifact must contain exactly 31 media payloads, found ${packedMedia.length}`);
for (const media of packedMedia) {
  requireCondition(media.mime === 'image/png', `only production PNG media may be embedded, found ${media.mime}`);
  requireCondition(media.classification !== 'unclaimed', `packed payload is not claimed by the production manifest: ${media.sha256}`);
}
for (const expected of expectedAssets) requireCondition(packedMedia.filter((media) => media.sha256 === expected.hash).length === 1, `${expected.sourcePath} must occur exactly once in the packed artifact`);
requireCondition(new Set(packedMedia.map((media) => media.sha256)).size === packedMedia.length, 'packed artifact must not contain duplicate media payloads');

const concreteMediaUrls = [...artifact.matchAll(/data:[a-z]+\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*,[A-Za-z0-9%+/=._~-]+/giu)];
for (const match of concreteMediaUrls) requireCondition(packedMedia.some((media) => media.index === match.index), `non-base64 or unclassified embedded media URL at character ${match.index}`);
const longBase64Runs = [...artifact.matchAll(/[A-Za-z0-9+/]{1368,}={0,2}/gu)];
for (const match of longBase64Runs) requireCondition(packedMedia.some((media) => match.index >= media.payloadStart && match.index + match[0].length <= media.payloadEnd), `unclassified large base64 payload at character ${match.index}`);

function tagRegions(text, tagName) {
  const regions = [];
  const lowerText = text.toLowerCase();
  const openNeedle = `<${tagName}`; const closeNeedle = `</${tagName}>`;
  let cursor = 0;
  while (cursor < text.length) {
    const outerStart = lowerText.indexOf(openNeedle, cursor);
    if (outerStart < 0) break;
    const openEnd = lowerText.indexOf('>', outerStart);
    const closeStart = openEnd < 0 ? -1 : lowerText.indexOf(closeNeedle, openEnd + 1);
    if (openEnd < 0 || closeStart < 0) { violations.push(`unterminated <${tagName}> element`); break; }
    const start = openEnd + 1; const end = closeStart; const outerEnd = closeStart + closeNeedle.length;
    const content = text.slice(start, end);
    regions.push({ outerStart, outerEnd, start, end, content, bytes: Buffer.byteLength(content) });
    cursor = outerEnd;
  }
  return regions;
}
const scriptRegions = tagRegions(artifact, 'script');
const styleRegions = tagRegions(artifact, 'style');
requireCondition(scriptRegions.length === 1, `packed artifact must contain one runtime script, found ${scriptRegions.length}`);
requireCondition(packedMedia.every((media) => scriptRegions.some((region) => media.index >= region.start && media.end <= region.end)), 'all declared media must be inlined through the packed runtime registry');
const packedStyles = styleRegions.map((region) => region.content).join('\n');
requireCondition(!/@font-face\b/iu.test(packedStyles), 'packed CSS must not declare or embed a font face');
requireCondition(!/url\s*\(/iu.test(packedStyles), 'packed CSS must not contain an un-inventoried asset URL');
let markupWithoutScripts = ''; let markupCursor = 0;
for (const region of scriptRegions) { markupWithoutScripts += artifact.slice(markupCursor, region.outerStart); markupCursor = region.outerEnd; }
markupWithoutScripts += artifact.slice(markupCursor);
requireCondition(!/<svg\b/iu.test(markupWithoutScripts), 'packed HTML must not contain an un-inventoried static inline SVG');

const librarySource = readFileSync(join(root, 'src', 'model', 'builtInLibrary.js'), 'utf8');
const lucideImport = /import\s*\{([^}]+)\}\s*from\s*['"]@lucide\/icons['"]/u.exec(librarySource);
const lucideIcons = (lucideImport?.[1] || '').split(',').map((name) => name.trim()).filter(Boolean).sort();
const expectedLucideIcons = ['Blocks', 'PawPrint', 'Smile', 'Sprout', 'UsersRound', 'WandSparkles'].sort();
requireCondition(JSON.stringify(lucideIcons) === JSON.stringify(expectedLucideIcons), 'only the six essential Lucide category icons may be retained');
const packageManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dependencyNames = Object.keys({ ...(packageManifest.dependencies || {}), ...(packageManifest.devDependencies || {}) });
requireCondition(!dependencyNames.some((name) => /(?:twemoji|emoji.*(?:font|image)|noto.*emoji)/iu.test(name)), 'emoji font/image dependencies must not ship');
for (const fontName of ['Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji']) requireCondition(packedStyles.includes(fontName), `native emoji device-font stack must retain ${fontName}`);

const sumBy = (items, key) => items.reduce((total, item) => total + item[key], 0);
const summarize = (items, property) => [...new Set(items.map((item) => item[property]))].sort().map((value) => {
  const matches = items.filter((item) => item[property] === value);
  return { [property]: value, count: matches.length, decodedBytes: sumBy(matches, 'decodedBytes'), packedBytes: sumBy(matches, 'packedBytes') };
});
const mediaPackedBytes = sumBy(packedMedia, 'packedBytes');
const scriptBytes = scriptRegions.reduce((total, region) => total + region.bytes, 0);
const styleBytes = styleRegions.reduce((total, region) => total + region.bytes, 0);
const scriptCodeBytes = scriptBytes - mediaPackedBytes;
const htmlScaffoldBytes = artifactBytes.length - scriptBytes - styleBytes;
const sizeBreakdown = [
  { name: 'Classic world PNG', bytes: sumBy(packedMedia.filter((item) => item.classification === 'active-blockfolk-world'), 'packedBytes') },
  { name: '30 active BlockFolk sticker PNGs', bytes: sumBy(packedMedia.filter((item) => item.classification === 'active-blockfolk-sticker'), 'packedBytes') },
  { name: 'JavaScript excluding embedded media', bytes: scriptCodeBytes },
  { name: 'CSS', bytes: styleBytes },
  { name: 'HTML scaffold and wrapper tags', bytes: htmlScaffoldBytes }
].map((entry) => ({ ...entry, percent: Number(((entry.bytes / artifactBytes.length) * 100).toFixed(2)) }));
requireCondition(sizeBreakdown.reduce((total, entry) => total + entry.bytes, 0) === artifactBytes.length, 'inventory byte buckets must exactly equal artifact size');

const report = {
  schema: 'blockfolk.packed-asset-inventory@1',
  status: violations.length === 0 ? 'PASS' : 'FAIL',
  artifact: { path: safeArtifactPath, bytes: artifactBytes.length, sha256: sha256(artifactBytes) },
  totals: {
    embeddedMediaCount: packedMedia.length,
    embeddedMediaPackedBytes: mediaPackedBytes,
    embeddedMediaDecodedBytes: sumBy(packedMedia, 'decodedBytes'),
    unclaimedMediaCount: packedMedia.filter((item) => item.classification === 'unclaimed').length,
    duplicateMediaCount: packedMedia.length - new Set(packedMedia.map((item) => item.sha256)).size,
    externalRuntimeReferences: /(?:src|href)=["']https?:/giu.test(artifact) ? 1 : 0,
    embeddedFontFiles: packedMedia.filter((item) => item.mime.startsWith('font/') || item.mime.includes('font') || item.mime === 'application/vnd.ms-fontobject').length,
    embeddedAudioFiles: packedMedia.filter((item) => item.mime.startsWith('audio/')).length,
    embeddedEmojiMedia: packedMedia.filter((item) => /emoji/iu.test(`${item.sourcePath || ''} ${item.name || ''}`)).length
  },
  sizeBreakdown,
  mediaByClassification: summarize(packedMedia, 'classification'),
  stickersByCategory: summarize(packedMedia.filter((item) => item.classification === 'active-blockfolk-sticker'), 'category'),
  genericUiVectors: { provider: 'Lucide', classification: 'essential-generic-ui', count: lucideIcons.length, names: lucideIcons },
  nativeEmoji: { source: 'Unicode plus device font', embeddedFontFiles: 0, embeddedEmojiMedia: 0, fontStack: ['Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'sans-serif'] },
  assets: packedMedia.map((item) => ({
    sequence: item.sequence,
    mime: item.mime,
    packedBytes: item.packedBytes,
    decodedBytes: item.decodedBytes,
    sha256: item.sha256,
    sourcePath: item.sourcePath,
    productId: item.productId,
    name: item.name,
    category: item.category,
    classification: item.classification
  })),
  violations
};

if (reportPath) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
if (violations.length > 0) throw new Error(`Packed artifact purity audit failed:\n${violations.map((violation) => `- ${violation}`).join('\n')}`);
console.log(`BLOCKFOLK_IMAGINARIUM_PACKED_AUDIT PASS ${artifactBytes.length} bytes fully inventoried: ${mediaPackedBytes} packed media bytes, ${scriptCodeBytes} JavaScript bytes, ${styleBytes} CSS bytes, ${htmlScaffoldBytes} HTML/tag bytes; 31 exact active BlockFolk PNGs; six essential Lucide category icons; native Unicode emoji; zero unclaimed media`);
