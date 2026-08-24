import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const auditPath = join(root, 'tools', 'packed-audit.mjs');
const baselinePath = join(root, 'dist', 'index.html');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'blockfolk-packed-audit-'));

try {
  const candidatePath = join(temporaryDirectory, 'contaminated.html');
  const reportPath = join(temporaryDirectory, 'contaminated-inventory.json');
  const contamination = [
    '<style>@font-face{font-family:BadEmoji;src:url(data:font/woff2;base64,AA==)}</style>',
    '<svg aria-hidden="true"><path d="M0 0"/></svg>',
    '<img alt="donor" src="data:image/png;base64,AA==">',
    `<div data-hidden-payload="${'A'.repeat(1368)}"></div>`
  ].join('');
  const baseline = readFileSync(baselinePath, 'utf8');
  writeFileSync(candidatePath, baseline.replace('</body>', `${contamination}</body>`), 'utf8');
  const result = spawnSync(process.execPath, [auditPath, candidatePath, '--report', reportPath], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0, 'contaminated packed artifact must fail the purity audit');
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  assert.equal(report.schema, 'blockfolk.packed-asset-inventory@1');
  assert.equal(report.status, 'FAIL');
  assert.ok(report.totals.unclaimedMediaCount >= 2, 'unapproved PNG and font payloads must be inventoried as unclaimed');
  assert.ok(report.violations.some((message) => /only production PNG media/iu.test(message)), 'embedded font payload must be rejected');
  assert.ok(report.violations.some((message) => /font face/iu.test(message)), 'packed font declaration must be rejected');
  assert.ok(report.violations.some((message) => /static inline SVG/iu.test(message)), 'static inline SVG must be rejected');
  assert.ok(report.violations.some((message) => /large base64 payload/iu.test(message)), 'unclassified large base64 payload must be rejected');
  console.log('BLOCKFOLK_IMAGINARIUM_PACKED_AUDIT_SELF_TEST PASS contaminated PNG/font/SVG/base64 payloads fail closed');
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
