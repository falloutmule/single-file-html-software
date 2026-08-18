import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateControlPreset } from '@sfhs/control-feedback-contract';
import { createControlFeedbackRuntime } from '@sfhs/control-feedback-runtime';
import { createBlockFolkControlPreset, shouldPlayControlCue, shouldPlayProductCue } from '../src/app/ImaginariumControls.js';
import { AUTOSAVE_MODES, DEFAULT_AUTOSAVE_MODE, autosavePolicy, normalizeAutosaveMode } from '../src/model/autosave.js';
import { ASSET_LIMITS, mimeFromFilename } from '../src/model/assetModel.js';
import { BUILT_IN_BACKGROUNDS, BUILT_IN_CATEGORIES, BUILT_IN_STICKERS, validateBuiltInLibrary } from '../src/model/builtInLibrary.js';
import { BLOCKFOLK_DEFAULT_WORLD_EXTENT } from '../src/model/blockfolkStickerLibrary.js';
import { migrateAssetCategory, migrateBuiltInCategory } from '../src/model/categoryModel.js';
import { SNAP_TOLERANCE_SCREEN_PX, SNAPPABLE_ASSET_IDS, connectedLayerIds, duplicateConnections, findSnapCandidate, hasAssembly, isSnappableAsset, makeConnection, removeMemberConnections, validConnections } from '../src/model/constructionModel.js';
import { isNativeEmojiSequence, splitGraphemes, validateNativeEmojiSequence } from '../src/model/emojiModel.js';
import { PictureHistory } from '../src/model/history.js';
import { buildPuzzleGrid, createPuzzle, DEFAULT_DIFFICULTY, elapsedRaceTime, formatRaceTime, isPieceCenterInsideDestination, isPuzzleComplete, PUZZLE_HEIGHT, PUZZLE_WIDTH, restartPuzzle, validatePuzzle } from '../src/model/puzzleModel.js';
import { drawFramedImage, fitGeometry } from '../src/model/puzzleImage.js';
import { createStableId, resetIdCounterForTests } from '../src/model/ids.js';
import {
  GALLERY_LIMIT, MAX_SCALE, MIN_SCALE, PAGE_HEIGHT, PAGE_SCHEMA, PAGE_WIDTH, PREVIOUS_PAGE_SCHEMA, clampStickerPosition,
  createPicture, createSticker, duplicatePicture, duplicateSticker, flipSticker, mapChildSafeError, moveStickerOneStep,
  normalizePicture, resizeSticker, rotateSticker, validatePicture
} from '../src/model/pageModel.js';
import { BlockFolkImaginariumStorage, DB_NAME, PREFERENCE_KEY } from '../src/model/storage.js';
import { PACK_SCHEMA, inferPackManifest, normalizeArchivePath, resolveImportCategory, safeId, validatePackManifest } from '../src/model/stickerPacks.js';
import { findAlphaBounds } from '../src/model/trimTransparent.js';
import { CAMERA_MAX_ZOOM, CAMERA_MIN_ZOOM, CLASSIC_WORLD_BACKGROUND_ID, DEFAULT_CAMERA, STARTING_LOCATIONS, WORLD_BACKGROUND_ID, WORLD_SIZE, cameraTransform, clampCamera, panCamera, screenToWorld, zoomCameraAt } from '../src/model/worldModel.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(join(root, 'src', 'app', 'ImaginariumApp.js'), 'utf8');
const controlSource = readFileSync(join(root, 'src', 'app', 'ImaginariumControls.js'), 'utf8');
const html = readFileSync(join(root, 'src', 'index.html'), 'utf8');
const assetManifest = JSON.parse(readFileSync(join(root, 'src', 'assets', 'manifest.json'), 'utf8'));
const acceptedStickerRoot = join(root, '..', 'the-imaginarium', 'src', 'assets', 'blockfolk');
const productStickerRoot = join(root, 'src', 'assets', 'blockfolk');

