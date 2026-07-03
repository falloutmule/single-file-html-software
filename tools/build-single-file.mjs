#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve(import.meta.dirname, '..');
const SHELL_DIR = join(ROOT, 'src', 'shell');
const CORE_DIR = join(ROOT, 'src', 'core');
const DIST_DIR = join(ROOT, 'dist');
const DIST_FILE = join(DIST_DIR, 'index.html');

const SHELL_HTML = join(SHELL_DIR, 'app-shell.html');
const STYLES_CSS = join(SHELL_DIR, 'styles.css');

const JS_FILES = [
  { placeholder: 'MAIN-JS',     file: join(SHELL_DIR, 'main.js') },
  { placeholder: 'VIEWPORT-JS', file: join(CORE_DIR, 'viewport.js') },
  { placeholder: 'INPUT-JS',    file: join(CORE_DIR, 'input.js') },
  { placeholder: 'SAVE-JS',     file: join(CORE_DIR, 'save.js') },
  { placeholder: 'AUDIO-JS',    file: join(CORE_DIR, 'audio.js') },
  { placeholder: 'DEBUG-JS',    file: join(CORE_DIR, 'debug.js') },
];

// --- Validate all required source files exist ---
function assertFile(path, label) {
  if (!existsSync(path)) {
    console.error(`[build] FAIL: Missing ${label}: ${path}`);
    process.exit(1);
  }
}

assertFile(SHELL_HTML, 'app-shell.html');
assertFile(STYLES_CSS, 'styles.css');

for (const { file, placeholder } of JS_FILES) {
  assertFile(file, placeholder);
}

// --- Read sources ---
const shellHtml = readFileSync(SHELL_HTML, 'utf-8');
const stylesCss = readFileSync(STYLES_CSS, 'utf-8');

// --- Build composite hash ---
const parts = [shellHtml, stylesCss];
for (const { file } of JS_FILES) {
  parts.push(readFileSync(file, 'utf-8'));
}
const hash = createHash('sha256').update(parts.join('')).digest('hex').slice(0, 8);
const timestamp = new Date().toISOString();

// --- Inline into template ---
let output = shellHtml;

// Strip external <link> stylesheet tags
output = output.replace(/<link\s+rel=["']stylesheet["']\s+href=["'][^"']+["'][^>]*>\s*\n?/gi, '');

// Strip external <script src> tags
output = output.replace(/<script\s+src=["'][^"']+["'][^>]*><\/script>\s*\n?/gi, '');

// Inline styles
if (!output.includes('<!-- STYLES -->')) {
  console.error('[build] FAIL: app-shell.html must contain <!-- STYLES --> placeholder');
  process.exit(1);
}
output = output.replace('<!-- STYLES -->', `<style>\n${stylesCss}\n</style>`);

// Inline JS files
for (const { placeholder, file } of JS_FILES) {
  const marker = `<!-- ${placeholder} -->`;
  if (!output.includes(marker)) {
    console.error(`[build] FAIL: app-shell.html must contain ${marker} placeholder`);
    process.exit(1);
  }
  let code = readFileSync(file, 'utf-8');
  // Strip ES module export keywords — inlined scripts run in global scope
  code = code.replace(/^export\s+/gm, '');
  const sectionName = placeholder.replace(/-JS$/, '');
  output = output.replace(
    marker,
    `<!-- BEGIN ${sectionName} -->\n<script>\n${code}\n</script>\n<!-- END ${sectionName} -->`
  );
}

// --- Prepend build metadata ---
const buildComment = `<!-- Built: ${timestamp} | Hash: ${hash} | Source: single-file-html-software -->\n`;
output = buildComment + output;

// --- Write output ---
if (!existsSync(DIST_DIR)) {
  mkdirSync(DIST_DIR, { recursive: true });
}

writeFileSync(DIST_FILE, output, 'utf-8');

console.log(`[build] OK: ${DIST_FILE} (${output.length} bytes) | ${timestamp} | hash:${hash}`);
