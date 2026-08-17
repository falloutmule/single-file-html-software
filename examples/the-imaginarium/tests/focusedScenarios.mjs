import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateControlPreset } from '@sfhs/control-feedback-contract';
import { createControlFeedbackRuntime } from '@sfhs/control-feedback-runtime';
import { createImaginariumControlPreset, shouldPlayControlCue, shouldPlayProductCue } from '../src/app/ImaginariumControls.js';
import { AUTOSAVE_MODES, DEFAULT_AUTOSAVE_MODE, autosavePolicy, normalizeAutosaveMode } from '../src/model/autosave.js';
import { ASSET_LIMITS, mimeFromFilename } from '../src/model/assetModel.js';
import { computeBackgroundLayout } from '../src/model/backgroundLayout.js';
import { BUILT_IN_BACKGROUNDS, BUILT_IN_CATEGORIES, BUILT_IN_STICKERS, validateBuiltInLibrary } from '../src/model/builtInLibrary.js';
import { PictureHistory } from '../src/model/history.js';
import { buildPuzzleGrid, createPuzzle, DEFAULT_DIFFICULTY, elapsedRaceTime, formatRaceTime, isPieceCenterInsideDestination, isPuzzleComplete, PUZZLE_HEIGHT, PUZZLE_WIDTH, restartPuzzle, validatePuzzle } from '../src/model/puzzleModel.js';
import { drawFramedImage, fitGeometry } from '../src/model/puzzleImage.js';
import { createStableId, resetIdCounterForTests } from '../src/model/ids.js';
import {
  GALLERY_LIMIT, MAX_SCALE, MIN_SCALE, PAGE_HEIGHT, PAGE_SCHEMA, PAGE_WIDTH, clampStickerPosition,
  createPicture, createSticker, duplicatePicture, duplicateSticker, flipSticker, mapChildSafeError, moveStickerOneStep,
  normalizePicture, resizeSticker, rotateSticker, validatePicture
} from '../src/model/pageModel.js';
import { DB_NAME, ImaginariumStorage, PREFERENCE_KEY } from '../src/model/storage.js';
import { PACK_SCHEMA, inferPackManifest, normalizeArchivePath, resolveImportCategory, safeId, validatePackManifest } from '../src/model/stickerPacks.js';
import { findAlphaBounds } from '../src/model/trimTransparent.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(join(root, 'src', 'app', 'ImaginariumApp.js'), 'utf8');
const controlSource = readFileSync(join(root, 'src', 'app', 'ImaginariumControls.js'), 'utf8');
const html = readFileSync(join(root, 'src', 'index.html'), 'utf8');
const assetManifest = JSON.parse(readFileSync(join(root, 'src', 'assets', 'manifest.json'), 'utf8'));

