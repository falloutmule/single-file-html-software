import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src');
const findings = [];
const sourceFiles = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(js|html|css|json)$/.test(name)) {
      sourceFiles.push(path);
      const text = readFileSync(path, 'utf8');
      const runtimeText = text.replaceAll('http://www.w3.org/2000/svg', '');
      if (/https?:\/\//i.test(runtimeText)) findings.push(`${path}: external URL`);
      if (/\beval\s*\(|new\s+Function\s*\(/.test(text)) findings.push(`${path}: dynamic code execution`);
      if (/\son[a-z]+\s*=/.test(text)) findings.push(`${path}: inline event handler`);
    }
  }
}

walk(src);
if (findings.length) throw new Error(`Static audit failed:\n${findings.join('\n')}`);
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.name !== '@sfhs/example-blockfolk-imaginarium') throw new Error('BlockFolk package identity is not isolated.');
if (pkg.dependencies.fabric !== '7.4.0') throw new Error('Fabric dependency is not pinned to 7.4.0.');
if (pkg.dependencies.fflate !== '0.8.3') throw new Error('fflate dependency is not pinned to 0.8.3.');
if (pkg.dependencies['@lucide/icons'] !== '1.16.0') throw new Error('Temporary Lucide icon data is not pinned.');
const html = readFileSync(join(src, 'index.html'), 'utf8');
if (/\bUeye\b/.test(html)) throw new Error('Ueye must not appear in the child-facing HTML.');
if (!/<title>BlockFolk Imaginarium<\/title>/.test(html)) throw new Error('BlockFolk page identity is missing.');
const combined = sourceFiles.map((path) => readFileSync(path, 'utf8')).join('\n');
if (/the-imaginarium-library-v1|the-imaginarium\.preferences@1|window\.Imaginarium\b/.test(combined)) throw new Error('Inherited runtime identity remains in BlockFolk source.');
if (/background-blockfolk-valley|sticker-blockfolk-|paper-cut sticker|paper-cut background/.test(combined)) throw new Error('Inherited built-in art metadata remains in BlockFolk source.');
if (/\bMinecraft\b/i.test(combined)) throw new Error('Unapproved third-party product naming is present.');
const librarySource = readFileSync(join(src, 'model', 'builtInLibrary.js'), 'utf8');
const expectedCategoryDefinitions = [
  "id: 'animals', title: 'Animals'", "id: 'people', title: 'People'", "id: 'building', title: 'Building'",
  "id: 'nature', title: 'Nature'", "id: 'magic', title: 'Magic'", "id: 'emoji', title: 'Emoji'"
];
for (const definition of expectedCategoryDefinitions) if (!librarySource.includes(definition)) throw new Error(`Missing category definition: ${definition}`);
if (/id:\s*['"](?:things|silly|words)['"]/.test(librarySource)) throw new Error('An obsolete category definition remains in the built-in library.');
if (!/BUILT_IN_STICKERS\s*=\s*Object\.freeze\(\[\]\)/.test(librarySource)) throw new Error('The production sticker catalog must remain empty.');
if (!/BUILT_IN_BACKGROUNDS\s*=\s*Object\.freeze\(\[BLOCKFOLK_VALLEY_ASSET\]\)/.test(librarySource)) throw new Error('The built-in library must expose exactly the one production world.');
const worldSource = readFileSync(join(src, 'model', 'worldModel.js'), 'utf8');
for (const marker of ['4096', 'worldAssetUrl', 'BLOCKFOLK_VALLEY_ASSET', 'production: true', 'debug: false']) if (!worldSource.includes(marker)) throw new Error(`Production world contract marker is missing: ${marker}`);
for (const forbidden of ['DEBUG WORLD • NOT PRODUCTION', 'debugWorldSvg', 'OCEAN BAY']) if (worldSource.includes(forbidden)) throw new Error(`Debug world payload remains: ${forbidden}`);
const htmlInputs = [...combined.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
if (htmlInputs.some((value) => /^https?:/i.test(value))) throw new Error('Runtime source includes an external network dependency.');
const manifest = JSON.parse(readFileSync(join(src, 'assets', 'manifest.json'), 'utf8'));
const manifestAssets = manifest.bundles.flatMap((bundle) => bundle.assets || []);
if (manifest.bundles.length !== 1 || manifestAssets.length !== 1 || manifestAssets[0].alias !== 'blockfolk-valley' || manifestAssets[0].src !== 'backgrounds/blockfolk-valley.webp') throw new Error('The asset manifest must contain only the production BlockFolk Valley world.');
console.log('BLOCKFOLK_IMAGINARIUM_STATIC_AUDIT PASS offline source, isolated identity, six categories, one production world, empty sticker catalog, pinned Fabric/fflate/Lucide, no dynamic code or inline handlers');
