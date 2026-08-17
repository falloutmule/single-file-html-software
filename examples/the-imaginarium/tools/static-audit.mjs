import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src');
const findings = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(js|html|css|json)$/.test(name)) {
      const text = readFileSync(path, 'utf8');
      if (/https?:\/\//i.test(text)) findings.push(`${path}: external URL`);
      if (/\beval\s*\(|new\s+Function\s*\(/.test(text)) findings.push(`${path}: dynamic code execution`);
      if (/\son[a-z]+\s*=/.test(text)) findings.push(`${path}: inline event handler`);
    }
  }
}

walk(src);
if (findings.length) throw new Error(`Static audit failed:\n${findings.join('\n')}`);
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.dependencies.fabric !== '7.4.0') throw new Error('Fabric dependency is not pinned to 7.4.0.');
if (pkg.dependencies.fflate !== '0.8.3') throw new Error('fflate dependency is not pinned to 0.8.3.');
const html = readFileSync(join(src, 'index.html'), 'utf8');
if (/\bUeye\b/.test(html)) throw new Error('Ueye must not appear in the child-facing HTML.');
console.log('IMAGINARIUM_STATIC_AUDIT PASS offline source, pinned Fabric/fflate, no dynamic code or inline handlers');