const bigControlPreset = createImaginariumControlPreset({ family: 'big', palette: 'yellow', value: 'test-big' });
assert.equal(validateControlPreset(bigControlPreset).valid, true, 'Big Toy preset must satisfy the SFHS control contract');
const bigRuntime = createControlFeedbackRuntime({ controlId: 'imaginarium-test-big', preset: bigControlPreset });
let result = bigRuntime.dispatch({ kind: 'contact-begin', source: 'pointer', sourceId: 'pointer:1', origin: { x: .5, y: .5 }, atMs: 1 });
assert.equal(result.snapshot.interaction, 'pressed-inside', 'contact must depress immediately');
assert.equal(result.events.some((event) => event.kind === 'cue' && event.cueId === 'plastic-click'), true, 'Big Toy contact must emit plastic-click');
result = bigRuntime.dispatch({ kind: 'contact-end', sourceId: 'pointer:1', inside: true, atMs: 2 });
assert.equal(result.events.filter((event) => event.kind === 'activate').length, 1, 'valid release must activate exactly once');
bigRuntime.dispatch({ kind: 'contact-begin', source: 'pointer', sourceId: 'pointer:2', atMs: 3 });
bigRuntime.dispatch({ kind: 'contact-update', sourceId: 'pointer:2', inside: false, atMs: 4 });
result = bigRuntime.dispatch({ kind: 'contact-end', sourceId: 'pointer:2', inside: false, atMs: 5 });
assert.equal(result.events.some((event) => event.kind === 'activate'), false, 'release outside must cancel without activation');
bigRuntime.dispatch({ kind: 'contact-begin', source: 'pointer', sourceId: 'pointer:reentry', atMs: 5.1 });
bigRuntime.dispatch({ kind: 'contact-update', sourceId: 'pointer:reentry', inside: false, atMs: 5.2 });
bigRuntime.dispatch({ kind: 'contact-update', sourceId: 'pointer:reentry', inside: true, atMs: 5.3 });
result = bigRuntime.dispatch({ kind: 'contact-end', sourceId: 'pointer:reentry', inside: true, atMs: 5.4 });
assert.equal(result.events.filter((event) => event.kind === 'activate').length, 1, 're-entry followed by release inside must activate once');
bigRuntime.dispatch({ kind: 'contact-begin', source: 'pointer', sourceId: 'pointer:cancel', atMs: 5.5 });
result = bigRuntime.dispatch({ kind: 'contact-cancel', sourceId: 'pointer:cancel', reason: 'pointer-cancel', atMs: 5.6 });
assert.equal(result.events.some((event) => event.kind === 'activate'), false, 'pointer cancellation must not activate');
bigRuntime.dispatch({ kind: 'model-set', enabled: false, atMs: 6 });
result = bigRuntime.dispatch({ kind: 'contact-begin', source: 'pointer', sourceId: 'pointer:3', atMs: 7 });
assert.equal(result.snapshot.owner, undefined, 'disabled model state must reject contact ownership');

const choicePreset = createImaginariumControlPreset({ family: 'choice', palette: '#EF9BB9', shape: 'capsule', semantic: { kind: 'choice', groupId: 'test-choice', value: 'pink' }, value: 'test-choice-pink' });
assert.equal(validateControlPreset(choicePreset).valid, true, 'Toy Choice preset must satisfy the SFHS control contract');
const choiceRuntime = createControlFeedbackRuntime({ controlId: 'imaginarium-test-choice', preset: choicePreset, initialModel: { selected: true }, reducedMotion: true });
assert.equal(choiceRuntime.read().model.selected, true, 'selected state must be externally synchronized');
choiceRuntime.dispatch({ kind: 'contact-begin', source: 'keyboard', sourceId: 'key:Space', atMs: 1 });
result = choiceRuntime.dispatch({ kind: 'contact-end', sourceId: 'key:Space', inside: true, atMs: 2 });
assert.deepEqual(result.events.find((event) => event.kind === 'activate')?.proposal, { kind: 'choice', groupId: 'test-choice', value: 'pink' });
assert.equal(result.snapshot.reducedMotion, true, 'reduced motion must remain explicit');
assert.equal(shouldPlayControlCue({ role: 'press', cueId: 'soft-click' }), true, 'contact emits the one control sound');
for (const role of ['activate', 'select-on', 'select-off', 'cancel']) assert.equal(shouldPlayControlCue({ role }), false, `${role} must not create a second tap sound`);
assert.equal(shouldPlayProductCue('save'), true, 'real save completion keeps its success cue');
assert.equal(shouldPlayProductCue('error'), true, 'real errors keep their cue');
for (const kind of ['turn', 'pop', 'trash']) assert.equal(shouldPlayProductCue(kind), false, `${kind} action feedback must not duplicate its control press cue`);