const bigControlPreset = createBlockFolkControlPreset({ family: 'big', palette: 'yellow', value: 'test-big' });
assert.equal(validateControlPreset(bigControlPreset).valid, true, 'Big Toy preset must satisfy the SFHS control contract');
const bigRuntime = createControlFeedbackRuntime({ controlId: 'blockfolk-imaginarium-test-big', preset: bigControlPreset });
let result = bigRuntime.dispatch({ kind: 'contact-begin', source: 'pointer', sourceId: 'pointer:1', origin: { x: .5, y: .5 }, atMs: 1 });
assert.equal(result.snapshot.interaction, 'pressed-inside', 'contact must depress immediately');
assert.equal(result.events.some((event) => event.kind === 'cue' && event.cueId === 'plastic-click'), true, 'Big Toy contact must emit plastic-click');
result = bigRuntime.dispatch({ kind: 'contact-end', sourceId: 'pointer:1', inside: true, atMs: 2 });
assert.equal(result.events.filter((event) => event.kind === 'activate').length, 1, 'valid release must activate exactly once');
assert.deepEqual(result.events.filter((event) => event.kind === 'cue').map(({ cueRole, cueId }) => ({ cueRole, cueId })), [{ cueRole: 'activate', cueId: 'toggle-on' }], 'valid release must emit one distinct rising release sound');
bigRuntime.dispatch({ kind: 'contact-begin', source: 'pointer', sourceId: 'pointer:2', atMs: 3 });
bigRuntime.dispatch({ kind: 'contact-update', sourceId: 'pointer:2', inside: false, atMs: 4 });
result = bigRuntime.dispatch({ kind: 'contact-end', sourceId: 'pointer:2', inside: false, atMs: 5 });
assert.equal(result.events.some((event) => event.kind === 'activate'), false, 'release outside must cancel without activation');
assert.equal(result.events.some((event) => event.kind === 'cue' && event.cueRole === 'activate'), false, 'release outside must not emit the release sound');
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

const choicePreset = createBlockFolkControlPreset({ family: 'choice', palette: '#EF9BB9', shape: 'capsule', semantic: { kind: 'choice', groupId: 'test-choice', value: 'pink' }, value: 'test-choice-pink' });
assert.equal(validateControlPreset(choicePreset).valid, true, 'Toy Choice preset must satisfy the SFHS control contract');
const choiceRuntime = createControlFeedbackRuntime({ controlId: 'blockfolk-imaginarium-test-choice', preset: choicePreset, initialModel: { selected: true }, reducedMotion: true });
assert.equal(choiceRuntime.read().model.selected, true, 'selected state must be externally synchronized');
choiceRuntime.dispatch({ kind: 'contact-begin', source: 'keyboard', sourceId: 'key:Space', atMs: 1 });
result = choiceRuntime.dispatch({ kind: 'contact-end', sourceId: 'key:Space', inside: true, atMs: 2 });
assert.deepEqual(result.events.find((event) => event.kind === 'activate')?.proposal, { kind: 'choice', groupId: 'test-choice', value: 'pink' });
assert.equal(result.snapshot.reducedMotion, true, 'reduced motion must remain explicit');
assert.equal(choicePreset.cues.press, 'plastic-click', 'choice contact must use a short downward press click');
assert.equal(choicePreset.cues.activate, 'toggle-on', 'choice release must use the distinct rising release tone');
assert.equal(shouldPlayControlCue({ role: 'press', cueId: 'soft-click' }), true, 'contact must play the press sound');
assert.equal(shouldPlayControlCue({ role: 'activate', cueId: 'toggle-on' }), true, 'valid release must play the distinct release sound');
for (const role of ['select-on', 'select-off', 'cancel']) assert.equal(shouldPlayControlCue({ role }), false, `${role} must not create a third control sound`);
assert.equal(shouldPlayProductCue('save'), true, 'real save completion keeps its success cue');
assert.equal(shouldPlayProductCue('error'), true, 'real errors keep their cue');
for (const kind of ['turn', 'pop', 'trash']) assert.equal(shouldPlayProductCue(kind), false, `${kind} action feedback must not duplicate its control press cue`);

