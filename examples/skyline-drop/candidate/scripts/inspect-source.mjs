import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const findings = [];
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
let project;
try { project = readJson('sfhs.project.json'); } catch (error) { findings.push(`invalid sfhs.project.json: ${error}`); }
if (project) {
  if (project.schema !== 'sfhs.project@1') findings.push('unexpected project schema');
  if (project.adapter?.id !== 'pixi-v8') findings.push('adapter is not pixi-v8');
  if (project.adapter?.renderer?.required !== 'webgl') findings.push('WebGL is not required');
  if ((project.assets?.runtimeExternalUrls ?? []).length !== 0) findings.push('runtimeExternalUrls is not empty');
  const sourcePaths = [project.source?.html, project.source?.entry, ...(project.source?.styles ?? []), project.assets?.manifest].filter(Boolean);
  for (const relative of sourcePaths) if (!fs.existsSync(path.join(root, relative))) findings.push(`missing declared source: ${relative}`);
}
try {
  const manifest = readJson('src/assets/manifest.json');
  for (const bundle of manifest.bundles ?? []) for (const asset of bundle.assets ?? []) {
    const target = path.join(root, 'public', asset.src);
    if (!fs.existsSync(target)) findings.push(`missing declared asset: ${asset.src}`);
  }
} catch (error) { findings.push(`invalid asset manifest: ${error}`); }
const authored = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
if (/<canvas\b/i.test(authored)) findings.push('authored HTML contains a canvas; Pixi must create the only game surface');
for (const relative of ['src/index.html','src/styles.css','src/main.ts','src/presentation.ts']) {
  const text = fs.readFileSync(path.join(root, relative), 'utf8');
  if (/\bhttps?:\/\//i.test(text)) findings.push(`external HTTP URL in ${relative}`);
}
const result = {
  schema: 'skyline-drop-source-inspection@1',
  status: findings.length ? 'FAIL' : 'PASS',
  projectId: project?.project?.id ?? null,
  renderer: project?.adapter?.id ?? null,
  oneVisibleRendererPolicy: !findings.some((entry) => entry.includes('canvas')),
  declaredAssetCount: readJson('src/assets/manifest.json').bundles.flatMap((bundle) => bundle.assets).length,
  findings,
};
fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
fs.writeFileSync(path.join(root, 'evidence/source-inspection.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (findings.length) process.exit(1);