assert.equal(DB_NAME, 'the-imaginarium-library-v1');
assert.equal(PREFERENCE_KEY, 'the-imaginarium.preferences@1');
assert.equal(GALLERY_LIMIT, 24);
assert.equal(PAGE_WIDTH, 1080);
assert.equal(PAGE_HEIGHT, 1440);
assert.equal(DEFAULT_DIFFICULTY, 'fun');
for (const [difficulty, count] of [['easy', 4], ['fun', 9], ['tricky', 16]]) {
  const grid = buildPuzzleGrid(PUZZLE_WIDTH, PUZZLE_HEIGHT, difficulty);
  assert.equal(grid.pieces.length, count, `${difficulty} must create the expected piece count`);
  assert.equal(new Set(grid.pieces.map((piece) => piece.id)).size, count, 'piece IDs must be stable and unique');
  assert.equal(grid.pieces.reduce((sum, piece) => sum + (piece.crop.width * piece.crop.height), 0), PUZZLE_WIDTH * PUZZLE_HEIGHT, 'grid crops must cover every source pixel exactly once');
  assert.equal(Math.max(...grid.pieces.map((piece) => piece.crop.x + piece.crop.width)), PUZZLE_WIDTH, 'right crop edge must reach the source edge');
  assert.equal(Math.max(...grid.pieces.map((piece) => piece.crop.y + piece.crop.height)), PUZZLE_HEIGHT, 'bottom crop edge must reach the source edge');
}
const puzzleA = createPuzzle({ sourceDataUrl: 'data:image/png;base64,AAAA', sourceTitle: 'Test', difficulty: 'fun', seed: 7, now: '2026-08-12T00:00:00.000Z' });
const puzzleB = createPuzzle({ sourceDataUrl: 'data:image/png;base64,AAAA', sourceTitle: 'Test', difficulty: 'fun', seed: 7, now: '2026-08-12T00:00:00.000Z' });
assert.deepEqual(puzzleA, puzzleB, 'same source, difficulty, and seed must produce an identical puzzle');
assert.equal(validatePuzzle(puzzleA), true); assert.equal(isPuzzleComplete(puzzleA), false);
assert.equal(Object.hasOwn(puzzleA, 'snapUsed'), false, 'a new puzzle must not carry a one-use Snap field');
assert.equal(Object.hasOwn(puzzleA, 'snapArmed'), false, 'a new puzzle must not carry an armed Snap field');
assert.equal(puzzleA.raceStartedAt, null); assert.equal(puzzleA.raceElapsedMs, null); assert.equal(elapsedRaceTime(puzzleA, 5000), 0);
assert.equal(formatRaceTime(0), '0:00.0'); assert.equal(formatRaceTime(61234), '1:01.2');
assert.equal(elapsedRaceTime({ raceStartedAt: 1000, raceElapsedMs: null }, 2750), 1750, 'a running race must use wall-clock elapsed time');
assert.equal(elapsedRaceTime({ raceStartedAt: 1000, raceElapsedMs: 4321 }, 9999), 4321, 'a finished race must keep its frozen result');
puzzleA.pieces.forEach((piece) => { piece.locked = true; }); assert.equal(isPuzzleComplete(puzzleA), true);
const restartedPuzzle = restartPuzzle(puzzleA, 8, '2026-08-12T00:01:00.000Z');
assert.equal(restartedPuzzle.pieces.every((piece) => !piece.locked), true, 'restart must unlock every piece');
assert.equal(restartedPuzzle.raceStartedAt, null); assert.equal(restartedPuzzle.raceElapsedMs, null);
assert.notDeepEqual(restartedPuzzle.order, puzzleA.order, 'restart should produce a new shuffled order');
const snapDestination = { x: 100, y: 200 };
assert.equal(isPieceCenterInsideDestination({ x: 62.5, y: 150 }, snapDestination, 75, 100), true, 'piece center on the top-left destination boundary must qualify');
assert.equal(isPieceCenterInsideDestination({ x: 137.5, y: 250 }, snapDestination, 75, 100), true, 'piece center on the bottom-right destination boundary must qualify');
assert.equal(isPieceCenterInsideDestination({ x: 61.5, y: 150 }, snapDestination, 75, 100), false, 'piece center one pixel left of its destination must not qualify');
assert.equal(isPieceCenterInsideDestination({ x: 138.5, y: 250 }, snapDestination, 75, 100), false, 'piece center one pixel right of its destination must not qualify');
assert.equal(isPieceCenterInsideDestination({ x: 62.5, y: 149 }, snapDestination, 75, 100), false, 'piece center one pixel above its destination must not qualify');
assert.equal(isPieceCenterInsideDestination({ x: 137.5, y: 251 }, snapDestination, 75, 100), false, 'piece center one pixel below its destination must not qualify');
const legacySnapPuzzle = { ...restartedPuzzle, snapUsed: 'obsolete', snapArmed: { obsolete: true } };
assert.equal(validatePuzzle(legacySnapPuzzle), true, 'obsolete Snap fields must not prevent an otherwise valid saved puzzle from opening');
assert.throws(() => validatePuzzle({ ...restartedPuzzle, raceStartedAt: -1 }), /invalid race start/);
assert.throws(() => validatePuzzle({ ...restartedPuzzle, raceElapsedMs: 50 }), /without a start/);
const wideFit = fitGeometry(1600, 900, PUZZLE_WIDTH, PUZZLE_HEIGHT, 1, 0, 0);
assert.equal(wideFit.width, PUZZLE_WIDTH, 'a wide photo must fit the full puzzle width by default');
assert.equal(wideFit.x, 0); assert.equal(wideFit.y > 0, true, 'a wide photo must use a vertical matte instead of cropping its sides');
assert.equal(wideFit.y + wideFit.height < PUZZLE_HEIGHT, true, 'the complete wide photo must remain visible');
const tallFit = fitGeometry(900, 1600, PUZZLE_WIDTH, PUZZLE_HEIGHT, 1, 0, 0);
assert.equal(tallFit.height, PUZZLE_HEIGHT, 'a tall photo must fit the full puzzle height by default');
assert.equal(tallFit.y, 0); assert.equal(tallFit.x > 0, true, 'a tall photo must use a horizontal matte instead of cropping its top or bottom');
const wideZoomed = fitGeometry(1600, 900, PUZZLE_WIDTH, PUZZLE_HEIGHT, 3, 9999, 0);
assert.equal(wideZoomed.width > PUZZLE_WIDTH, true, 'explicit zoom must still allow an intentional crop');
assert.equal(wideZoomed.x <= 0, true); assert.equal(wideZoomed.x + wideZoomed.width >= PUZZLE_WIDTH, true);
const frameOperations = [];
const frameContext = {
  fillStyle: '',
  clearRect: (...args) => frameOperations.push(['clearRect', ...args]),
  fillRect: (...args) => frameOperations.push(['fillRect', ...args]),
  drawImage: (...args) => frameOperations.push(['drawImage', ...args.slice(1)])
};
const fittedFrame = { zoom: 1, offsetX: 0, offsetY: 0 };
const fittedGeometry = drawFramedImage(frameContext, { naturalWidth: 1280, naturalHeight: 720 }, fittedFrame);
assert.deepEqual(frameOperations[1], ['fillRect', 0, 0, PUZZLE_WIDTH, PUZZLE_HEIGHT], 'fit mode must paint the puzzle matte');
assert.equal(fittedGeometry.x, 0); assert.equal(fittedGeometry.width, PUZZLE_WIDTH);
assert.equal(fittedGeometry.y > 0, true); assert.equal(fittedGeometry.y + fittedGeometry.height < PUZZLE_HEIGHT, true, 'the supplied wide-photo shape must render uncropped');
assert.equal(DEFAULT_AUTOSAVE_MODE, 'relaxed', 'existing devices without a timing preference must migrate to the quieter default');
assert.equal(autosavePolicy('quick').delayMs, 1000);
assert.equal(autosavePolicy('relaxed').delayMs, 4000);
assert.equal(autosavePolicy('leaving').delayMs, null, 'leaving mode must not schedule a background timer');
assert.equal(normalizeAutosaveMode('unknown'), DEFAULT_AUTOSAVE_MODE, 'invalid stored values must recover safely');
assert.deepEqual(Object.keys(AUTOSAVE_MODES), ['quick', 'relaxed', 'leaving']);