assert.equal(DB_NAME, 'blockfolk-imaginarium-library-v1');
assert.equal(PREFERENCE_KEY, 'blockfolk-imaginarium.preferences@1');
assert.notEqual(DB_NAME, 'the-imaginarium-library-v1');
assert.notEqual(PREFERENCE_KEY, 'the-imaginarium.preferences@1');
assert.equal(GALLERY_LIMIT, 24);
assert.equal(PAGE_WIDTH, 4096);
assert.equal(PAGE_HEIGHT, 4096);
assert.equal(WORLD_SIZE, 4096);
assert.equal(CAMERA_MIN_ZOOM, 1);
assert.equal(CAMERA_MAX_ZOOM, 8);
assert.deepEqual(STARTING_LOCATIONS.map(({ id, title }) => ({ id, title })), [
  { id: 'coast', title: 'Coast' }, { id: 'mountain-source', title: 'Mountain Source' },
  { id: 'forest-river', title: 'Forest River' }, { id: 'plains-bend', title: 'Plains Bend' },
  { id: 'world-center', title: 'World Center' }
]);
assert.deepEqual(STARTING_LOCATIONS, [
  { id: 'coast', title: 'Coast', centerX: 760, centerY: 1040, zoom: 2.4 },
  { id: 'mountain-source', title: 'Mountain Source', centerX: 3030, centerY: 760, zoom: 2.65 },
  { id: 'forest-river', title: 'Forest River', centerX: 2930, centerY: 2460, zoom: 2.4 },
  { id: 'plains-bend', title: 'Plains Bend', centerX: 1760, centerY: 2260, zoom: 2.3 },
  { id: 'world-center', title: 'World Center', centerX: 2048, centerY: 2048, zoom: 1.35 }
]);
assert.equal(migrateBuiltInCategory('things'), 'building');
assert.equal(migrateBuiltInCategory('silly'), 'magic');
assert.equal(migrateBuiltInCategory('words'), 'emoji');
assert.equal(migrateBuiltInCategory('unknown'), 'animals');
assert.equal(migrateAssetCategory('things'), 'building');
assert.equal(migrateAssetCategory('my-custom-group'), 'my-custom-group');
for (const emoji of ['🙂', '❤️', '👍🏽', '👩🏽‍🚀', '🇺🇸', '👨‍👩‍👧‍👦', '1️⃣']) {
  assert.deepEqual(splitGraphemes(emoji), [emoji], `${emoji} must remain one grapheme`);
  assert.equal(isNativeEmojiSequence(emoji), true, `${emoji} must be accepted as native emoji`);
  assert.equal(validateNativeEmojiSequence(emoji), emoji, `${emoji} must round-trip byte-for-byte`);
}
for (const invalid of ['', 'hello', 'hello🙂', 'A', '🙂 🙂', '🙂🙂']) assert.throws(() => validateNativeEmojiSequence(invalid), /emoji/i, `${JSON.stringify(invalid)} must be rejected`);

