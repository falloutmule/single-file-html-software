import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const file = path.join(root, 'dist/index.html');
const findings = [];
if (!fs.existsSync(file)) findings.push('artifact missing');
const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
if (!html.includes('var PIXI=')) findings.push('Pixi global bundle missing');
if (!html.includes('data-renderer="pixi-webgl"')) findings.push('renderer marker missing');
if (!html.includes('data-sfhs-candidate="INTAKE_REQUIRED"')) findings.push('intake status marker missing');
if (!html.includes('data:image/png;base64,')) findings.push('inlined PNG data missing');
if (/<script[^>]+src=/i.test(html)) findings.push('external script reference');
if (/<link[^>]+href=/i.test(html)) findings.push('external link reference');
const urlScan = html.replaceAll('http://www.w3.org/2000/svg', '').replaceAll('http://www.w3.org/1999/xhtml', '');
if (/\bhttps?:\/\//i.test(urlScan)) findings.push('external HTTP(S) URL found');
if (/\bimport\s*\(/.test(html)) findings.push('dynamic import found');
if ((html.match(/<canvas\b/gi) ?? []).length > 0) findings.push('authored canvas element found; Pixi must own the only canvas');
const outputs = fs.existsSync(path.join(root, 'dist')) ? fs.readdirSync(path.join(root, 'dist')).sort() : [];
if (JSON.stringify(outputs) !== JSON.stringify(['index.html'])) findings.push(`unexpected output set: ${outputs.join(', ')}`);
const bytes = fs.existsSync(file) ? fs.statSync(file).size : 0;
const sha256 = fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : '';
let descriptor = null;
try { descriptor = JSON.parse(fs.readFileSync(path.join(root, 'evidence/candidate-descriptor.json'), 'utf8')); }
catch (error) { findings.push(`candidate descriptor missing or invalid: ${error}`); }
if (descriptor) {
  if (descriptor.bytes !== bytes) findings.push(`descriptor byte mismatch: ${descriptor.bytes} != ${bytes}`);
  if (descriptor.sha256 !== sha256) findings.push(`descriptor hash mismatch: ${descriptor.sha256} != ${sha256}`);
  if (!html.includes(`content="${descriptor.buildId}"`)) findings.push('build ID not bound into HTML');
  if (descriptor.output !== 'dist/index.html') findings.push('descriptor output mismatch');
}
const result = {
  schema: 'skyline-drop-candidate-verification@1',
  status: findings.length ? 'FAIL' : 'PASS',
  bytes,
  sha256,
  buildId: descriptor?.buildId ?? null,
  outputSet: outputs,
  rendererMarker: 'pixi-webgl',
  inlinedPngDataUris: (html.match(/data:image\/png;base64,/g) ?? []).length,
  externalHttpReferences: 0,
  findings,
};
fs.writeFileSync(path.join(root, 'evidence/candidate-static-verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (findings.length) process.exit(1);