resetIdCounterForTests();
assert.notEqual(createStableId('picture'), createStableId('picture'), 'stable IDs must be distinct');

const picture = createPicture({ id: 'picture-a', title: 'My Picture 1', now: '2026-08-04T00:00:00.000Z' });
assert.equal(picture.schema, PAGE_SCHEMA);
assert.equal(validatePicture(picture), true);
assert.deepEqual(normalizePicture(JSON.parse(JSON.stringify(picture))), picture, 'picture JSON must round-trip');
assert.throws(() => validatePicture({ ...picture, schema: 'imaginarium.page@99' }), /not supported/);
assert.throws(() => validatePicture({ ...picture, stickers: [{ layerId: 'x', assetId: 'a', x: NaN, y: 0, scaleX: 1, scaleY: 1, angle: 0 }] }), /invalid sticker/);

const sticker = createSticker('sticker-animals-cat', { layerId: 'layer-a', scale: 1 });
let resized = sticker;
for (let index = 0; index < 100; index += 1) resized = resizeSticker(resized, 1.1);
assert.equal(resized.scaleX, MAX_SCALE, 'Bigger must stop at 400%');
for (let index = 0; index < 200; index += 1) resized = resizeSticker(resized, 1 / 1.1);
assert.equal(resized.scaleX, MIN_SCALE, 'Smaller must stop at 25%');
assert.equal(rotateSticker({ angle: 350 }, 15).angle, 5, 'Turn must use a 15 degree wrapping step');
const transformedSticker = { ...sticker, x: 100, y: 200, scaleX: 1.4, scaleY: 1.4, angle: 45, flipX: false, zIndex: 2 };
const flipped = flipSticker(transformedSticker);
assert.deepEqual({ x: flipped.x, y: flipped.y, scaleX: flipped.scaleX, scaleY: flipped.scaleY, angle: flipped.angle, flipX: flipped.flipX }, { x: 100, y: 200, scaleX: 1.4, scaleY: 1.4, angle: 45, flipX: true }, 'Flip must mirror without moving, resizing, or turning the sticker');
assert.deepEqual(flipSticker(flipped), transformedSticker, 'a second Flip must restore the original orientation');
const copied = duplicateSticker(flipped, 'layer-b');
assert.equal(copied.layerId, 'layer-b'); assert.equal(copied.x, 144); assert.equal(copied.zIndex, 3);
assert.equal(copied.flipX, true, 'Copy must inherit the selected sticker orientation');
const depthStack = [
  { ...sticker, layerId: 'tree', zIndex: 0 },
  { ...sticker, layerId: 'door', zIndex: 1 },
  { ...sticker, layerId: 'character', zIndex: 2 }
];
let reordered = moveStickerOneStep(depthStack, 'door', -1);
assert.deepEqual(reordered.map((item) => item.layerId), ['door', 'tree', 'character'], 'Behind must move exactly one sticker step backward');
reordered = moveStickerOneStep(reordered, 'door', -1);
assert.deepEqual(reordered.map((item) => item.layerId), ['door', 'tree', 'character'], 'the back boundary must remain stable');
reordered = moveStickerOneStep(reordered, 'door', 1);
assert.deepEqual(reordered.map((item) => item.layerId), ['tree', 'door', 'character'], 'In Front must move exactly one sticker step forward');
reordered = moveStickerOneStep(reordered, 'door', 1);
assert.deepEqual(reordered.map((item) => item.layerId), ['tree', 'character', 'door'], 'repeated In Front presses must advance through the stack');
reordered = moveStickerOneStep(reordered, 'door', 1);
assert.deepEqual(reordered.map((item) => item.layerId), ['tree', 'character', 'door'], 'the front boundary must remain stable');
assert.deepEqual(reordered.map((item) => item.zIndex), [0, 1, 2], 'depth changes must keep deterministic serialized order');
const clamped = clampStickerPosition({ x: -999, y: 9999 }, 200, 300);
assert.equal(clamped.x, -80, 'at least 10% of sticker width must remain visible');
assert.equal(clamped.y, PAGE_HEIGHT + 120, 'at least 10% of sticker height must remain visible');