const portraitCamera = clampCamera({ centerX: -500, centerY: 9000, zoom: 2 }, 400, 844);
const portraitTransform = cameraTransform(portraitCamera, 400, 844);
assert.equal(portraitTransform.scale, 400 / WORLD_SIZE * 2);
assert.equal(portraitCamera.centerX >= 1024 && portraitCamera.centerX <= 3072, true, 'portrait bounds must keep the world in view');
const pannedCamera = panCamera(DEFAULT_CAMERA, 80, -40, 400, 844);
assert.notDeepEqual(pannedCamera, DEFAULT_CAMERA, 'screen-space pan must change the camera in world space');
const zoomAnchor = { x: 125, y: 260 };
const worldBeforeZoom = screenToWorld(DEFAULT_CAMERA, 400, 844, zoomAnchor.x, zoomAnchor.y);
const zoomedCamera = zoomCameraAt(DEFAULT_CAMERA, 3.4, zoomAnchor.x, zoomAnchor.y, 400, 844);
const worldAfterZoom = screenToWorld(zoomedCamera, 400, 844, zoomAnchor.x, zoomAnchor.y);
assert.equal(Math.abs(worldBeforeZoom.x - worldAfterZoom.x) < 0.001, true, 'midpoint zoom must preserve its world-space X anchor');
assert.equal(Math.abs(worldBeforeZoom.y - worldAfterZoom.y) < 0.001, true, 'midpoint zoom must preserve its world-space Y anchor');
for (const [width, height] of [[400, 844], [844, 400]]) assert.ok(cameraTransform({ ...DEFAULT_CAMERA, zoom: CAMERA_MAX_ZOOM }, width, height).scale <= 1, 'the 4096 source must remain at or below native pixel scale at maximum phone zoom');
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
assert.equal(picture.page.backgroundAssetId, WORLD_BACKGROUND_ID, 'a new world board must use the one production world');
assert.deepEqual(picture.page.camera, DEFAULT_CAMERA);
assert.equal(picture.ui.category, 'animals');
assert.equal(validatePicture(picture), true);
assert.deepEqual(normalizePicture(JSON.parse(JSON.stringify(picture))), picture, 'picture JSON must round-trip');
assert.throws(() => validatePicture({ ...picture, schema: 'blockfolk-imaginarium.page@99' }), /not supported/);
assert.throws(() => validatePicture({ ...picture, stickers: [{ layerId: 'x', assetId: 'a', x: NaN, y: 0, scaleX: 1, scaleY: 1, angle: 0 }] }), /invalid sticker/);

const legacyWorldPicture = {
  ...JSON.parse(JSON.stringify(picture)),
  schema: 'blockfolk-imaginarium.page@1',
  page: { width: 1080, height: 1440, backgroundAssetId: null },
  ui: { selectedCategory: 'words' },
  stickers: [{ ...createSticker('local-piece', { layerId: 'legacy-layer' }), x: 540, y: 720 }]
};
const migratedWorldPicture = normalizePicture(legacyWorldPicture);
assert.equal(migratedWorldPicture.schema, PAGE_SCHEMA);
assert.deepEqual(migratedWorldPicture.page, { width: WORLD_SIZE, height: WORLD_SIZE, backgroundAssetId: WORLD_BACKGROUND_ID, camera: DEFAULT_CAMERA });
assert.equal(migratedWorldPicture.ui.category, 'emoji');
assert.equal(migratedWorldPicture.stickers[0].x, 2048);
assert.equal(migratedWorldPicture.stickers[0].y, 2048);
assert.equal(migratedWorldPicture.stickers[0].assetId, 'local-piece', 'legacy migration must preserve user content');
const preConstructionPicture = createPicture({ id: 'pre-construction', now: '2026-08-18T00:00:00.000Z' });
preConstructionPicture.schema = PREVIOUS_PAGE_SCHEMA; delete preConstructionPicture.connections;
preConstructionPicture.stickers.push({ ...createSticker('sticker-blockfolk-stone-block', { layerId: 'preserved-size', scale: .81 }), x: 1200, y: 1600, angle: 25, flipX: true, zIndex: 0 });
const migratedConstructionPicture = normalizePicture(preConstructionPicture);
assert.equal(migratedConstructionPicture.schema, PAGE_SCHEMA, 'the BlockFolk construction migration must be versioned');
assert.deepEqual(migratedConstructionPicture.connections, [], 'a pre-snap picture must gain an empty connection list without destructive migration');
assert.deepEqual(migratedConstructionPicture.stickers[0], { ...preConstructionPicture.stickers[0], flipY: false, opacity: 1 }, 'pre-construction sticker coordinates, scale, flip, angle, and z-order must remain unchanged');

const sticker = createSticker('pack-local-test-piece', { layerId: 'layer-a', scale: 1 });
let resized = sticker;
for (let index = 0; index < 100; index += 1) resized = resizeSticker(resized, 1.1);
assert.equal(resized.scaleX, MAX_SCALE, 'Bigger must stop at the world-safe maximum');
for (let index = 0; index < 200; index += 1) resized = resizeSticker(resized, 1 / 1.1);
assert.equal(resized.scaleX, MIN_SCALE, 'Smaller must stop at the world-safe minimum');
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

