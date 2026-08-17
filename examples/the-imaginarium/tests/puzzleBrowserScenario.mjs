/* global Buffer, document, window */
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactUrl = pathToFileURL(resolve(projectRoot, 'dist/index.html')).href;
const photoPath = process.argv.at(-1) === '--' ? undefined : process.argv.at(-1);
const evidencePath = resolve(projectRoot, 'test-results/puzzle-race-timer/phone.png');
const activeEvidencePath = resolve(projectRoot, 'test-results/puzzle-race-timer/race-active.png');
const photoDataUrl = photoPath
  ? `data:image/jpeg;base64,${(await readFile(photoPath)).toString('base64')}`
  : 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#9bd"/><circle cx="250" cy="360" r="180" fill="#f9a"/><rect x="750" y="120" width="350" height="480" rx="60" fill="#784ba0"/></svg>').toString('base64');

await mkdir(dirname(evidencePath), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 3.75, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const failures = [];
await context.route('**/*', async (route) => {
  const url = route.request().url();
  if (url === artifactUrl || /^(?:about:blank|blob:|data:|file:)/iu.test(url)) return route.continue();
  failures.push(`Unexpected request: ${url}`); return route.abort('blockedbyclient');
});
const page = await context.newPage();
page.on('pageerror', (error) => failures.push(`Page error: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') failures.push(`Console error: ${message.text()}`); });
await page.goto(artifactUrl, { waitUntil: 'load' });
await page.locator('#app[data-boot="ready"]').waitFor();
await page.evaluate(async ({ dataUrl }) => window.Imaginarium.app.puzzle.startFraming(dataUrl, 'Wide photo test'), { dataUrl: photoDataUrl });
await page.getByRole('radio', { name: /Tricky/ }).click();
await page.getByRole('button', { name: 'Make Puzzle' }).click();
await page.locator('#puzzle-progress').filter({ hasText: '0 of 16 pieces' }).waitFor();

const layout = await page.evaluate(() => {
  const board = document.querySelector('.puzzle-board').getBoundingClientRect();
  const pieces = [...document.querySelectorAll('.puzzle-piece')].map((piece) => piece.getBoundingClientRect());
  const headerControls = [...document.querySelectorAll('.puzzle-play-header [data-action]')].map((control) => {
    const rect = control.closest('.sfhs-cf-root')?.getBoundingClientRect() || control.getBoundingClientRect();
    return { action: control.dataset.action, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  });
  return {
    board: { width: board.width, height: board.height, right: board.right, bottom: board.bottom },
    maxPieceRight: Math.max(...pieces.map((piece) => piece.right)),
    maxPieceBottom: Math.max(...pieces.map((piece) => piece.bottom)),
    bodyHeight: document.body.scrollHeight,
    headerControls
  };
});
assert.ok(layout.board.width >= 295, `puzzle board should be larger on phone; received ${layout.board.width}`);
assert.ok(layout.board.right <= 384 && layout.board.bottom < 600, 'larger puzzle board must remain inside the upper phone area');
assert.ok(layout.maxPieceRight <= 384 && layout.maxPieceBottom <= 854, 'all loose pieces must remain reachable');
assert.equal(layout.bodyHeight, 854, 'puzzle play must not page-scroll');
assert.equal(layout.headerControls.length, 5, 'Back, Hint, Race, Snap, and Shuffle must all remain in the phone header');
assert.ok(layout.headerControls.every((control) => control.left >= 0 && control.right <= 384), 'every puzzle header control must remain inside the phone viewport');
assert.equal(await page.locator('.puzzle-slot').count(), 16);
assert.equal(await page.locator('button.puzzle-slot').count(), 0, 'board cells must not be tappable answer keys');

await page.getByRole('button', { name: 'Puzzle piece 1, 1' }).click();
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics().puzzle)).locked, 0, 'ordinary piece tap must not auto-fit');
const race = page.locator('[data-action="puzzle-race"]');
const raceTime = page.locator('#puzzle-race-time');
assert.equal(await race.isEnabled(), true); assert.equal(await raceTime.isHidden(), true);
await race.click();
await page.waitForFunction(() => {
  const diagnostic = window.Imaginarium.diagnostics().puzzle;
  return diagnostic.race === 'running' && diagnostic.raceElapsedMs >= 100;
});
assert.equal(await race.isEnabled(), false, 'Race must not restart while its timer is running');
assert.equal(await raceTime.isVisible(), true); assert.match(await raceTime.textContent(), /^⏱ \d+:\d{2}\.\d$/u);
const positionPieces = (placements) => page.evaluate(async (items) => {
  const controller = window.Imaginarium.app.puzzle;
  const columns = { easy: 2, fun: 3, tricky: 4 }[controller.puzzle.difficulty];
  const pieceWidth = controller.board.clientWidth / columns;
  const pieceHeight = controller.board.clientHeight / columns;
  const boardLeft = controller.board.offsetLeft + controller.board.clientLeft;
  const boardTop = controller.board.offsetTop + controller.board.clientTop;
  for (const item of items) {
    const model = controller.puzzle.pieces.find((piece) => piece.id === item.id);
    const target = controller.puzzle.pieces.find((piece) => piece.id === (item.targetId || item.id));
    const element = controller.pieceElements.get(model.id);
    const x = boardLeft + (target.column * pieceWidth) + (item.offsetX || 0);
    const y = boardTop + (target.row * pieceHeight) + (item.offsetY || 0);
    controller.positionPiece(model, x, y, pieceWidth, pieceHeight);
    await controller.rememberLoosePiecePosition(model, element);
  }
}, placements);

await page.evaluate(() => {
  const controller = window.Imaginarium.app.puzzle;
  const originalCue = controller.cue;
  window.__puzzleProductCues = [];
  controller.cue = (kind) => { window.__puzzleProductCues.push(kind); return originalCue(kind); };
});
const snap = page.locator('[data-action="puzzle-snap"]');
assert.equal(await snap.isEnabled(), true);
await snap.click();
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics().puzzle)).locked, 0, 'an empty Snap press must change nothing');
assert.equal(await snap.isEnabled(), true, 'Snap must remain available after an empty press');
assert.equal(await snap.getAttribute('aria-label'), 'Snap pieces into place');

await positionPieces([{ id: 'r0c0' }]);
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics().puzzle)).locked, 0, 'releasing a piece over its correct cell must not lock it');
await snap.click();
await page.locator('#puzzle-progress').filter({ hasText: '1 of 16 pieces' }).waitFor();
assert.equal(await snap.isEnabled(), true, 'Snap must remain reusable after a successful press');
assert.deepEqual(await page.evaluate(() => window.__puzzleProductCues), [], 'ordinary Snap must not add a second per-piece product cue');
await snap.click();
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics().puzzle)).locked, 1, 'repeated Snap must not duplicate an already locked piece');

await positionPieces([{ id: 'r0c1', targetId: 'r0c2' }, { id: 'r1c0' }, { id: 'r1c1' }]);
await snap.click();
await page.locator('#puzzle-progress').filter({ hasText: '3 of 16 pieces' }).waitFor();
assert.equal(await page.getByRole('button', { name: 'Puzzle piece 1, 2' }).isEnabled(), true, 'a piece centered over the wrong cell must remain loose');
const legacyPosition = await page.evaluate(async () => {
  const app = window.Imaginarium.app;
  app.puzzle.puzzle.snapUsed = true; app.puzzle.puzzle.snapArmed = true;
  await app.puzzle.persist();
  return app.puzzle.puzzle.pieces.find((piece) => piece.id === 'r0c1').position;
});
const elapsedBeforeReload = (await page.evaluate(() => window.Imaginarium.diagnostics().puzzle)).raceElapsedMs;
await page.reload();
await page.getByRole('button', { name: /Make a Puzzle/ }).click();
await page.getByRole('button', { name: 'Keep Solving' }).click();
await page.locator('#puzzle-progress').filter({ hasText: '3 of 16 pieces' }).waitFor();
assert.deepEqual(await page.evaluate(() => {
  const puzzle = window.Imaginarium.app.puzzle.puzzle;
  return { hasSnapUsed: Object.hasOwn(puzzle, 'snapUsed'), hasSnapArmed: Object.hasOwn(puzzle, 'snapArmed'), position: puzzle.pieces.find((piece) => piece.id === 'r0c1').position };
}), { hasSnapUsed: false, hasSnapArmed: false, position: legacyPosition }, 'reload must preserve loose position while removing obsolete one-use state');
const reloadedSnap = page.locator('[data-action="puzzle-snap"]');
assert.equal(await reloadedSnap.isEnabled(), true, 'legacy one-use state must never disable Snap');
await page.waitForFunction((previousElapsed) => {
  const diagnostic = window.Imaginarium.diagnostics().puzzle;
  return diagnostic.race === 'running' && diagnostic.raceElapsedMs >= previousElapsed;
}, elapsedBeforeReload);
assert.equal(await page.locator('[data-action="puzzle-race"]').isEnabled(), false, 'a resumed running race must not restart');
assert.equal(await page.locator('#puzzle-race-time').isVisible(), true, 'the running timer must remain visible after reload');
await page.screenshot({ path: activeEvidencePath, fullPage: true });

await positionPieces([{ id: 'r0c1' }]);
const keyboardPiece = page.getByRole('button', { name: 'Puzzle piece 1, 2' });
await keyboardPiece.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics().puzzle)).locked, 3, 'Enter on a piece must not secretly snap it');
await reloadedSnap.focus(); await page.keyboard.press('Space');
await page.locator('#puzzle-progress').filter({ hasText: '4 of 16 pieces' }).waitFor();

const remainingIds = await page.evaluate(() => window.Imaginarium.app.puzzle.puzzle.pieces.filter((piece) => !piece.locked).map((piece) => piece.id));
await positionPieces(remainingIds.map((id) => ({ id })));
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics().puzzle)).locked, 4, 'positioning every remaining piece must still wait for Snap');
await reloadedSnap.click();
await page.locator('#puzzle-progress').filter({ hasText: '16 of 16 pieces' }).waitFor();
const finishedRace = await page.evaluate(() => window.Imaginarium.diagnostics().puzzle);
assert.equal(finishedRace.difficulty, 'tricky'); assert.equal(finishedRace.pieces, 16); assert.equal(finishedRace.locked, 16); assert.equal(finishedRace.completed, true);
assert.equal(finishedRace.race, 'finished'); assert.ok(finishedRace.raceElapsedMs >= elapsedBeforeReload, 'the race must freeze only after the final Snap');
const frozenRaceText = await page.locator('#puzzle-race-time').textContent();
await page.waitForTimeout(250);
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics().puzzle)).raceElapsedMs, finishedRace.raceElapsedMs, 'the finished timer must remain frozen');
assert.equal(await page.locator('#puzzle-race-time').textContent(), frozenRaceText, 'the visible finished time must remain frozen');
assert.equal(await reloadedSnap.isEnabled(), false, 'Snap disables only after puzzle completion');
await page.getByRole('button', { name: 'Play Again' }).click();
await page.locator('#puzzle-progress').filter({ hasText: '0 of 16 pieces' }).waitFor();
assert.equal(await page.locator('[data-action="puzzle-snap"]').isEnabled(), true, 'a restarted puzzle keeps the unlimited Snap button available');
assert.equal(await page.locator('[data-action="puzzle-race"]').isEnabled(), true, 'Play Again must reset Race');
assert.equal(await page.locator('#puzzle-race-time').isHidden(), true, 'Play Again must hide the reset timer');
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics().puzzle)).race, 'idle');
await page.screenshot({ path: evidencePath, fullPage: true });
assert.deepEqual(failures, []);
console.log('IMAGINARIUM_PUZZLE_BROWSER_SCENARIO PASS', JSON.stringify({ layout, evidencePath, activeEvidencePath }));
await browser.close();