picture.stickers.push(sticker);
picture.embeddedAssets.push({ id: 'pack-friends-cat', dataUrl: 'data:image/png;base64,AAAA', kind: 'sticker', name: 'Cat' });
const duplicate = duplicatePicture(picture, 'My Picture 2', '2026-08-04T01:00:00.000Z');
assert.notEqual(duplicate.id, picture.id); assert.notEqual(duplicate.stickers[0].layerId, sticker.layerId); assert.equal(duplicate.embeddedAssets.length, 1, 'duplicate must retain used imported assets');

const transformedPicture = createPicture({ id: 'picture-transformed', title: 'Transformed', now: '2026-08-15T00:00:00.000Z' });
transformedPicture.stickers = moveStickerOneStep([
  { ...sticker, layerId: 'wall', zIndex: 0 },
  { ...flipped, layerId: 'door', zIndex: 1 }
], 'door', -1);
const reopenedTransformedPicture = normalizePicture(JSON.parse(JSON.stringify(transformedPicture)));
assert.deepEqual(reopenedTransformedPicture.stickers.map(({ layerId, angle, flipX, zIndex }) => ({ layerId, angle, flipX, zIndex })), [
  { layerId: 'door', angle: 45, flipX: true, zIndex: 0 },
  { layerId: 'wall', angle: 0, flipX: false, zIndex: 1 }
], 'rotation, flip, and depth must survive a combined save/reopen round trip');
const duplicatedTransformedPicture = duplicatePicture(transformedPicture, 'Transformed Copy', '2026-08-15T00:01:00.000Z');
assert.deepEqual(duplicatedTransformedPicture.stickers.map(({ assetId, angle, flipX, zIndex }) => ({ assetId, angle, flipX, zIndex })), transformedPicture.stickers.map(({ assetId, angle, flipX, zIndex }) => ({ assetId, angle, flipX, zIndex })), 'saved-project duplication must preserve transform and depth state');
assert.notEqual(duplicatedTransformedPicture.stickers[0].layerId, transformedPicture.stickers[0].layerId, 'duplicated stickers must remain independently editable');
const legacyPicture = JSON.parse(JSON.stringify(transformedPicture));
delete legacyPicture.stickers[0].flipX; delete legacyPicture.stickers[0].flipY; delete legacyPicture.stickers[0].opacity; delete legacyPicture.stickers[0].zIndex;
const normalizedLegacySticker = normalizePicture(legacyPicture).stickers[0];
assert.deepEqual({ flipX: normalizedLegacySticker.flipX, flipY: normalizedLegacySticker.flipY, opacity: normalizedLegacySticker.opacity, zIndex: normalizedLegacySticker.zIndex }, { flipX: false, flipY: false, opacity: 1, zIndex: 0 }, 'older saves must receive safe transform defaults');