assert.equal(SNAP_TOLERANCE_SCREEN_PX, 80, 'construction snap tolerance must remain a forgiving screen-space value');
assert.deepEqual(SNAPPABLE_ASSET_IDS, [
  'sticker-blockfolk-grass-dirt-block', 'sticker-blockfolk-dirt-block', 'sticker-blockfolk-stone-block', 'sticker-blockfolk-sand-block', 'sticker-blockfolk-snow-block', 'sticker-blockfolk-water-block', 'sticker-blockfolk-lava-block', 'sticker-blockfolk-wood-log-block', 'sticker-blockfolk-leaf-block', 'sticker-blockfolk-brick-stone-block',
  'sticker-blockfolk-wood-door', 'sticker-blockfolk-stone-door', 'sticker-blockfolk-square-window', 'sticker-blockfolk-round-window'
], 'only the approved construction assets may carry snap metadata');
assert.equal(isSnappableAsset('sticker-blockfolk-wolf'), false, 'animals must remain freely placed');
const constructionObject = (layerId, assetId, left, top = 700) => ({ blockfolkLayerId: layerId, blockfolkAssetId: assetId, left, top, angle: 0, getScaledWidth: () => 273, getScaledHeight: () => 320 });
const constructionA = constructionObject('block-a', 'sticker-blockfolk-stone-block', 400);
const constructionB = constructionObject('block-b', 'sticker-blockfolk-brick-stone-block', 510, 764);
const constructionCandidate = findSnapCandidate({ movingObjects: [constructionA], stationaryObjects: [constructionB], worldTolerance: 4 });
assert.ok(constructionCandidate, 'compatible isometric terrain sockets must propose a snap');
assert.deepEqual([constructionCandidate.sourceAnchor.id, constructionCandidate.targetAnchor.id], ['southEast', 'northWest'], 'terrain blocks must use diagonal isometric sockets rather than rectangular edges');
assert.ok(Math.abs(constructionCandidate.dx) < 4 && Math.abs(constructionCandidate.dy) < 4, 'isometric terrain sockets must align the painted diamond faces');
const faceCandidate = findSnapCandidate({ movingObjects: [constructionObject('door-a', 'sticker-blockfolk-wood-door', 404)], stationaryObjects: [constructionA], worldTolerance: 12 });
assert.ok(faceCandidate && faceCandidate.sourceAnchor.id === 'backFace' && faceCandidate.targetAnchor.id === 'frontFace', 'a painted building face must snap to a painted block face');
const constructionConnection = makeConnection(constructionCandidate);
const constructionConnections = validConnections([constructionConnection], new Set(['block-a', 'block-b']));
assert.equal(constructionConnections.length, 1, 'a valid connection must survive normalization');
const legacyConstructionConnection = { ...constructionConnection, id: 'legacy-connection', aAnchorId: 'right', bAnchorId: 'left' };
assert.equal(validConnections([legacyConstructionConnection], new Set(['block-a', 'block-b'])).length, 1, 'saved cardinal connections from the earlier build must remain valid without becoming new snap candidates');
assert.deepEqual([...connectedLayerIds(constructionConnections, 'block-a')].sort(), ['block-a', 'block-b']);
assert.equal(hasAssembly(constructionConnections, 'block-a'), true, 'a two-member connection is an assembly');
assert.equal(removeMemberConnections(constructionConnections, 'block-a').length, 0, 'Unsnap removes only the selected member links');
const copiedConnections = duplicateConnections(constructionConnections, new Map([['block-a', 'copy-a'], ['block-b', 'copy-b']]));
assert.equal(copiedConnections.length, 1); assert.deepEqual([copiedConnections[0].aLayerId, copiedConnections[0].bLayerId], ['copy-a', 'copy-b']); assert.notEqual(copiedConnections[0].id, constructionConnection.id, 'copied assemblies need fresh connection IDs');

