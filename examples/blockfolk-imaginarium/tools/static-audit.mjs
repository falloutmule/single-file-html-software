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
const manifest = JSON.parse(readFileSync(join(src, 'assets', 'manifest.json'), 'utf8'));
if (manifest.bundles.length !== 0) throw new Error('Pre-art asset manifest must stay empty.');
console.log('BLOCKFOLK_IMAGINARIUM_STATIC_AUDIT PASS offline source, isolated identity, empty built-ins, pinned Fabric/fflate/Lucide, no dynamic code or inline handlers');