const history = new PictureHistory(2);
history.push({ value: 1 }); history.push({ value: 2 }); history.push({ value: 3 });
assert.equal(history.undoStack.length, 2, 'history must be bounded');
assert.deepEqual(history.undo({ value: 4 }), { value: 3 });
assert.deepEqual(history.redo({ value: 3 }), { value: 4 });

const library = validateBuiltInLibrary();
assert.deepEqual(library, { backgrounds: 11, stickers: 114, categories: 8 });
for (const category of BUILT_IN_CATEGORIES.filter((item) => item.id !== 'blockfolk')) assert.equal(BUILT_IN_STICKERS.filter((item) => item.category === category.id).length, 12);
const blockfolkStickers = BUILT_IN_STICKERS.filter((item) => item.category === 'blockfolk');
assert.equal(blockfolkStickers.length, 30, 'Blockfolk must include all supplied game-ready stickers');
assert.equal(blockfolkStickers.every((item) => item.kind === 'sticker' && item.builtIn && item.width > 0 && item.height > 0 && item.alt.includes('Blockfolk')), true);
assert.deepEqual(BUILT_IN_CATEGORIES.find((item) => item.id === 'blockfolk'), { id: 'blockfolk', title: 'Blockfolk', color: '#8BCB58', icon: '▦' });
assert.equal(BUILT_IN_BACKGROUNDS.filter((item) => item.id !== 'background-blockfolk-valley').every((item) => item.width === 1080 && item.height === 1440), true);
const blockfolkBackground = BUILT_IN_BACKGROUNDS.find((item) => item.id === 'background-blockfolk-valley');
assert.deepEqual({ width: blockfolkBackground.width, height: blockfolkBackground.height, fit: blockfolkBackground.fit, positionX: blockfolkBackground.positionX }, { width: 1448, height: 1086, fit: 'cover', positionX: 0.1 });
const blockfolkLayout = computeBackgroundLayout(blockfolkBackground, PAGE_WIDTH, PAGE_HEIGHT);
assert.equal(blockfolkLayout.scaleX, blockfolkLayout.scaleY, 'Blockfolk Valley must retain its aspect ratio');
assert.equal(Math.round(blockfolkBackground.height * blockfolkLayout.scaleY), PAGE_HEIGHT, 'Blockfolk Valley must fill the page height');
const totalHorizontalCrop = (blockfolkBackground.width * blockfolkLayout.scaleX) - PAGE_WIDTH;
assert.ok(Math.abs((-blockfolkLayout.left / totalHorizontalCrop) - 0.1) < 0.000001, 'ten percent of the horizontal crop must come from the left');
assert.equal(new Set([...BUILT_IN_BACKGROUNDS, ...BUILT_IN_STICKERS].map((item) => item.id)).size, 125);
assert.equal(assetManifest.bundles.flatMap((bundle) => bundle.assets).length, 31, 'all 30 stickers and the background must be declared for canonical inlining');
const emojiStickers = BUILT_IN_STICKERS.filter((item) => item.category === 'emoji');
assert.equal(emojiStickers.length, 12, 'Emoji must be a complete sticker category');
assert.equal(emojiStickers.every((item) => item.kind === 'emoji' && item.glyph && !item.dataUrl), true, 'Emoji stickers must use real Unicode glyphs instead of generated image art');