picture.stickers.push(sticker);
picture.embeddedAssets.push({ id: 'pack-friends-cat', dataUrl: 'data:image/png;base64,AAAA', kind: 'sticker', name: 'Cat' });
const exactEmoji = '👩🏽‍🚀';
picture.embeddedAssets.push({ id: 'emoji-proof', kind: 'emoji', name: exactEmoji, glyph: exactEmoji });
picture.stickers.push(createSticker('emoji-proof', { layerId: 'emoji-layer', sourceEmoji: exactEmoji }));
const emojiRoundTrip = normalizePicture(JSON.parse(JSON.stringify(picture)));
assert.equal(emojiRoundTrip.embeddedAssets.find((asset) => asset.id === 'emoji-proof').glyph, exactEmoji, 'emoji asset source must round-trip exactly');
assert.equal(emojiRoundTrip.stickers.find((item) => item.layerId === 'emoji-layer').sourceEmoji, exactEmoji, 'emoji sticker source must round-trip exactly');
const duplicate = duplicatePicture(picture, 'My Picture 2', '2026-08-04T01:00:00.000Z');
assert.notEqual(duplicate.id, picture.id); assert.notEqual(duplicate.stickers[0].layerId, sticker.layerId); assert.equal(duplicate.embeddedAssets.length, 2, 'duplicate must retain used imported and emoji assets');

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
assert.deepEqual(library, { backgrounds: 2, stickers: 30, categories: 6 });
assert.deepEqual(BUILT_IN_CATEGORIES.map(({ id, title }) => ({ id, title })), [
  { id: 'animals', title: 'Animals' }, { id: 'people', title: 'People' }, { id: 'building', title: 'Building' },
  { id: 'nature', title: 'Nature' }, { id: 'magic', title: 'Magic' }, { id: 'emoji', title: 'Emoji' }
]);
assert.equal(BUILT_IN_CATEGORIES.every((category) => category.icon?.node?.length > 0), true, 'every temporary category control must use Lucide icon data');
assert.equal(BUILT_IN_BACKGROUNDS.length, 2); assert.equal(BUILT_IN_BACKGROUNDS[0].id, WORLD_BACKGROUND_ID); assert.equal(BUILT_IN_BACKGROUNDS[0].production, true); assert.equal(BUILT_IN_BACKGROUNDS[0].debug, false); assert.match(BUILT_IN_BACKGROUNDS[0].dataUrl, /^data:image\/webp;base64,/);
assert.equal(BUILT_IN_BACKGROUNDS[1].id, CLASSIC_WORLD_BACKGROUND_ID); assert.equal(BUILT_IN_BACKGROUNDS[1].presentation, 'contain'); assert.match(BUILT_IN_BACKGROUNDS[1].dataUrl, /^data:image\/png;base64,/);
assert.deepEqual(readFileSync(join(root, 'src', 'assets', 'backgrounds', 'blockfolk-valley-classic.png')), readFileSync(join(root, '..', 'the-imaginarium', 'src', 'assets', 'backgrounds', 'blockfolk-valley.png')), 'Classic BlockFolk Valley must remain byte-identical to its original Imaginarium asset');
assert.deepEqual(Object.fromEntries(BUILT_IN_CATEGORIES.map((category) => [category.id, BUILT_IN_STICKERS.filter((sticker) => sticker.category === category.id).length])), { animals: 2, people: 6, building: 6, nature: 12, magic: 4, emoji: 0 });
assert.deepEqual(BUILT_IN_STICKERS.map(({ name, category }) => ({ name, category })), [
  { name: 'Wolf', category: 'animals' }, { name: 'Boar', category: 'animals' },
  { name: 'Farmer', category: 'people' }, { name: 'Miner', category: 'people' }, { name: 'Knight', category: 'people' }, { name: 'Wizard', category: 'people' }, { name: 'Ranger', category: 'people' }, { name: 'Explorer', category: 'people' },
  { name: 'Wooden Door', category: 'building' }, { name: 'Stone Door', category: 'building' }, { name: 'Square Window', category: 'building' }, { name: 'Round Window', category: 'building' }, { name: 'Log Block', category: 'building' }, { name: 'Brick Block', category: 'building' },
  { name: 'Oak Tree', category: 'nature' }, { name: 'Pine Tree', category: 'nature' }, { name: 'Shrub', category: 'nature' }, { name: 'Berry Bush', category: 'nature' }, { name: 'Grass Block', category: 'nature' }, { name: 'Dirt Block', category: 'nature' }, { name: 'Stone Block', category: 'nature' }, { name: 'Sand Block', category: 'nature' }, { name: 'Snow Block', category: 'nature' }, { name: 'Water Block', category: 'nature' }, { name: 'Lava Block', category: 'nature' }, { name: 'Leaves Block', category: 'nature' },
  { name: 'Slime', category: 'magic' }, { name: 'Bat', category: 'magic' }, { name: 'Golem', category: 'magic' }, { name: 'Dragon', category: 'magic' }
]);
assert.equal(BLOCKFOLK_DEFAULT_WORLD_EXTENT, 420 / (1.1 ** 10), 'the new default must equal exactly ten Smaller presses below the previous 420-world-unit default');
assert.equal(BUILT_IN_STICKERS.every((sticker) => sticker.builtIn && sticker.kind === 'sticker' && sticker.defaultWorldExtent === BLOCKFOLK_DEFAULT_WORLD_EXTENT), true, 'all accepted stickers must use the derived tenth-step world extent');
const acceptedFiles = readdirSync(acceptedStickerRoot).filter((name) => name.endsWith('.png')).sort();
const productFiles = readdirSync(productStickerRoot).filter((name) => name.endsWith('.png')).sort();
assert.equal(productFiles.length, 30); assert.deepEqual(productFiles, acceptedFiles);
for (const filename of productFiles) assert.deepEqual(readFileSync(join(productStickerRoot, filename)), readFileSync(join(acceptedStickerRoot, filename)), `${filename} must remain byte-identical to the accepted individual asset`);
assert.deepEqual(assetManifest.bundles[0], { name: 'blockfolk-world', assets: [{ alias: 'blockfolk-valley', src: 'backgrounds/blockfolk-valley.webp' }, { alias: 'blockfolk-valley-classic', src: 'backgrounds/blockfolk-valley-classic.png' }] }, 'the production and Classic world bundle must retain both declared assets');
const manifestAssets = assetManifest.bundles.flatMap((bundle) => bundle.assets || []);
assert.equal(assetManifest.bundles.length, 2); assert.equal(manifestAssets.length, 32); assert.equal(manifestAssets.filter((asset) => asset.src === 'backgrounds/blockfolk-valley.webp').length, 1); assert.equal(manifestAssets.filter((asset) => asset.src === 'backgrounds/blockfolk-valley-classic.png').length, 1); assert.equal(manifestAssets.filter((asset) => /^blockfolk\/[^/]+\.png$/.test(asset.src)).length, 30);

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

