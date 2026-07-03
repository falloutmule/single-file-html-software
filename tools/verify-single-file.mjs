#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST_FILE = join(ROOT, 'dist', 'index.html');

if (!existsSync(DIST_FILE)) {
  console.error('[verify] FAIL: dist/index.html does not exist. Run "npm run build" first.');
  process.exit(1);
}

const html = readFileSync(DIST_FILE, 'utf-8');

// Forbidden patterns (case-insensitive)
const FORBIDDEN = [
  { pattern: /<script\s+src=/i, label: '<script src=' },
  { pattern: /<link\s+rel=["']?stylesheet/i, label: '<link rel=stylesheet' },
  { pattern: /@import\s+url\(/i, label: '@import url(' },
  { pattern: /https?:\/\//i, label: 'http:// or https://' },
  { pattern: /fonts\.googleapis/i, label: 'fonts.googleapis' },
  { pattern: /cdn\./i, label: 'cdn.' },
];

// Allowed exceptions: data: and blob: URLs inside inline content
// We strip data: and blob: references before checking for http patterns
const cleaned = html.replace(/data:[^\s"'>)]+/g, '').replace(/blob:[^\s"'>)]+/g, '');

const failures = [];

for (const { pattern, label } of FORBIDDEN) {
  const matches = cleaned.match(pattern);
  if (matches) {
    failures.push({ label, count: matches.length });
  }
}

if (failures.length > 0) {
  console.error('[verify] FAIL: Forbidden external references found:');
  for (const { label, count } of failures) {
    console.error(`  - ${label}: ${count} occurrence(s)`);
  }
  process.exit(1);
}

console.log('[verify] PASS: dist/index.html is self-contained (no external references detected)');