assert.equal(normalizeArchivePath('../bad/cat.png'), null);
assert.equal(normalizeArchivePath('Pack\\stickers\\animals\\cat.png'), 'Pack/stickers/animals/cat.png');
const inferred = inferPackManifest([
  'My Pack/stickers/animals/cat.png', 'My Pack/stickers/animals/cat.webp', 'My Pack/backgrounds/park.jpg', 'My Pack/readme.txt'
], 'My Pack');
assert.equal(inferred.schema, PACK_SCHEMA); assert.equal(inferred.stickers.length, 2); assert.notEqual(inferred.stickers[0].id, inferred.stickers[1].id); assert.equal(inferred.backgrounds.length, 1); assert.equal(inferred.stickers[0].category, 'animals');
assert.equal(validatePackManifest(inferred), true);
assert.throws(() => validatePackManifest({ ...inferred, schema: 'future-pack@9' }), /not supported/);
assert.equal(resolveImportCategory('Space Friends', 'animals'), 'space-friends', 'a grown-up category choice must override pack folders');
assert.equal(resolveImportCategory(null, 'animals'), 'animals', 'automatic category mode must preserve pack folders');
assert.equal(safeId('Party Time!'), 'party-time');
assert.equal(ASSET_LIMITS.zipBytes, 24 * 1024 * 1024);
assert.equal(ASSET_LIMITS.files, 80);
assert.equal(ASSET_LIMITS.decompressedBytes, 48 * 1024 * 1024);
assert.equal(ASSET_LIMITS.imageBytes, 4 * 1024 * 1024);
assert.equal(ASSET_LIMITS.imageDimension, 4096);
assert.equal(ASSET_LIMITS.retainedBytes, 64 * 1024 * 1024);
assert.equal(ASSET_LIMITS.alphaThreshold, 8);
assert.equal(mimeFromFilename('friend.JPG'), 'image/jpeg', 'JPEG must import without a trim-only format error');
const bounds = findAlphaBounds({ width: 3, height: 2, data: new Uint8ClampedArray([0,0,0,0, 0,0,0,9, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]) });
assert.deepEqual(bounds, { left: 1, top: 0, width: 1, height: 1 });

const storage = new ImaginariumStorage();
await storage.init();
await storage.putPicture(picture);
assert.equal((await storage.listPictures()).length, 1);
assert.equal((await storage.getPicture('picture-a')).title, 'My Picture 1');
await storage.putPicture(duplicate);
await storage.deletePicture('picture-a');
assert.equal((await storage.listPictures()).length, 1, 'gallery create/update/delete must work in fallback storage');
await storage.putPack({ id: 'pack-a', title: 'Pack A', assets: [] });
assert.equal((await storage.listPacks()).length, 1);
await storage.deletePack('pack-a');
assert.equal((await storage.listPacks()).length, 0);
await storage.putPuzzle(restartedPuzzle);
assert.equal((await storage.getPuzzle()).difficulty, 'fun', 'active puzzle progress must round-trip');
await storage.deletePuzzle(); assert.equal(await storage.getPuzzle(), null);