const storage = new BlockFolkImaginariumStorage();
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
for (const required of ['new-picture', 'show-gallery', 'show-parent-gate', 'show-world-locations', 'camera-zoom-out', 'camera-fit', 'camera-zoom-in', 'add-emoji', 'toggle-snap', 'unsnap', 'show-selection-more', 'smaller', 'bigger', 'turn', 'flip', 'behind', 'in-front', 'copy', 'trash', 'undo', 'redo', 'download', 'share']) assert.match(`${source}\n${html}`, new RegExp(required), `missing ${required} workflow`);
assert.match(source, /reorderObjects\(groups\.flat\(\)\)/, 'depth controls must reorder contiguous assembly layers deterministically');
assert.match(source, /flipX: flipped\.flipX/, 'Flip must use the native horizontal mirror property');
assert.match(html, /data-action="toggle-snap"[\s\S]*data-action="flip"[\s\S]*data-action="behind"[\s\S]*data-action="in-front"[\s\S]*data-action="copy"[\s\S]*data-action="trash"[\s\S]*data-action="show-selection-more"/, 'primary selected-sticker tools must prioritize construction and layering');
assert.match(html, /id="selection-more-sheet"[\s\S]*data-action="smaller"[\s\S]*data-action="bigger"[\s\S]*data-action="turn"/, 'manual transform tools must remain available in More / Edit');
for (const required of ['make-puzzle', 'puzzle-photo', 'puzzle-show-creations', 'puzzle-build', 'puzzle-restart', 'puzzle-hint', 'puzzle-race', 'puzzle-snap']) assert.match(html, new RegExp(required), `missing ${required} puzzle workflow`);
for (const [action, tone] of [['make-puzzle', 'sky'], ['puzzle-photo', 'yellow'], ['puzzle-show-creations', 'mint'], ['puzzle-frame-reset', 'sky'], ['puzzle-hint', 'yellow'], ['puzzle-race', 'pink'], ['puzzle-snap', 'mint'], ['puzzle-restart', 'lilac'], ['puzzle-play-again', 'yellow'], ['puzzle-another', 'sky'], ['puzzle-done', 'purple']]) {
  assert.match(html, new RegExp(`data-action="${action}"[^>]*data-control-tone="${tone}"`), `${action} must use the approved ${tone} puzzle tone`);
}
assert.doesNotMatch(source, /slot\.addEventListener\('click'/, 'board slots must not reveal answers through tap-to-fit');
assert.match(source, /setTimeout\(\(\) => this\.saveCurrent\(\{ quiet: true \}\)/, 'background autosave must be debounced and silent');
assert.match(source, /navigator\.share/); assert.match(source, /downloadBlob\(blob/);
assert.match(source, /canvas\.toDataURL\(\{ format: 'png'/, 'PNG export must be implemented');
assert.match(source, /this\.gateHeld\.size === 2/); assert.match(source, /elapsed \/ 3000/);
assert.match(source, /BlockFolkImaginariumControls/); assert.match(source, /controls\.setEnabled/); assert.doesNotMatch(source, /new AudioContext\(/);
assert.match(controlSource, /upgradeSwitch/); assert.match(controlSource, /createWebAudioCueTransport/); assert.match(controlSource, /createWebHapticTransport/);
for (const settingAction of ['toggle-sound', 'toggle-haptics', 'toggle-motion']) assert.match(html, new RegExp(`data-action="${settingAction}"`), `missing tactile ${settingAction} setting`);
for (const mode of ['quick', 'relaxed', 'leaving']) assert.match(html, new RegExp(`data-autosave-mode="${mode}"`), `missing tactile ${mode} autosave choice`);
assert.match(controlSource, /groupId: 'blockfolk-imaginarium-autosave-mode'/, 'autosave timing must use mutually exclusive choice semantics');
assert.match(html, /role="radiogroup"/); assert.match(html, /data-control-family="big"/);
assert.match(html, /id="import-category"/); assert.match(html, /Make a new category/); assert.match(source, /processStickerPack\(file, \{ defaultCategory \}\)/);
assert.match(source, /new fabricNS\.Text\(asset\.glyph/); assert.doesNotMatch(html, /value="community"/);
assert.match(source, /addEventListener\('pointerdown'/, 'the world must route direct pointer manipulation');
assert.match(source, /zoomCameraAt\(/, 'pinch and accessible zoom must share midpoint camera math');
assert.match(source, /pointercancel/, 'camera and sticker contact must handle cancellation');
assert.match(source, /sourceEmoji/, 'native emoji source must remain authoritative in editor state');
assert.match(html, /id="world-sheet"/); assert.match(html, /id="location-grid"/);
assert.match(html, /id="background-grid"/); assert.match(source, /chooseWorld\(/, 'the shell must expose the production and Classic world choices');
assert.doesNotMatch(html, /\b(asset|layer|artboard|manifest|serialization|opacity|coordinate|MIME|decompression|Fabric object)\b/i, 'child-facing shell must avoid professional editor terms');

assert.match(html, /BlockFolk Imaginarium/); assert.match(source, /asset\.defaultWorldExtent \|\| 720/);
assert.doesNotMatch(`${source}\n${controlSource}`, /the-imaginarium-library-v1|the-imaginarium\.preferences@1/);
console.log('BLOCKFOLK_IMAGINARIUM_SOURCE_FOCUSED_SCENARIOS PASS', JSON.stringify({ library, galleryLimit: GALLERY_LIMIT, storage: storage.mode, packInference: { stickers: inferred.stickers.length, backgrounds: inferred.backgrounds.length } }));