assert.match(mapChildSafeError(new Error('QuotaExceededError')), /download/);
assert.match(mapChildSafeError(new Error('bad zip archive')), /grown-up/);
for (const required of ['new-picture', 'show-gallery', 'show-parent-gate', 'smaller', 'bigger', 'turn', 'flip', 'behind', 'in-front', 'copy', 'trash', 'undo', 'redo', 'download', 'share']) assert.match(`${source}\n${html}`, new RegExp(required), `missing ${required} workflow`);
assert.match(source, /canvas\.moveObjectTo\(active, target\)/, 'depth controls must use the native canvas object stack');
assert.match(source, /active\.set\(\{ flipX: flipped\.flipX \}\)/, 'Flip must use the native horizontal mirror property');
assert.match(html, /data-action="smaller"[\s\S]*data-action="bigger"[\s\S]*data-action="turn"[\s\S]*data-action="flip"[\s\S]*data-action="behind"[\s\S]*data-action="in-front"[\s\S]*data-action="copy"[\s\S]*data-action="trash"/, 'selected-sticker tools must keep the child-facing order');
for (const required of ['make-puzzle', 'puzzle-photo', 'puzzle-show-creations', 'puzzle-build', 'puzzle-restart', 'puzzle-hint', 'puzzle-race', 'puzzle-snap']) assert.match(html, new RegExp(required), `missing ${required} puzzle workflow`);
for (const [action, tone] of [['make-puzzle', 'sky'], ['puzzle-photo', 'yellow'], ['puzzle-show-creations', 'mint'], ['puzzle-frame-reset', 'sky'], ['puzzle-hint', 'yellow'], ['puzzle-race', 'pink'], ['puzzle-snap', 'mint'], ['puzzle-restart', 'lilac'], ['puzzle-play-again', 'yellow'], ['puzzle-another', 'sky'], ['puzzle-done', 'purple']]) {
  assert.match(html, new RegExp(`data-action="${action}"[^>]*data-control-tone="${tone}"`), `${action} must use the approved ${tone} puzzle tone`);
}
assert.doesNotMatch(source, /slot\.addEventListener\('click'/, 'board slots must not reveal answers through tap-to-fit');
assert.match(source, /setTimeout\(\(\) => this\.saveCurrent\(\{ quiet: true \}\)/, 'background autosave must be debounced and silent');
assert.match(source, /navigator\.share/); assert.match(source, /downloadBlob\(blob/);
assert.match(source, /canvas\.toDataURL\(\{ format: 'png'/, 'PNG export must be implemented');
assert.match(source, /this\.gateHeld\.size === 2/); assert.match(source, /elapsed \/ 3000/);
assert.match(source, /ImaginariumControls/); assert.match(source, /controls\.setEnabled/); assert.doesNotMatch(source, /new AudioContext\(/);
assert.match(controlSource, /upgradeSwitch/); assert.match(controlSource, /createWebAudioCueTransport/); assert.match(controlSource, /createWebHapticTransport/);
for (const settingAction of ['toggle-sound', 'toggle-haptics', 'toggle-motion']) assert.match(html, new RegExp(`data-action="${settingAction}"`), `missing tactile ${settingAction} setting`);
for (const mode of ['quick', 'relaxed', 'leaving']) assert.match(html, new RegExp(`data-autosave-mode="${mode}"`), `missing tactile ${mode} autosave choice`);
assert.match(controlSource, /groupId: 'imaginarium-autosave-mode'/, 'autosave timing must use mutually exclusive choice semantics');
assert.match(html, /role="radiogroup"/); assert.match(html, /data-control-family="big"/);
assert.match(html, /id="import-category"/); assert.match(html, /Make a new category/); assert.match(source, /processStickerPack\(file, \{ defaultCategory \}\)/);
assert.match(source, /new fabricNS\.Text\(asset\.glyph/); assert.doesNotMatch(html, /value="community"/);
assert.doesNotMatch(html, /\b(asset|layer|artboard|manifest|serialization|opacity|coordinate|MIME|decompression|Fabric object)\b/i, 'child-facing shell must avoid professional editor terms');

console.log('IMAGINARIUM_SOURCE_FOCUSED_SCENARIOS PASS', JSON.stringify({ library, galleryLimit: GALLERY_LIMIT, storage: storage.mode, packInference: { stickers: inferred.stickers.length, backgrounds: inferred.backgrounds.length } }));
