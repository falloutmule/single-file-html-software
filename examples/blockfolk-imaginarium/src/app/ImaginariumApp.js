/* global Blob, File, ResizeObserver, TextEncoder, URL, atob, clearInterval, clearTimeout, console, document, localStorage, matchMedia, navigator, performance, prompt, requestAnimationFrame, setInterval, setTimeout, structuredClone, window */
import * as fabricNS from 'fabric';
import { BUILT_IN_CATEGORIES, BUILT_IN_STICKERS, CREATIVE_PROMPTS, findBuiltInAsset } from '../model/builtInLibrary.js';
import { migrateAssetCategory, migrateBuiltInCategory } from '../model/categoryModel.js';
import { validateNativeEmojiSequence } from '../model/emojiModel.js';
import { DEFAULT_AUTOSAVE_MODE, autosavePolicy, normalizeAutosaveMode } from '../model/autosave.js';
import { PictureHistory } from '../model/history.js';
import { BlockFolkImaginariumControls } from './ImaginariumControls.js';
import { PuzzleController } from './PuzzleController.js';
import {
  GALLERY_LIMIT, MAX_SCALE, MIN_SCALE, clampStickerPosition, createPicture,
  createSticker, duplicatePicture, flipSticker, mapChildSafeError, normalizePicture, resizeSticker, rotateSticker, validatePicture,
  validWindowAttachments
} from '../model/pageModel.js';
import { createStableId } from '../model/ids.js';
import { READ_ONLY_LEGACY_NOTICE, ReadOnlyLegacySession } from '../model/ReadOnlyLegacySession.js';
import {
  SNAP_AMBIGUITY_SCREEN_PX, SNAP_CROSS_AXIS_AMBIGUITY_SCREEN_PX, SNAP_EXACT_POSE_SCREEN_PX, SNAP_TOLERANCE_SCREEN_PX,
  SNAP_Z_INTENT_LATERAL_SCREEN_PX, SNAP_Z_INTENT_VERTICAL_SCREEN_PX, buildComponentGrid,
  connectedLayerIds, duplicateConnections, findGridSnapCandidate, hasAssembly, isSnappableAsset,
  makeConnection, removeMemberConnections, validConnections
} from '../model/constructionModel.js';
import { BlockFolkImaginariumStorage, PREFERENCE_KEY, loadPreferences, savePreferences } from '../model/storage.js';
import { processStickerPack, safeId } from '../model/stickerPacks.js';
import {
  CAMERA_MAX_ZOOM, CAMERA_MIN_ZOOM, DEFAULT_CAMERA, WORLD_BACKGROUND_ID, WORLD_SIZE,
  cameraMetrics, cameraTransform, clampCamera, normalizeCamera, normalizeWorldBackgroundId, panCamera, screenToWorld, zoomCameraAt
} from '../model/worldModel.js';

const SCREEN_IDS = ['home-screen', 'editor-screen', 'gallery-screen', 'parent-gate-screen', 'parent-tools-screen', 'puzzle-source-screen', 'puzzle-frame-screen', 'puzzle-play-screen'];
const READ_ONLY_BLOCKED_ACTIONS = new Set([
  'undo', 'redo', 'add-emoji', 'snap-context', 'smaller', 'bigger', 'turn', 'flip', 'behind', 'in-front',
  'copy', 'trash', 'surprise-sticker', 'export-recovery', 'clear-data'
]);
const ATTACHABLE_WINDOW_IDS = new Set([
  'sticker-blockfolk-square-window', 'sticker-blockfolk-round-window'
]);

function contentBounds(object) {
  const center = object?.getCenterPoint?.() || { x: Number(object?.left || 0), y: Number(object?.top || 0) };
  const halfWidth = Math.abs(Number(object?.width || 0) * Number(object?.scaleX || 1)) / 2;
  const halfHeight = Math.abs(Number(object?.height || 0) * Number(object?.scaleY || 1)) / 2;
  const radians = Number(object?.angle || 0) * Math.PI / 180;
  const cosine = Math.abs(Math.cos(radians)); const sine = Math.abs(Math.sin(radians));
  const extentX = cosine * halfWidth + sine * halfHeight; const extentY = sine * halfWidth + cosine * halfHeight;
  return { left: center.x - extentX, top: center.y - extentY, right: center.x + extentX, bottom: center.y + extentY };
}

function rectangularOverlap(left, right) {
  return Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left))
    * Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
}

function dataUrlToBlob(dataUrl) {
  const [header, payload] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(header)?.[1] || 'application/octet-stream';
  const bytes = header.includes(';base64') ? Uint8Array.from(atob(payload), (character) => character.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(payload));
  return new Blob([bytes], { type: mime });
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function safeFilename(title) {
  return String(title || 'my-picture').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-picture';
}

function formatDate(value) {
  try { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); } catch { return ''; }
}

function createLucideIcon(iconData) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) svg.setAttribute(name, value);
  svg.classList.add('lucide', `lucide-${iconData.name}`);
  svg.setAttribute('aria-hidden', 'true');
  for (const [tag, attributes] of iconData.node) {
    const child = document.createElementNS(namespace, tag);
    for (const [name, value] of Object.entries(attributes)) child.setAttribute(name, String(value));
    svg.appendChild(child);
  }
  return svg;
}

export class BlockFolkImaginariumApp {
  constructor(root) {
    this.root = root;
    this.storage = new BlockFolkImaginariumStorage();
    this.history = new PictureHistory(20);
    this.current = null;
    this.packs = [];
    this.camera = normalizeCamera(DEFAULT_CAMERA);
    this.worldPointers = new Map();
    this.worldInteraction = null;
    this.snapPreview = null;
    this.windowAttachments = new Map();
    this.rendering = false;
    this.transformBefore = null;
    this.autosaveTimer = null;
    this.legacySession = null;
    this.legacyNoticesShown = new Set();
    this.toastTimer = null;
    this.confirmResolver = null;
    this.gateHeld = new Set();
    this.gateStart = 0;
    this.gateTimer = null;
    this.preferences = { sound: true, haptics: true, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, autosaveMode: DEFAULT_AUTOSAVE_MODE, ...loadPreferences() };
    this.preferences.autosaveMode = normalizeAutosaveMode(this.preferences.autosaveMode);
    this.category = migrateBuiltInCategory(this.preferences.category);
    this.preferences.category = this.category;
  }

  async mount() {
    await this.storage.init();
    this.packs = await this.storage.listPacks();
    this.cacheElements();
    this.controls = new BlockFolkImaginariumControls({
      root: this.root,
      preferences: this.preferences,
      onActivate: (element) => this.activateControl(element).catch((error) => this.handleError(error))
    });
    this.controls.upgradeWithin(this.root);
    this.controls.upgradeSwitch(this.elements.soundSetting.closest('.switch-row'), this.elements.soundSetting, { selected: !!this.preferences.sound });
    this.controls.upgradeSwitch(this.elements.hapticsSetting.closest('.switch-row'), this.elements.hapticsSetting, { selected: !!this.preferences.haptics });
    this.controls.upgradeSwitch(this.elements.motionSetting.closest('.switch-row'), this.elements.motionSetting, { selected: !!this.preferences.reducedMotion });
    this.elements.soundSetting = this.root.querySelector('#sound-setting');
    this.elements.hapticsSetting = this.root.querySelector('#haptics-setting');
    this.elements.motionSetting = this.root.querySelector('#motion-setting');
    this.elements.continueButton = this.root.querySelector('#continue-picture');
    this.mountCanvas();
    this.puzzle = new PuzzleController({
      root: this.root, storage: this.storage, controls: this.controls,
      showScreen: (id) => this.showScreen(id), showHome: () => this.goHome(),
      listCreations: () => this.storage.listPictures(), flattenCreation: (id) => this.flattenPictureForPuzzle(id),
      announce: (message) => this.announce(message), toast: (message) => this.toast(message), cue: (kind) => this.controls.playPuzzleCue(kind)
    });
    this.puzzle.mount();
    this.mountEvents();
    this.applyPreferences();
    savePreferences(this.preferences);
    this.renderLibrary();
    this.renderPackList();
    await this.refreshContinueButton();
    this.showScreen('home-screen');
    this.root.dataset.boot = 'ready';
    if (this.storage.mode === 'memory') this.toast('Pictures will stay until this tab closes. PNG download still works.');
  }

  cacheElements() {
    const $ = (selector) => this.root.querySelector(selector);
    this.elements = {
      canvas: $('#picture-canvas'), viewport: $('#page-viewport'), scaler: $('#page-scaler'), frame: $('#page-frame'), empty: $('#empty-invitation'),
      selection: $('#selection-toolbar'), selectionMore: $('#selection-more-sheet'), categories: $('#category-tabs'), stickers: $('#sticker-list'), stripTitle: $('#sticker-strip-title'),
      gallery: $('#gallery-grid'), galleryEmpty: $('#gallery-empty'), galleryNote: $('#gallery-limit-note'),
      continueButton: $('#continue-picture'), saveStatus: $('#save-status'), ideaCard: $('#idea-card'), ideaText: $('#idea-text'),
      parentGate: $('#parent-gate-screen'), gateCount: $('#gate-count'), parentTools: $('#parent-tools-screen'),
      packInput: $('#pack-input'), packList: $('#pack-list'), importStatus: $('#import-status'), importReport: $('#import-report'), importDetails: $('#import-report-details'),
      importCategory: $('#import-category'), customCategoryRow: $('#custom-category-row'), customCategory: $('#custom-category'),
      recoveryInput: $('#recovery-input'), storageSummary: $('#storage-summary'), soundSetting: $('#sound-setting'), hapticsSetting: $('#haptics-setting'), motionSetting: $('#motion-setting'),
      confirmSheet: $('#confirm-sheet'), confirmMessage: $('#confirm-message'), toast: $('#toast'), live: $('#live-region')
    };
  }

  mountCanvas() {
    const objectPrototype = fabricNS.FabricObject?.prototype;
    if (objectPrototype) {
      objectPrototype.transparentCorners = false;
      objectPrototype.borderColor = '#ffb23f';
      objectPrototype.borderScaleFactor = 5;
      objectPrototype.padding = 14;
      objectPrototype.cornerStyle = 'circle';
    }
    this.canvas = new fabricNS.Canvas(this.elements.canvas, {
      width: 390, height: 480, selection: false, preserveObjectStacking: true,
      allowTouchScrolling: false, stopContextMenu: true, controlsAboveOverlay: true, renderOnAddRemove: true, enableRetinaScaling: true
    });
    this.canvas.upperCanvasEl.style.touchAction = 'none';
    this.canvas.lowerCanvasEl.style.touchAction = 'none';
    this.setRenderingQuality();
    this.mountWorldPointers();
    this.history.addEventListener('change', (event) => {
      this.controls.setEnabled(this.root.querySelector('[data-action="undo"]'), event.detail.canUndo);
      this.controls.setEnabled(this.root.querySelector('[data-action="redo"]'), event.detail.canRedo);
    });
    this.resizeObserver = new ResizeObserver(() => this.fitPage());
    this.resizeObserver.observe(this.elements.viewport);
  }

  mountWorldPointers() {
    const surface = this.canvas.upperCanvasEl;
    const point = (event) => { const rect = surface.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
    const stop = (event) => { event.preventDefault(); event.stopImmediatePropagation(); };
    const placeStickerMembers = (interaction, location) => {
      const { scale } = cameraMetrics(this.camera, this.canvas.width, this.canvas.height);
      const dx = (location.x - interaction.start.x) / scale; const dy = (location.y - interaction.start.y) / scale;
      const members = this.objectsForMemberIds(interaction.memberIds);
      for (const object of members) {
        const origin = interaction.origins.get(object.blockfolkLayerId); if (!origin) continue;
        object.set({ left: origin.x + dx, top: origin.y + dy }); object.setCoords();
      }
      const bounds = members.map((object) => object.getBoundingRect());
      const left = Math.min(...bounds.map((box) => box.left)); const top = Math.min(...bounds.map((box) => box.top));
      const right = Math.max(...bounds.map((box) => box.left + box.width)); const bottom = Math.max(...bounds.map((box) => box.top + box.height));
      const correctionX = left < 0 ? -left : right > WORLD_SIZE ? WORLD_SIZE - right : 0;
      const correctionY = top < 0 ? -top : bottom > WORLD_SIZE ? WORLD_SIZE - bottom : 0;
      if (correctionX || correctionY) for (const object of members) { object.set({ left: Number(object.left || 0) + correctionX, top: Number(object.top || 0) + correctionY }); object.setCoords(); }
      const byId = new Map(this.canvas.getObjects().map((object) => [object.blockfolkLayerId, object]));
      for (const { childId, hostId } of interaction.followerLinks || []) {
        const child = byId.get(childId); const host = byId.get(hostId); const childOrigin = interaction.origins.get(childId); const hostOrigin = interaction.origins.get(hostId);
        if (!child || !host || !childOrigin || !hostOrigin) continue;
        child.set({ left: childOrigin.x + Number(host.left || 0) - hostOrigin.x, top: childOrigin.y + Number(host.top || 0) - hostOrigin.y }); child.setCoords();
      }
    };
    const beginPinch = () => {
      const pointers = [...this.worldPointers.values()].slice(0, 2); if (pointers.length !== 2) return;
      if (this.worldInteraction?.mode === 'sticker' && this.worldInteraction.origins) {
        for (const object of this.objectsForMemberIds(new Set(this.worldInteraction.origins.keys()))) { const origin = this.worldInteraction.origins.get(object.blockfolkLayerId); if (origin) { object.set(origin); object.setCoords(); } }
        this.snapPreview = null;
      }
      const midpoint = { x: (pointers[0].x + pointers[1].x) / 2, y: (pointers[0].y + pointers[1].y) / 2 };
      const distance = Math.max(1, Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y));
      const before = this.worldInteraction?.before || this.snapshot();
      this.worldInteraction = { mode: 'pinch', before, startCamera: structuredClone(this.camera), startMidpoint: midpoint, startDistance: distance, anchor: screenToWorld(this.camera, this.canvas.width, this.canvas.height, midpoint.x, midpoint.y), moved: false };
    };
    const down = (event) => {
      stop(event); const location = point(event); this.worldPointers.set(event.pointerId, { ...location, pointerType: event.pointerType });
      try { surface.setPointerCapture(event.pointerId); } catch { /* capture is optional in synthetic test environments */ }
      if (this.worldPointers.size >= 2) { beginPinch(); return; }
      const worldPoint = screenToWorld(this.camera, this.canvas.width, this.canvas.height, location.x, location.y);
      const fabricPoint = new fabricNS.Point(worldPoint.x, worldPoint.y);
      const target = [...this.canvas.getObjects()].reverse().find((object) => object.visible !== false && object.evented !== false && object.containsPoint(fabricPoint)) || null;
      const before = this.snapshot();
      const editableTarget = target && !this.legacySession;
      const memberIds = editableTarget ? this.selectedMemberIds(target) : null;
      const followerLinks = editableTarget && isSnappableAsset(target.blockfolkAssetId)
        ? this.attachmentFollowersForHosts(memberIds).map(({ childId, hostId }) => ({ childId, hostId })) : [];
      const movingIds = editableTarget ? new Set([...memberIds, ...followerLinks.map(({ childId }) => childId)]) : null;
      const origins = editableTarget ? new Map(this.objectsForMemberIds(movingIds).map((object) => [object.blockfolkLayerId, { x: Number(object.left || 0), y: Number(object.top || 0) }])) : null;
      this.worldInteraction = editableTarget
        ? { mode: 'sticker', before, target, memberIds, followerLinks, origins, start: location, last: location, moved: false }
        : { mode: 'pan', before, startCamera: structuredClone(this.camera), start: location, last: location, moved: false };
      if (target) { this.canvas.setActiveObject(target); this.canvas.requestRenderAll(); this.updateSelection(); }
    };
    const move = (event) => {
      if (!this.worldPointers.has(event.pointerId)) return;
      stop(event); const location = point(event); this.worldPointers.set(event.pointerId, { ...location, pointerType: event.pointerType });
      const interaction = this.worldInteraction; if (!interaction) return;
      if (interaction.mode === 'pinch') {
        const pointers = [...this.worldPointers.values()].slice(0, 2); if (pointers.length !== 2) return;
        const midpoint = { x: (pointers[0].x + pointers[1].x) / 2, y: (pointers[0].y + pointers[1].y) / 2 };
        const distance = Math.max(1, Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y));
        const zoom = interaction.startCamera.zoom * (distance / interaction.startDistance);
        const candidate = normalizeCamera({ ...interaction.startCamera, zoom }); const metrics = cameraMetrics(candidate, this.canvas.width, this.canvas.height);
        this.camera = clampCamera({ ...candidate, centerX: interaction.anchor.x - (midpoint.x - metrics.width / 2) / metrics.scale, centerY: interaction.anchor.y - (midpoint.y - metrics.height / 2) / metrics.scale }, metrics.width, metrics.height);
        interaction.moved = interaction.moved || Math.abs(distance - interaction.startDistance) > 2 || Math.hypot(midpoint.x - interaction.startMidpoint.x, midpoint.y - interaction.startMidpoint.y) > 2;
        this.applyCamera(); return;
      }
      const deltaX = location.x - interaction.last.x; const deltaY = location.y - interaction.last.y;
      interaction.last = location; interaction.moved = interaction.moved || Math.hypot(location.x - interaction.start.x, location.y - interaction.start.y) > 2;
      if (interaction.mode === 'pan') { this.camera = panCamera(this.camera, deltaX, deltaY, this.canvas.width, this.canvas.height); this.applyCamera(); return; }
      if (interaction.mode === 'sticker') {
        placeStickerMembers(interaction, location);
        this.canvas.requestRenderAll();
      }
    };
    const finish = (event, cancelled = false) => {
      if (!this.worldPointers.has(event.pointerId) && !this.worldInteraction) return;
      stop(event); const interaction = this.worldInteraction; this.worldPointers.delete(event.pointerId);
      try { surface.releasePointerCapture(event.pointerId); } catch { /* already released */ }
      if (!interaction) return;
      if (cancelled) {
        if (interaction.mode === 'sticker' && interaction.origins) for (const object of this.objectsForMemberIds(new Set(interaction.origins.keys()))) { const origin = interaction.origins.get(object.blockfolkLayerId); if (origin) { object.set(origin); object.setCoords(); } }
        this.camera = normalizeCamera(interaction.before?.page?.camera || interaction.startCamera || this.camera); this.applyCamera(); this.canvas.requestRenderAll();
      } else if (interaction.mode === 'sticker') {
        if (interaction.moved) placeStickerMembers(interaction, point(event));
        if (!interaction.moved) {
          this.moveMembersToEdge(interaction.memberIds, 1);
          this.placeAttachmentsAfterHosts(interaction.memberIds);
        }
        this.snapPreview = null; this.canvas.setActiveObject(interaction.target); interaction.target.setCoords(); this.canvas.requestRenderAll();
        this.commit(interaction.before, interaction.moved ? 'Sticker moved.' : 'Sticker selected.');
      } else if (interaction.moved) this.commit(interaction.before, interaction.mode === 'pinch' ? 'World view changed.' : 'World moved.');
      this.snapPreview = null; this.worldInteraction = null;
      this.updateSelection();
    };
    surface.addEventListener('pointerdown', down, true);
    surface.addEventListener('pointermove', move, true);
    surface.addEventListener('pointerup', (event) => finish(event, false), true);
    surface.addEventListener('pointercancel', (event) => finish(event, true), true);
  }

  mountEvents() {
    this.root.addEventListener('click', (event) => {
      if (event.target.closest('.sfhs-cf-root')) return;
      this.activateControl(event.target).catch((error) => this.handleError(error));
    });
    this.elements.gallery.addEventListener('change', (event) => {
      const input = event.target.closest('[data-picture-title]');
      if (input) this.renamePicture(input.dataset.pictureTitle, input.value).catch((error) => this.handleError(error));
    });
    this.elements.packInput.addEventListener('change', () => this.importPack(this.elements.packInput.files?.[0]).catch((error) => this.handleError(error)));
    this.elements.importCategory.addEventListener('change', () => {
      this.elements.customCategoryRow.hidden = this.elements.importCategory.value !== 'custom';
      if (!this.elements.customCategoryRow.hidden) this.elements.customCategory.focus();
    });
    this.elements.recoveryInput.addEventListener('change', () => this.importRecovery(this.elements.recoveryInput.files?.[0]).catch((error) => this.handleError(error)));
    this.root.querySelectorAll('[data-gate-star]').forEach((button) => {
      const visualRoot = button.closest('.sfhs-cf-root') || button;
      const hold = (event) => { event.preventDefault(); button.setPointerCapture?.(event.pointerId); this.gateHeld.add(button.dataset.gateStar); visualRoot.classList.add('is-held'); this.updateGate(); };
      const release = () => { this.gateHeld.delete(button.dataset.gateStar); visualRoot.classList.remove('is-held'); this.updateGate(); };
      button.addEventListener('pointerdown', hold); button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    });
    window.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g' && !this.elements.parentGate.hidden) { event.preventDefault(); this.openParentTools(); }
    });
    window.addEventListener('resize', () => this.fitPage(), { passive: true });
    window.visualViewport?.addEventListener('resize', () => this.fitPage(), { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.current) this.saveCurrent({ quiet: true }).catch(() => {}); });
  }

  async activateControl(target) {
    const actionElement = target.closest?.('[data-action]');
    if (actionElement && this.legacySession && READ_ONLY_BLOCKED_ACTIONS.has(actionElement.dataset.action)) return;
    if (actionElement) await this.handleAction(actionElement.dataset.action, actionElement);
    const stickerButton = target.closest?.('[data-sticker-id]');
    if (stickerButton && !this.legacySession) await this.addSticker(stickerButton.dataset.stickerId);
    const categoryButton = target.closest?.('[data-category]');
    if (categoryButton && !this.legacySession) { this.category = categoryButton.dataset.category; this.preferences.category = migrateBuiltInCategory(this.category); savePreferences(this.preferences); if (this.current) this.current.ui.category = this.preferences.category; this.renderLibrary(); }
    const galleryAction = target.closest?.('[data-gallery-action]');
    if (galleryAction) await this.handleGalleryAction(galleryAction.dataset.galleryAction, galleryAction.dataset.pictureId);
    const packRemove = target.closest?.('[data-remove-pack]');
    if (packRemove) await this.removePack(packRemove.dataset.removePack);
  }

  async handleAction(action, actionElement) {
    if (await this.puzzle?.handleAction(action, actionElement)) return;
    const actions = {
      'new-picture': () => this.startNewPicture(false),
      'surprise-picture': () => this.startNewPicture(true),
      'continue-picture': () => this.openPicture(this.current?.id),
      'show-gallery': () => this.showGallery(),
      'show-parent-gate': () => this.openParentGate(),
      'go-home': () => this.goHome(),
      undo: () => this.undo(), redo: () => this.redo(),
      'toggle-sound': () => this.updatePreference('sound', !this.preferences.sound),
      'toggle-haptics': () => this.updatePreference('haptics', !this.preferences.haptics),
      'toggle-motion': () => this.updatePreference('reducedMotion', !this.preferences.reducedMotion),
      'set-autosave': () => this.updatePreference('autosaveMode', normalizeAutosaveMode(actionElement?.dataset.autosaveMode)),
      'done-picture': () => this.donePicture(),
      'camera-zoom-in': () => this.zoomCamera(1.25), 'camera-zoom-out': () => this.zoomCamera(1 / 1.25), 'camera-fit': () => this.fitWorld(),
      'add-emoji': () => this.addEmojiFromInput(),
      'show-idea': () => this.showIdea(), 'hide-idea': () => { this.elements.ideaCard.hidden = true; },
      'snap-context': () => this.snapContextSelected(),
      'show-selection-more': () => { this.elements.selectionMore.hidden = false; }, 'close-selection-more': () => { this.elements.selectionMore.hidden = true; },
      smaller: () => this.resizeSelected(1 / 1.1), bigger: () => this.resizeSelected(1.1), turn: () => this.turnSelected(),
      flip: () => this.flipSelected(), behind: () => this.moveSelectedDepth(-1), 'in-front': () => this.moveSelectedDepth(1),
      copy: () => this.copySelected(), trash: () => this.trashSelected(), 'surprise-sticker': () => this.addSurpriseSticker(),
      'choose-pack': () => this.elements.packInput.click(), 'choose-recovery': () => this.elements.recoveryInput.click(),
      'export-recovery': () => this.exportRecovery(), 'clear-data': () => this.clearData(),
      'cancel-confirm': () => this.resolveConfirm(false), 'accept-confirm': () => this.resolveConfirm(true)
    };
    if (actions[action]) await actions[action](actionElement);
  }

  showScreen(id) {
    for (const screenId of SCREEN_IDS) this.root.querySelector(`#${screenId}`).hidden = screenId !== id;
    window.scrollTo(0, 0);
    document.body.classList.toggle('editor-open', id === 'editor-screen');
    document.body.classList.toggle('puzzle-open', id === 'puzzle-play-screen');
    if (id === 'editor-screen') requestAnimationFrame(() => this.fitPage());
  }

  async refreshContinueButton() {
    if (!this.current) {
      const pictures = await this.storage.listPictures();
      this.current = pictures[0] || null;
    }
    this.elements.continueButton.hidden = !this.current;
  }

  async startNewPicture(surprise = false) {
    const pictures = await this.storage.listPictures();
    if (pictures.length >= GALLERY_LIMIT) {
      this.toast('Your sticker book is full. Download or delete a picture to make room.');
      await this.showGallery();
      return;
    }
    this.legacySession = null; this.windowAttachments.clear();
    this.current = createPicture({ title: `My Picture ${pictures.length + 1}`, category: this.category });
    this.history.clear();
    await this.renderCurrentPicture();
    this.renderLibrary();
    this.applyLegacyCapabilities();
    this.showScreen('editor-screen');
    if (surprise) {
      const choices = BUILT_IN_STICKERS;
      if (choices.length) await this.addSticker(choices[Math.floor(Math.random() * choices.length)].id, false);
      this.showIdea();
    }
    await this.saveCurrent({ quiet: true });
  }

  async goHome() {
    if (this.current) await this.saveCurrent({ quiet: true });
    await this.refreshContinueButton();
    this.showScreen('home-screen');
  }

  async openPicture(id) {
    const picture = id ? await this.storage.getPicture(id) : this.current;
    if (!picture) return;
    this.windowAttachments.clear();
    const legacySession = await ReadOnlyLegacySession.openIfSupported(picture);
    if (legacySession) {
      this.legacySession = legacySession;
      this.current = this.legacySession.renderedPicture;
    } else {
      this.legacySession = null;
      this.current = normalizePicture(picture);
    }
    this.category = migrateBuiltInCategory(this.current.ui?.category);
    this.preferences.category = this.category;
    if (!this.legacySession) savePreferences(this.preferences);
    this.history.clear();
    await this.renderCurrentPicture();
    if (!this.legacySession) this.restoreWindowAttachmentsFromCurrent();
    this.renderLibrary();
    this.applyLegacyCapabilities();
    this.showScreen('editor-screen');
    if (this.legacySession && !this.legacyNoticesShown.has(this.current.id)) {
      this.legacyNoticesShown.add(this.current.id);
      this.toast(READ_ONLY_LEGACY_NOTICE);
      this.announce(READ_ONLY_LEGACY_NOTICE);
    }
  }

  getAllPackAssets() { return this.packs.flatMap((pack) => (pack.assets || []).map((asset) => ({ ...asset, category: migrateAssetCategory(asset.category) }))); }

  applyLegacyCapabilities() {
    const readOnly = !!this.legacySession;
    this.root.dataset.legacyReadOnly = String(readOnly);
    if (readOnly) this.elements.saveStatus.textContent = 'Read-only';
    const selectors = [
      '[data-sticker-id]', '[data-action="add-emoji"]', '[data-action="snap-context"]',
      '[data-action="smaller"]', '[data-action="bigger"]', '[data-action="turn"]', '[data-action="flip"]', '[data-action="behind"]',
      '[data-action="in-front"]', '[data-action="copy"]', '[data-action="trash"]', '[data-action="surprise-sticker"]',
      '[data-action="export-recovery"]', '[data-action="clear-data"]'
    ];
    for (const control of this.root.querySelectorAll(selectors.join(','))) {
      if (readOnly) this.controls.setEnabled(control, false);
      else if (!control.closest('#selection-toolbar, #selection-more-sheet')) this.controls.setEnabled(control, true);
    }
    const emojiInput = this.root.querySelector('#emoji-input'); if (emojiInput) emojiInput.disabled = readOnly;
    this.updateSelection();
  }

  getAsset(assetId) {
    return findBuiltInAsset(assetId)
      || this.current?.embeddedAssets?.find((asset) => asset.id === assetId)
      || this.getAllPackAssets().find((asset) => asset.id === assetId)
      || null;
  }

  snapshot() {
    if (!this.legacySession) this.syncCurrentFromCanvas();
    return structuredClone(this.current);
  }

  syncCurrentFromCanvas() {
    if (!this.current || this.rendering || this.legacySession) return;
    this.current.stickers = this.canvas.getObjects().map((object, index) => ({
      layerId: object.blockfolkLayerId,
      assetId: object.blockfolkAssetId,
      x: Number(object.left || 0), y: Number(object.top || 0),
      scaleX: Number(object.scaleX || 1), scaleY: Number(object.scaleY || 1),
      angle: Number(object.angle || 0), flipX: !!object.flipX, flipY: !!object.flipY,
      opacity: Number(object.opacity ?? 1), zIndex: index,
      ...(object.blockfolkSourceEmoji ? { sourceEmoji: object.blockfolkSourceEmoji } : {})
    }));
    this.current.connections = validConnections(this.current.connections || [], new Set(this.current.stickers.map((sticker) => sticker.layerId)));
    this.syncWindowAttachmentsFromMap();
    this.current.page.backgroundAssetId = normalizeWorldBackgroundId(this.current.page.backgroundAssetId) || WORLD_BACKGROUND_ID;
    this.current.page.camera = normalizeCamera(this.camera);
    this.current.ui = { category: migrateBuiltInCategory(this.category) };
    const usedIds = new Set([this.current.page.backgroundAssetId, ...this.current.stickers.map((sticker) => sticker.assetId)]);
    const known = new Map((this.current.embeddedAssets || []).map((asset) => [asset.id, asset]));
    for (const id of usedIds) {
      const asset = this.getAsset(id);
      if (asset && !asset.builtIn) known.set(id, structuredClone(asset));
    }
    this.current.embeddedAssets = [...known.values()].filter((asset) => usedIds.has(asset.id));
  }

  async renderCurrentPicture(selectedLayerId = null) {
    if (!this.current) return;
    this.rendering = true;
    this.canvas.discardActiveObject();
    this.canvas.clear();
    this.camera = normalizeCamera(this.current.page.camera);
    await this.applyBackground();
    for (const sticker of [...this.current.stickers].sort((a, b) => a.zIndex - b.zIndex)) {
      const asset = this.getAsset(sticker.assetId) || (sticker.sourceEmoji ? { id: sticker.assetId, kind: 'emoji', glyph: sticker.sourceEmoji, name: `Emoji ${sticker.sourceEmoji}`, width: 560, height: 560 } : null);
      if (!asset) continue;
      await this.addFabricSticker(asset, sticker);
    }
    this.canonicalizeConstructionAssemblies();
    const selected = selectedLayerId && this.canvas.getObjects().find((object) => object.blockfolkLayerId === selectedLayerId);
    if (selected) this.canvas.setActiveObject(selected); else this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.rendering = false;
    this.updateSelection();
    this.fitPage();
  }

  async applyBackground() {
    const asset = findBuiltInAsset(this.current?.page?.backgroundAssetId || WORLD_BACKGROUND_ID) || findBuiltInAsset(WORLD_BACKGROUND_ID);
    const image = await fabricNS.FabricImage.fromURL(asset.dataUrl);
    const scale = asset.presentation === 'contain'
      ? Math.min(WORLD_SIZE / Math.max(1, image.width || asset.width), WORLD_SIZE / Math.max(1, image.height || asset.height))
      : WORLD_SIZE / Math.max(1, image.width || WORLD_SIZE);
    const width = Math.max(1, image.width || asset.width || WORLD_SIZE) * scale; const height = Math.max(1, image.height || asset.height || WORLD_SIZE) * scale;
    image.set({ left: (WORLD_SIZE - width) / 2, top: (WORLD_SIZE - height) / 2, originX: 'left', originY: 'top', scaleX: scale, scaleY: scale, selectable: false, evented: false });
    this.canvas.backgroundImage = image;
    this.canvas.backgroundColor = asset.presentation === 'contain' ? '#f1f0ed' : '#d8cfb2';
    this.canvas.requestRenderAll();
  }

  async addFabricSticker(asset, sticker) {
    const object = asset.kind === 'emoji'
      ? new fabricNS.Text(asset.glyph, { fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif', fontSize: 560 })
      : await fabricNS.FabricImage.fromURL(asset.dataUrl);
    object.set({
      left: sticker.x, top: sticker.y, originX: 'center', originY: 'center', scaleX: sticker.scaleX, scaleY: sticker.scaleY,
      angle: sticker.angle, flipX: sticker.flipX, flipY: sticker.flipY, opacity: sticker.opacity,
      blockfolkLayerId: sticker.layerId, blockfolkAssetId: sticker.assetId, blockfolkSourceEmoji: sticker.sourceEmoji || asset.glyph || null,
      selectable: false, hasControls: false, hasBorders: true,
      lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true,
      borderColor: '#ffb23f', borderScaleFactor: 5, padding: 14
    });
    this.canvas.add(object);
    return object;
  }

  fitPage() {
    if (this.root.querySelector('#editor-screen').hidden) return;
    const rect = this.elements.viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const width = Math.max(1, Math.floor(rect.width)); const height = Math.max(1, Math.floor(rect.height));
    if (this.canvas.width !== width || this.canvas.height !== height) this.canvas.setDimensions({ width, height });
    this.setRenderingQuality();
    this.applyCamera();
  }

  setRenderingQuality() {
    for (const context of [this.canvas?.contextContainer, this.canvas?.contextTop]) if (context) { context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'; }
  }

  applyCamera() {
    if (!this.canvas) return;
    const result = cameraTransform(this.camera, this.canvas.width || 1, this.canvas.height || 1);
    this.canvas.setViewportTransform(result.transform); this.canvas.requestRenderAll();
  }

  renderLibrary() {
    const categoryScrollLeft = this.elements.categories.scrollLeft;
    const imported = this.getAllPackAssets().filter((asset) => asset.kind === 'sticker');
    const categoryMap = new Map(BUILT_IN_CATEGORIES.map((category) => [category.id, category]));
    for (const asset of imported) if (!categoryMap.has(asset.category)) categoryMap.set(asset.category, { id: asset.category, title: asset.category.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), color: '#a7d9cc', icon: '＋' });
    if (!categoryMap.has(this.category)) this.category = categoryMap.keys().next().value;
    this.controls.destroyWithin(this.elements.categories);
    this.elements.categories.replaceChildren(...[...categoryMap.values()].map((category) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'category-tab'; button.dataset.category = category.id;
      button.setAttribute('aria-selected', String(category.id === this.category)); button.style.setProperty('--category-color', category.color);
      const icon = category.icon?.node ? createLucideIcon(category.icon) : document.createElement('span');
      if (!category.icon?.node) { icon.setAttribute('aria-hidden', 'true'); icon.textContent = category.icon || '＋'; }
      button.append(icon, document.createTextNode(category.title));
      return this.controls.upgradeButton(button, { family: 'choice', shape: 'capsule', semantic: { kind: 'choice', groupId: 'blockfolk-imaginarium-sticker-category', value: category.id }, selected: category.id === this.category, value: category.id, palette: category.color });
    }));
    this.elements.categories.scrollLeft = categoryScrollLeft;
    const stickers = [...BUILT_IN_STICKERS, ...imported].filter((asset) => asset.category === this.category);
    const selectedCategory = categoryMap.get(this.category);
    this.elements.stripTitle.textContent = selectedCategory?.title || 'Stickers';
    this.elements.stripTitle.dataset.category = this.category;
    this.controls.destroyWithin(this.elements.stickers);
    this.elements.stickers.replaceChildren(...stickers.map((sticker) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'sticker-button'; button.dataset.stickerId = sticker.id; button.dataset.name = sticker.name; button.setAttribute('aria-label', `Add ${sticker.name} sticker`);
      if (sticker.kind === 'emoji') {
        const glyph = document.createElement('span'); glyph.className = 'emoji-glyph'; glyph.setAttribute('aria-hidden', 'true'); glyph.textContent = sticker.glyph; button.appendChild(glyph);
      } else {
        const image = document.createElement('img'); image.alt = ''; image.src = sticker.dataUrl; button.appendChild(image);
      }
      return this.controls.upgradeButton(button, { family: 'tool', shape: 'round-rect', value: sticker.id, palette: 'cream' });
    }));
    if (!stickers.length) {
      if (this.category === 'emoji') {
        const composer = document.createElement('div'); composer.className = 'emoji-composer';
        const label = document.createElement('label'); label.htmlFor = 'emoji-input'; label.textContent = 'Type or paste one emoji';
        const input = document.createElement('input'); input.id = 'emoji-input'; input.type = 'text'; input.inputMode = 'text'; input.autocomplete = 'off'; input.spellcheck = false; input.maxLength = 32; input.setAttribute('aria-describedby', 'emoji-status'); input.placeholder = '🙂';
        input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); this.addEmojiFromInput(); } });
        const add = document.createElement('button'); add.type = 'button'; add.dataset.action = 'add-emoji'; add.textContent = 'Add Emoji'; add.className = 'add-emoji-button';
        const status = document.createElement('span'); status.id = 'emoji-status'; status.className = 'emoji-status'; status.setAttribute('role', 'status'); status.textContent = 'Uses your device’s native emoji.';
        composer.append(label, input, this.controls.upgradeButton(add, { family: 'big', value: 'add-emoji', palette: 'yellow' }), status);
        this.elements.stickers.appendChild(composer);
      } else {
        const empty = document.createElement('p'); empty.className = 'empty-strip-message'; empty.textContent = 'BlockFolk are coming soon'; this.elements.stickers.appendChild(empty);
      }
    }
    this.controls.setEnabled(this.root.querySelector('[data-action="surprise-sticker"]'), stickers.length > 0);
    if (this.legacySession) this.applyLegacyCapabilities();
  }

  async addEmojiFromInput() {
    if (!this.current || this.category !== 'emoji') return;
    const input = this.root.querySelector('#emoji-input'); const status = this.root.querySelector('#emoji-status');
    try {
      const glyph = validateNativeEmojiSequence(input?.value || '');
      const asset = { id: createStableId('blockfolk-native-emoji'), name: `Emoji ${glyph}`, alt: `Native emoji ${glyph}`, category: 'emoji', kind: 'emoji', glyph, builtIn: false, width: 560, height: 560 };
      const before = this.snapshot(); this.current.embeddedAssets.push(asset); await this.addSticker(asset.id, true, before); input.value = ''; status.textContent = `${glyph} added using this device’s emoji style.`; input.focus();
    } catch (error) { status.textContent = error.message; input?.focus(); }
  }

  zoomCamera(factor) {
    if (!this.current) return; const before = this.snapshot(); const nextZoom = Math.max(CAMERA_MIN_ZOOM, Math.min(CAMERA_MAX_ZOOM, this.camera.zoom * factor));
    this.camera = zoomCameraAt(this.camera, nextZoom, this.canvas.width / 2, this.canvas.height / 2, this.canvas.width, this.canvas.height); this.applyCamera(); this.commit(before, 'World zoom changed.');
  }

  fitWorld() {
    if (!this.current) return; const before = this.snapshot(); this.camera = clampCamera({ centerX: WORLD_SIZE / 2, centerY: WORLD_SIZE / 2, zoom: CAMERA_MIN_ZOOM }, this.canvas.width, this.canvas.height); this.applyCamera(); this.commit(before, 'Complete world fitted.');
  }

  async addSticker(assetId, recordHistory = true, preparedBefore = null) {
    const asset = this.getAsset(assetId);
    if (!asset || !['sticker', 'emoji'].includes(asset.kind)) throw new Error('That sticker could not be opened.');
    const before = preparedBefore || this.snapshot();
    const offset = (this.canvas.getObjects().length % 5) * 70;
    const sticker = createSticker(assetId, { x: this.camera.centerX + offset, y: this.camera.centerY + offset, scale: Math.min(MAX_SCALE, (asset.defaultWorldExtent || 720) / Math.max(asset.width || 560, asset.height || 560)), sourceEmoji: asset.kind === 'emoji' ? asset.glyph : undefined });
    sticker.zIndex = this.canvas.getObjects().length;
    const image = await this.addFabricSticker(asset, sticker);
    this.canvas.setActiveObject(image); this.canvas.requestRenderAll();
    if (recordHistory) this.commit(before, `${asset.name} sticker added.`); else { this.syncCurrentFromCanvas(); this.scheduleAutosave(); }
    this.updateSelection(); this.feedback('pop');
  }

  async addSurpriseSticker() {
    const choices = [...BUILT_IN_STICKERS, ...this.getAllPackAssets().filter((asset) => asset.kind === 'sticker')].filter((asset) => asset.category === this.category);
    if (!choices.length) return;
    await this.addSticker(choices[Math.floor(Math.random() * choices.length)].id);
  }

  activeSticker() { return this.canvas.getActiveObject(); }

  isAttachableWindow(object) { return ATTACHABLE_WINDOW_IDS.has(object?.blockfolkAssetId); }

  restoreWindowAttachmentsFromCurrent() {
    if (!this.current || this.legacySession) return;
    const canonical = validWindowAttachments(this.current.attachments, this.current.stickers);
    this.windowAttachments.clear();
    for (const { childLayerId, hostLayerId } of canonical) this.windowAttachments.set(childLayerId, hostLayerId);
    this.current.attachments = canonical;
  }

  syncWindowAttachmentsFromMap() {
    if (!this.current || this.legacySession) return;
    this.pruneWindowAttachments();
    const canonical = validWindowAttachments([...this.windowAttachments].map(([childLayerId, hostLayerId]) => ({ childLayerId, hostLayerId })), this.current.stickers);
    this.windowAttachments.clear();
    for (const { childLayerId, hostLayerId } of canonical) this.windowAttachments.set(childLayerId, hostLayerId);
    this.current.attachments = canonical;
  }

  pruneWindowAttachments() {
    const objects = new Map(this.canvas.getObjects().map((object) => [object.blockfolkLayerId, object]));
    for (const [childId, hostId] of this.windowAttachments) {
      const child = objects.get(childId); const host = objects.get(hostId);
      if (!child || !host || !this.isAttachableWindow(child) || !isSnappableAsset(host.blockfolkAssetId)) this.windowAttachments.delete(childId);
    }
  }

  attachmentFollowersForHosts(hostIds) {
    this.pruneWindowAttachments();
    const ids = hostIds instanceof Set ? hostIds : new Set(hostIds || []);
    const objects = new Map(this.canvas.getObjects().map((object) => [object.blockfolkLayerId, object]));
    return [...this.windowAttachments].filter(([, hostId]) => ids.has(hostId)).map(([childId, hostId]) => ({ child: objects.get(childId), host: objects.get(hostId), childId, hostId })).filter(({ child, host }) => child && host);
  }

  attachmentHostCandidate(child) {
    if (!this.isAttachableWindow(child)) return null;
    const objects = this.canvas.getObjects(); const candidates = objects.filter((object) => object !== child && isSnappableAsset(object.blockfolkAssetId));
    const childBounds = contentBounds(child); const center = child.getCenterPoint?.() || { x: Number(child.left || 0), y: Number(child.top || 0) };
    const containing = [...candidates].reverse().find((host) => {
      const bounds = contentBounds(host);
      return center.x >= bounds.left && center.x <= bounds.right && center.y >= bounds.top && center.y <= bounds.bottom;
    });
    if (containing) return containing;
    let best = null; let bestArea = 0;
    for (const host of candidates) {
      const area = rectangularOverlap(childBounds, contentBounds(host));
      if (area > 0 && area >= bestArea) { best = host; bestArea = area; }
    }
    return best;
  }

  placeAttachmentsAfterHosts(hostIds) {
    const ids = hostIds instanceof Set ? hostIds : new Set(hostIds || []); const original = this.canvas.getObjects();
    const followers = this.attachmentFollowersForHosts(ids).map(({ child }) => child).sort((left, right) => original.indexOf(left) - original.indexOf(right));
    if (!followers.length) return;
    const followerSet = new Set(followers); const remaining = original.filter((object) => !followerSet.has(object));
    const hostIndices = remaining.map((object, index) => ids.has(object.blockfolkLayerId) ? index : -1).filter((index) => index >= 0);
    if (!hostIndices.length) return;
    remaining.splice(Math.max(...hostIndices) + 1, 0, ...followers); this.reorderObjects(remaining);
  }

  selectedMemberIds(active = this.activeSticker()) {
    if (!active?.blockfolkLayerId) return new Set();
    return connectedLayerIds(this.current?.connections || [], active.blockfolkLayerId);
  }

  objectsForMemberIds(memberIds) { return this.canvas.getObjects().filter((object) => memberIds?.has(object.blockfolkLayerId)); }

  assemblyCenter(objects) {
    if (!objects.length) return { x: 0, y: 0 };
    return {
      x: objects.reduce((sum, object) => sum + Number(object.left || 0), 0) / objects.length,
      y: objects.reduce((sum, object) => sum + Number(object.top || 0), 0) / objects.length
    };
  }

  translateObjects(objects, dx, dy) {
    for (const object of objects) { object.set({ left: Number(object.left || 0) + dx, top: Number(object.top || 0) + dy }); this.clampFabricObject(object); object.setCoords(); }
  }

  proposeSnap(movingObjects) {
    if (!movingObjects.length || movingObjects.some((object) => !isSnappableAsset(object.blockfolkAssetId))) return { status: 'none' };
    const movingIds = new Set(movingObjects.map((object) => object.blockfolkLayerId));
    const stationary = this.canvas.getObjects().filter((object) => !movingIds.has(object.blockfolkLayerId) && isSnappableAsset(object.blockfolkAssetId));
    const { scale } = cameraMetrics(this.camera, this.canvas.width, this.canvas.height);
    return findGridSnapCandidate({
      movingObjects, stationaryObjects: stationary, connections: this.current?.connections || [],
      screenScale: Math.max(scale, .0001), screenTolerance: SNAP_TOLERANCE_SCREEN_PX,
      ambiguityScreen: SNAP_AMBIGUITY_SCREEN_PX,
      crossAxisAmbiguityScreen: SNAP_CROSS_AXIS_AMBIGUITY_SCREEN_PX,
      exactPoseScreen: SNAP_EXACT_POSE_SCREEN_PX,
      zIntentLateralScreen: SNAP_Z_INTENT_LATERAL_SCREEN_PX,
      zIntentVerticalScreen: SNAP_Z_INTENT_VERTICAL_SCREEN_PX
    });
  }

  resolveSnapContext(active = this.activeSticker()) {
    if (!active || this.legacySession) return { action: 'disabled', candidate: { status: 'none' }, members: [] };
    if (this.isAttachableWindow(active)) {
      this.pruneWindowAttachments();
      const hostId = this.windowAttachments.get(active.blockfolkLayerId) || null;
      return hostId
        ? { relation: 'attachment', action: 'unsnap', candidate: { status: 'none' }, members: [active], child: active, hostId }
        : { relation: 'attachment', action: 'snap', candidate: { status: 'none' }, members: [active], child: active, host: this.attachmentHostCandidate(active) };
    }
    const members = this.objectsForMemberIds(this.selectedMemberIds(active));
    const assembled = hasAssembly(this.current?.connections || [], active.blockfolkLayerId);
    const supported = members.length > 0 && members.every((object) => isSnappableAsset(object.blockfolkAssetId));
    if (!supported) return { action: assembled ? 'unsnap' : 'disabled', candidate: { status: 'none' }, members };
    const candidate = this.proposeSnap(members);
    return { relation: 'structural', action: candidate.status !== 'none' || !assembled ? 'snap' : 'unsnap', candidate, members };
  }

  applySnapContextControl(control, resolution) {
    if (!control) return;
    const unsnap = resolution.action === 'unsnap';
    const attachment = resolution.relation === 'attachment';
    this.controls.setContextState(control, unsnap
      ? { state: 'unsnap', icon: '⤨', label: 'Unsnap', ariaLabel: attachment ? 'Detach selected window from its block' : 'Detach selected sticker from its assembly', title: attachment ? 'Detach selected window from its block' : 'Detach selected sticker from its assembly' }
      : { state: 'snap', icon: '⌘', label: 'Snap', ariaLabel: attachment ? 'Attach selected window to a block' : 'Snap selected construction pieces', title: attachment ? 'Attach selected window to a block' : 'Snap selected construction pieces' });
    this.controls.setEnabled(control, resolution.action !== 'disabled');
  }

  attachSelectedWindow(resolution) {
    const child = resolution?.child || this.activeSticker(); const host = resolution?.host || null;
    if (!child || !host) {
      const message = 'Move onto a block to connect.'; this.toast(message); this.announce(message); return;
    }
    this.windowAttachments.set(child.blockfolkLayerId, host.blockfolkLayerId);
    this.placeAttachmentsAfterHosts(this.selectedMemberIds(host));
    this.canvas.setActiveObject(child); child.setCoords(); this.canvas.requestRenderAll();
    this.syncCurrentFromCanvas(); this.scheduleAutosave(); this.updateSelection();
    this.toast('Window attached.'); this.announce('Window attached.'); this.feedback('pop');
  }

  detachSelectedWindow(resolution) {
    const child = resolution?.child || this.activeSticker();
    if (!child || !this.windowAttachments.delete(child.blockfolkLayerId)) return;
    this.syncWindowAttachmentsFromMap(); this.scheduleAutosave(); this.canvas.requestRenderAll(); this.updateSelection();
    this.toast('Window detached.'); this.announce('Window detached.'); this.feedback('turn');
  }

  async snapSelected(resolution = this.resolveSnapContext()) {
    const active = this.activeSticker(); if (!active || !this.current) return;
    const activeLayerId = active.blockfolkLayerId; const before = this.snapshot();
    const { members, candidate: result } = resolution;
    const failureMessage = {
      none: 'Move closer to connect.',
      ambiguous: 'Move closer to the spot you want.',
      occupied: 'That spot is full.'
    }[result.status];
    if (failureMessage) { this.toast(failureMessage); this.announce(failureMessage); return; }
    if (result.status !== 'ok') { this.toast('Move closer to connect.'); this.announce('Move closer to connect.'); return; }

    const connection = makeConnection(result); const connectionsBefore = this.current.connections || [];
    const rollback = async () => {
      this.current = before;
      await this.renderCurrentPicture(activeLayerId);
      this.toast('Move closer to connect.'); this.announce('Move closer to connect.');
    };
    if (!connection) return rollback();

    const movingIds = new Set(members.map((member) => member.blockfolkLayerId));
    const followers = this.attachmentFollowersForHosts(movingIds).map(({ child, host }) => ({
      child, host, childLeft: Number(child.left || 0), childTop: Number(child.top || 0), hostLeft: Number(host.left || 0), hostTop: Number(host.top || 0)
    }));
    this.translateObjects(members, result.dx, result.dy);
    for (const follower of followers) {
      follower.child.set({
        left: follower.childLeft + Number(follower.host.left || 0) - follower.hostLeft,
        top: follower.childTop + Number(follower.host.top || 0) - follower.hostTop
      });
      follower.child.setCoords();
    }
    const layerIds = new Set(this.canvas.getObjects().map((object) => object.blockfolkLayerId));
    const nextConnections = validConnections([...connectionsBefore, connection], layerIds);
    if (nextConnections.length !== connectionsBefore.length + 1 || !nextConnections.some((item) => item.id === connection.id)) return rollback();
    this.current.connections = nextConnections;
    this.syncCurrentFromCanvas();

    const joinedIds = connectedLayerIds(this.current.connections, connection.aLayerId);
    const joinedObjects = this.objectsForMemberIds(joinedIds);
    const joinedGrid = buildComponentGrid(this.current.connections, joinedObjects, connection.aLayerId);
    if (!joinedIds.has(connection.bLayerId) || !joinedGrid.consistent || joinedGrid.memberIds.size !== joinedObjects.length) return rollback();

    this.ensureAssemblyContiguous(joinedIds); this.canonicalizeConstructionAssembly(joinedIds); this.placeAttachmentsAfterHosts(joinedIds); this.canvas.setActiveObject(active); active.setCoords(); this.canvas.requestRenderAll();
    this.commit(before, 'Pieces connected.');
    this.toast('Pieces connected.'); this.feedback('pop');
  }

  async snapContextSelected() {
    const active = this.activeSticker();
    if (!active) return;
    const control = this.elements.selection.querySelector('[data-action="snap-context"]');
    const displayed = control?.closest('.sfhs-cf-root')?.dataset.contextState || null;
    const resolution = this.resolveSnapContext(active);
    if (resolution.action === 'disabled') return;
    if (displayed !== resolution.action) { this.applySnapContextControl(control, resolution); return; }
    if (resolution.relation === 'attachment') {
      if (resolution.action === 'snap') this.attachSelectedWindow(resolution);
      else this.detachSelectedWindow(resolution);
    } else if (resolution.action === 'snap') await this.snapSelected(resolution);
    else await this.unsnapSelected();
  }

  objectGroups() {
    const objects = this.canvas.getObjects(); const visited = new Set(); const groups = [];
    for (const object of objects) {
      if (visited.has(object.blockfolkLayerId)) continue;
      const ids = this.selectedMemberIds(object); const members = objects.filter((item) => ids.has(item.blockfolkLayerId));
      for (const member of members) visited.add(member.blockfolkLayerId);
      groups.push(members);
    }
    return groups;
  }

  reorderObjects(ordered) {
    ordered.forEach((object, index) => this.canvas.moveObjectTo(object, index));
    this.canvas.requestRenderAll();
  }

  constructionGridFor(memberIds) {
    const ids = memberIds instanceof Set ? memberIds : new Set(memberIds || []);
    const members = this.objectsForMemberIds(ids); const rootLayerId = [...ids].sort()[0] || null;
    return buildComponentGrid(this.current?.connections || [], members, rootLayerId);
  }

  canonicalizeConstructionAssembly(memberIds) {
    const ids = memberIds instanceof Set ? memberIds : new Set(memberIds || []);
    if (ids.size < 2) return false;
    const original = this.canvas.getObjects(); const members = original.filter((object) => ids.has(object.blockfolkLayerId));
    if (members.length !== ids.size || members.some((object) => !isSnappableAsset(object.blockfolkAssetId))) return false;
    const indices = members.map((object) => original.indexOf(object)).sort((left, right) => left - right); const slotStart = indices[0];
    if (!indices.every((index, offset) => index === slotStart + offset)) return false;
    const grid = this.constructionGridFor(ids);
    if (!grid.consistent || grid.memberIds.size !== members.length || members.some((object) => !grid.origins.has(object.blockfolkLayerId))) return false;
    const ordered = [...members].sort((left, right) => {
      const leftZ = grid.origins.get(left.blockfolkLayerId).z; const rightZ = grid.origins.get(right.blockfolkLayerId).z;
      return leftZ - rightZ
        || Number(left.top || 0) - Number(right.top || 0)
        || Number(left.left || 0) - Number(right.left || 0)
        || left.blockfolkLayerId.localeCompare(right.blockfolkLayerId);
    });
    if (ordered.every((object, offset) => original[slotStart + offset] === object)) return true;
    const next = [...original]; next.splice(slotStart, members.length, ...ordered); this.reorderObjects(next);
    return true;
  }

  canonicalizeConstructionAssemblies() {
    const components = this.objectGroups().filter((group) => group.length > 1).map((group) => new Set(group.map((object) => object.blockfolkLayerId)));
    for (const memberIds of components) this.canonicalizeConstructionAssembly(memberIds);
  }

  ensureAssemblyContiguous(memberIds) {
    const original = this.canvas.getObjects(); const selected = original.filter((object) => memberIds.has(object.blockfolkLayerId));
    if (selected.length !== memberIds.size || selected.length < 2) return;
    const indices = selected.map((object) => original.indexOf(object)).sort((left, right) => left - right); const insertAt = indices[0];
    if (indices.every((index, offset) => index === insertAt + offset)) return;
    const remaining = original.filter((object) => !memberIds.has(object.blockfolkLayerId)); remaining.splice(insertAt, 0, ...selected); this.reorderObjects(remaining);
  }

  moveMembersToEdge(memberIds, direction) {
    const groups = this.objectGroups(); const index = groups.findIndex((group) => group.some((object) => memberIds.has(object.blockfolkLayerId)));
    if (index < 0) return;
    const selected = groups[index]; groups.splice(index, 1);
    if (direction < 0) groups.unshift(selected); else groups.push(selected);
    this.reorderObjects(groups.flat());
  }

  async resizeSelected(factor) {
    const active = this.activeSticker(); if (!active) return;
    const before = this.snapshot();
    const memberIds = this.selectedMemberIds(active); const members = this.objectsForMemberIds(memberIds); const center = this.assemblyCenter(members);
    const followers = isSnappableAsset(active.blockfolkAssetId) ? this.attachmentFollowersForHosts(memberIds).map(({ child, host }) => ({
      child, host, childLeft: Number(child.left || 0), childTop: Number(child.top || 0), childScaleX: Number(child.scaleX || 1), childScaleY: Number(child.scaleY || 1),
      hostLeft: Number(host.left || 0), hostTop: Number(host.top || 0), hostScaleX: Number(host.scaleX || 1)
    })) : [];
    for (const member of members) {
      const resized = resizeSticker({ scaleX: member.scaleX, scaleY: member.scaleY }, factor); const applied = resized.scaleX / Math.max(.0001, Number(member.scaleX || 1));
      member.set({ left: center.x + (Number(member.left || 0) - center.x) * applied, top: center.y + (Number(member.top || 0) - center.y) * applied, scaleX: resized.scaleX, scaleY: resized.scaleY }); this.clampFabricObject(member); member.setCoords();
    }
    for (const follower of followers) {
      const applied = Number(follower.host.scaleX || 1) / Math.max(.0001, follower.hostScaleX);
      follower.child.set({
        left: Number(follower.host.left || 0) + (follower.childLeft - follower.hostLeft) * applied,
        top: Number(follower.host.top || 0) + (follower.childTop - follower.hostTop) * applied,
        scaleX: follower.childScaleX * applied,
        scaleY: follower.childScaleY * applied
      });
      follower.child.setCoords();
    }
    this.canvas.requestRenderAll(); this.commit(before, members.length > 1 ? (factor > 1 ? 'Assembly made bigger.' : 'Assembly made smaller.') : (factor > 1 ? 'Sticker made bigger.' : 'Sticker made smaller.')); this.feedback('turn');
  }

  async turnSelected() {
    const active = this.activeSticker(); if (!active) return;
    if (hasAssembly(this.current?.connections || [], active.blockfolkLayerId)) return;
    const before = this.snapshot(); const members = this.objectsForMemberIds(this.selectedMemberIds(active)); const center = this.assemblyCenter(members);
    for (const member of members) { const turned = rotateSticker({ angle: member.angle || 0 }, 15); const dx = Number(member.left || 0) - center.x; const dy = Number(member.top || 0) - center.y; const radians = Math.PI / 12; member.set({ left: center.x + dx * Math.cos(radians) - dy * Math.sin(radians), top: center.y + dx * Math.sin(radians) + dy * Math.cos(radians), angle: turned.angle }); member.setCoords(); }
    this.canvas.requestRenderAll(); this.commit(before, members.length > 1 ? 'Assembly turned.' : 'Sticker turned.'); this.feedback('turn');
  }

  async flipSelected() {
    const active = this.activeSticker(); if (!active) return;
    const before = this.snapshot(); const memberIds = this.selectedMemberIds(active); const members = this.objectsForMemberIds(memberIds); const center = this.assemblyCenter(members);
    const followers = isSnappableAsset(active.blockfolkAssetId) ? this.attachmentFollowersForHosts(memberIds).map(({ child }) => child) : [];
    for (const member of [...members, ...followers]) { const flipped = flipSticker({ flipX: !!member.flipX }); member.set({ left: center.x - (Number(member.left || 0) - center.x), flipX: flipped.flipX, angle: (180 - Number(member.angle || 0) + 360) % 360 }); member.setCoords(); }
    this.canonicalizeConstructionAssembly(memberIds); this.placeAttachmentsAfterHosts(memberIds);
    this.canvas.requestRenderAll(); this.commit(before, members.length > 1 ? 'Assembly flipped.' : 'Sticker flipped.'); this.feedback('turn');
  }

  async moveSelectedDepth(direction) {
    const active = this.activeSticker(); if (!active) return;
    const memberIds = this.selectedMemberIds(active); const groups = this.objectGroups(); const index = groups.findIndex((group) => group.some((object) => memberIds.has(object.blockfolkLayerId))); const target = index + (direction < 0 ? -1 : 1);
    if (index < 0 || target < 0 || target >= groups.length) { this.toast(direction < 0 ? 'Already at back' : 'Already at front'); this.announce(direction < 0 ? 'Already at back.' : 'Already at front.'); this.updateSelection(); return; }
    const before = this.snapshot(); [groups[index], groups[target]] = [groups[target], groups[index]]; this.reorderObjects(groups.flat()); this.canvas.setActiveObject(active); active.setCoords(); this.canvas.requestRenderAll();
    this.commit(before, direction < 0 ? 'Moved behind.' : 'Moved in front.'); this.toast(direction < 0 ? 'Moved behind' : 'Moved in front'); this.feedback('turn');
  }

  async copySelected() {
    const active = this.activeSticker(); if (!active) return;
    const before = this.snapshot(); const members = this.objectsForMemberIds(this.selectedMemberIds(active)); const idMap = new Map(); let selectedClone = null;
    for (const member of members) {
      const clone = await member.clone(); const layerId = createStableId('blockfolk-sticker'); idMap.set(member.blockfolkLayerId, layerId);
      clone.set({ left: (member.left || 0) + 110, top: (member.top || 0) + 110, blockfolkLayerId: layerId, blockfolkAssetId: member.blockfolkAssetId, blockfolkSourceEmoji: member.blockfolkSourceEmoji || null, selectable: false, hasControls: false, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true });
      this.clampFabricObject(clone); this.canvas.add(clone); if (member === active) selectedClone = clone;
    }
    this.current.connections = [...(this.current.connections || []), ...duplicateConnections(this.current.connections || [], idMap)]; this.canvas.setActiveObject(selectedClone); this.canvas.requestRenderAll();
    this.canonicalizeConstructionAssembly(new Set(idMap.values()));
    this.commit(before, members.length > 1 ? 'Assembly copied.' : 'Sticker copied.'); this.feedback('pop');
  }

  async trashSelected() {
    const active = this.activeSticker(); if (!active) return;
    const before = this.snapshot(); const memberIds = this.selectedMemberIds(active); for (const object of this.objectsForMemberIds(memberIds)) this.canvas.remove(object); this.current.connections = (this.current.connections || []).filter((connection) => !memberIds.has(connection.aLayerId) && !memberIds.has(connection.bLayerId)); this.pruneWindowAttachments(); this.canvas.discardActiveObject(); this.canvas.requestRenderAll();
    this.commit(before, memberIds.size > 1 ? 'Assembly put in the trash.' : 'Sticker put in the trash.'); this.feedback('trash');
  }

  async unsnapSelected() {
    const active = this.activeSticker(); if (!active || !hasAssembly(this.current?.connections || [], active.blockfolkLayerId)) return;
    const before = this.snapshot(); this.current.connections = removeMemberConnections(this.current.connections || [], active.blockfolkLayerId); this.canvas.requestRenderAll(); this.commit(before, 'Sticker detached from its assembly.'); this.toast('Sticker detached.'); this.feedback('turn');
  }

  clampFabricObject(object) {
    if (!object) return;
    const clamped = clampStickerPosition({ x: Number(object.left || 0), y: Number(object.top || 0) }, object.getScaledWidth(), object.getScaledHeight());
    object.set({ left: clamped.x, top: clamped.y }); object.setCoords();
  }

  commit(before, announcement) {
    if (this.legacySession) {
      this.current.page.camera = normalizeCamera(this.camera);
      this.legacySession.camera = normalizeCamera(this.camera);
      this.announce(announcement); this.updateSelection();
      return;
    }
    this.syncCurrentFromCanvas();
    const after = JSON.stringify(this.current);
    if (JSON.stringify(before) !== after) this.history.push(before);
    this.current.updatedAt = new Date().toISOString();
    this.scheduleAutosave(); this.announce(announcement); this.updateSelection();
  }

  async undo() {
    if (this.legacySession) return;
    const selectedLayerId = this.activeSticker()?.blockfolkLayerId || null;
    const current = this.snapshot(); const prior = this.history.undo(current); if (!prior) return;
    this.current = prior; await this.renderCurrentPicture(selectedLayerId); this.pruneWindowAttachments(); this.syncWindowAttachmentsFromMap(); this.scheduleAutosave(); this.announce('Undid the last change.');
  }

  async redo() {
    if (this.legacySession) return;
    const selectedLayerId = this.activeSticker()?.blockfolkLayerId || null;
    const current = this.snapshot(); const next = this.history.redo(current); if (!next) return;
    this.current = next; await this.renderCurrentPicture(selectedLayerId); this.pruneWindowAttachments(); this.syncWindowAttachmentsFromMap(); this.scheduleAutosave(); this.announce('Redid the change.');
  }

  updateSelection() {
    const active = this.activeSticker();
    this.elements.selection.hidden = !active;
    if (!active) this.elements.selectionMore.hidden = true;
    this.elements.empty.hidden = this.canvas.getObjects().length > 0;
    const smaller = this.elements.selection.querySelector('[data-action="smaller"]');
    const bigger = this.elements.selection.querySelector('[data-action="bigger"]');
    const snapContext = this.elements.selection.querySelector('[data-action="snap-context"]');
    const flip = this.elements.selection.querySelector('[data-action="flip"]');
    const behind = this.elements.selection.querySelector('[data-action="behind"]');
    const inFront = this.elements.selection.querySelector('[data-action="in-front"]');
    const copy = this.elements.selection.querySelector('[data-action="copy"]');
    const trash = this.elements.selection.querySelector('[data-action="trash"]');
    const showMore = this.elements.selection.querySelector('[data-action="show-selection-more"]');
    const turn = this.elements.selectionMore.querySelector('[data-action="turn"]');
    const memberIds = this.selectedMemberIds(active); const groups = this.objectGroups(); const activeIndex = groups.findIndex((group) => group.some((object) => memberIds.has(object.blockfolkLayerId)));
    const assembled = hasAssembly(this.current?.connections || [], active?.blockfolkLayerId);
    if (this.legacySession) {
      for (const control of [...this.elements.selection.querySelectorAll('[data-action]'), ...this.elements.selectionMore.querySelectorAll('[data-action]')]) this.controls.setEnabled(control, false);
      return;
    }
    if (smaller) this.controls.setEnabled(smaller, !!active && active.scaleX > MIN_SCALE + .001);
    if (bigger) this.controls.setEnabled(bigger, !!active && active.scaleX < MAX_SCALE - .001);
    if (snapContext) this.applySnapContextControl(snapContext, this.resolveSnapContext(active));
    if (flip) this.controls.setEnabled(flip, !!active);
    if (copy) this.controls.setEnabled(copy, !!active);
    if (trash) this.controls.setEnabled(trash, !!active);
    if (showMore) this.controls.setEnabled(showMore, !!active);
    if (turn) this.controls.setEnabled(turn, !!active && !assembled);
    if (behind) this.controls.setEnabled(behind, !!active && activeIndex > 0);
    if (inFront) this.controls.setEnabled(inFront, !!active && activeIndex >= 0 && activeIndex < groups.length - 1);
  }

  scheduleAutosave() {
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
    if (this.legacySession) { this.elements.saveStatus.textContent = 'Read-only'; return; }
    const policy = autosavePolicy(this.preferences.autosaveMode);
    this.elements.saveStatus.textContent = policy.pendingLabel;
    if (policy.delayMs === null) return;
    this.autosaveTimer = setTimeout(() => this.saveCurrent({ quiet: true }).catch((error) => this.handleError(error)), policy.delayMs);
  }

  async saveCurrent({ quiet = false } = {}) {
    if (!this.current) return;
    if (this.legacySession) { clearTimeout(this.autosaveTimer); this.autosaveTimer = null; this.elements.saveStatus.textContent = 'Read-only'; return false; }
    clearTimeout(this.autosaveTimer); this.syncCurrentFromCanvas();
    this.current.updatedAt = new Date().toISOString();
    const active = this.activeSticker(); this.canvas.discardActiveObject(); this.canvas.requestRenderAll();
    this.current.thumbnail = this.canvas.toDataURL({ format: 'png', multiplier: .18, enableRetinaScaling: false });
    if (active) this.canvas.setActiveObject(active);
    await this.storage.putPicture(this.current);
    this.elements.saveStatus.textContent = 'Saved!';
    if (!quiet) { this.announce('Picture saved!'); this.feedback('save'); }
    return true;
  }

  async donePicture() { if (!this.legacySession) await this.saveCurrent(); await this.showGallery(); }

  exportDataUrl() {
    const active = this.activeSticker(); this.canvas.discardActiveObject(); this.canvas.requestRenderAll();
    const dataUrl = this.canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1, enableRetinaScaling: false });
    if (active) this.canvas.setActiveObject(active);
    this.canvas.requestRenderAll(); return dataUrl;
  }

  async downloadCurrent() {
    if (!this.current) return;
    const blob = dataUrlToBlob(this.exportDataUrl()); downloadBlob(blob, `blockfolk-imaginarium-${safeFilename(this.current.title)}.png`);
    this.toast('Picture downloaded!');
  }

  async shareCurrent() {
    if (!this.current) return;
    const blob = dataUrlToBlob(this.exportDataUrl()); const file = new File([blob], `blockfolk-imaginarium-${safeFilename(this.current.title)}.png`, { type: 'image/png' });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try { await navigator.share({ title: this.current.title, files: [file] }); return; } catch (error) { if (error.name === 'AbortError') return; }
    }
    downloadBlob(blob, file.name); this.toast('Sharing was not available, so the PNG was downloaded.');
  }

  async showGallery() {
    if (this.current) await this.saveCurrent({ quiet: true });
    const pictures = await this.storage.listPictures();
    this.elements.gallery.replaceChildren(...pictures.map((picture) => this.createGalleryCard(picture)));
    this.elements.galleryEmpty.hidden = pictures.length > 0;
    this.elements.galleryNote.hidden = pictures.length < GALLERY_LIMIT - 2;
    this.elements.galleryNote.textContent = pictures.length >= GALLERY_LIMIT ? 'Your sticker book is full. Download or delete a picture to make room.' : `You have ${GALLERY_LIMIT - pictures.length} picture spaces left.`;
    this.showScreen('gallery-screen');
  }

  createGalleryCard(picture) {
    const readOnly = ReadOnlyLegacySession.capabilitiesFor(picture)?.contentMutation === false;
    const card = document.createElement('article'); card.className = 'gallery-card-item';
    const image = picture.thumbnail ? document.createElement('img') : document.createElement('div'); image.className = 'gallery-thumb';
    if (picture.thumbnail) { image.alt = picture.title; image.src = picture.thumbnail; } else { image.classList.add('gallery-thumb-empty'); image.setAttribute('aria-label', `${picture.title}, empty page`); }
    const body = document.createElement('div'); body.className = 'gallery-card-body';
    const input = document.createElement('input'); input.className = 'gallery-title-input'; input.value = picture.title; input.maxLength = 48; input.dataset.pictureTitle = picture.id; input.setAttribute('aria-label', `Title for ${picture.title}`);
    if (readOnly) { input.disabled = true; input.title = 'Older pictures cannot be renamed in read-only mode.'; }
    const date = document.createElement('p'); date.className = 'gallery-date'; date.textContent = readOnly ? `Older picture · read-only · ${formatDate(picture.updatedAt)}` : `Last made ${formatDate(picture.updatedAt)}`;
    const actions = document.createElement('div'); actions.className = 'gallery-card-actions';
    for (const [action, label, className] of [['edit', 'Edit', 'edit'], ['puzzle', 'Make Puzzle', 'puzzle'], ['download', 'Download', ''], ['share', 'Share', ''], ['duplicate', 'Duplicate', ''], ['delete', 'Delete', 'delete']]) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.galleryAction = action; button.dataset.pictureId = picture.id; button.className = className; button.textContent = readOnly && action === 'edit' ? 'View' : label;
      if (readOnly && !['edit', 'download', 'share'].includes(action)) { button.disabled = true; button.title = 'Unavailable for an older read-only picture.'; }
      actions.appendChild(button);
    }
    this.controls.upgradeWithin(actions);
    body.append(input, date, actions); card.append(image, body); return card;
  }

  async handleGalleryAction(action, pictureId) {
    if (action === 'edit') return this.openPicture(pictureId);
    const picture = await this.storage.getPicture(pictureId); if (!picture) return;
    if (ReadOnlyLegacySession.capabilitiesFor(picture)?.contentMutation === false) {
      if (!['download', 'share'].includes(action)) return;
      const restore = { current: this.current, legacySession: this.legacySession, camera: structuredClone(this.camera), category: this.category };
      const session = await ReadOnlyLegacySession.open(picture);
      this.legacySession = session; this.current = session.renderedPicture; this.category = migrateBuiltInCategory(this.current.ui?.category);
      await this.renderCurrentPicture();
      if (action === 'download') await this.downloadCurrent(); else await this.shareCurrent();
      this.current = restore.current; this.legacySession = restore.legacySession; this.camera = restore.camera; this.category = restore.category;
      if (this.current) await this.renderCurrentPicture(); else { this.canvas.clear(); this.canvas.requestRenderAll(); }
      return;
    }
    if (action === 'puzzle') return this.puzzle.openCreation(pictureId);
    if (action === 'duplicate') {
      const pictures = await this.storage.listPictures();
      if (pictures.length >= GALLERY_LIMIT) { this.toast('Your sticker book is full.'); return; }
      await this.storage.putPicture(duplicatePicture(picture)); this.toast('Picture copied!'); return this.showGallery();
    }
    if (action === 'delete') {
      if (await this.confirm(`Delete “${picture.title}”? This cannot be undone.`, 'Yes, delete')) { await this.storage.deletePicture(pictureId); if (this.current?.id === pictureId) { this.current = null; this.windowAttachments.clear(); } this.toast('Picture deleted.'); await this.showGallery(); }
      return;
    }
    const restore = this.current ? structuredClone(this.current) : null;
    this.current = normalizePicture(picture); await this.renderCurrentPicture();
    if (action === 'download') await this.downloadCurrent(); else await this.shareCurrent();
    this.current = restore; if (restore) await this.renderCurrentPicture();
  }

  async renamePicture(id, title) {
    const picture = await this.storage.getPicture(id); if (!picture) return;
    if (ReadOnlyLegacySession.capabilitiesFor(picture)?.rename === false) return false;
    picture.title = title.trim() || picture.title; picture.updatedAt = new Date().toISOString(); await this.storage.putPicture(picture);
    if (this.current?.id === id) this.current.title = picture.title;
    this.announce('Picture title saved.');
  }

  async flattenPictureForPuzzle(id) {
    const picture = await this.storage.getPicture(id); if (!picture) throw new Error('That creation could not be opened.');
    if (ReadOnlyLegacySession.capabilitiesFor(picture)?.puzzle === false) throw new Error('That older picture is read-only.');
    const restore = this.current ? structuredClone(this.current) : null;
    this.current = normalizePicture(picture); await this.renderCurrentPicture();
    const dataUrl = this.exportDataUrl(); const title = this.current.title;
    this.current = restore;
    if (restore) await this.renderCurrentPicture(); else { this.canvas.clear(); this.canvas.requestRenderAll(); }
    return { dataUrl, title };
  }

  showIdea() {
    this.elements.ideaText.textContent = CREATIVE_PROMPTS.length ? CREATIVE_PROMPTS[Math.floor(Math.random() * CREATIVE_PROMPTS.length)] : 'Add your own pictures and make a BlockFolk story.';
    this.elements.ideaCard.hidden = false;
  }

  openParentGate() { this.resetGate(); this.showScreen('parent-gate-screen'); }

  updateGate() {
    if (this.gateHeld.size === 2 && !this.gateTimer) {
      this.gateStart = performance.now();
      this.gateTimer = setInterval(() => {
        const elapsed = performance.now() - this.gateStart; const ratio = Math.min(1, elapsed / 3000);
        this.root.querySelector('.gate-stars').style.setProperty('--gate-progress', `${ratio * 100}%`);
        this.elements.gateCount.textContent = String(Math.max(0, Math.ceil(3 - elapsed / 1000)));
        if (ratio >= 1) this.openParentTools();
      }, 50);
    } else if (this.gateHeld.size < 2) this.resetGate(false);
  }

  resetGate(clearHeld = true) {
    clearInterval(this.gateTimer); this.gateTimer = null; this.gateStart = 0;
    if (clearHeld) { this.gateHeld.clear(); this.root.querySelectorAll('[data-gate-star]').forEach((button) => (button.closest('.sfhs-cf-root') || button).classList.remove('is-held')); }
    this.root.querySelector('.gate-stars')?.style.setProperty('--gate-progress', '0%');
    if (this.elements?.gateCount) this.elements.gateCount.textContent = '3';
  }

  async openParentTools() {
    this.resetGate(); this.renderPackList(); await this.refreshStorageSummary(); this.showScreen('parent-tools-screen');
  }

  async importPack(file) {
    if (!file) return;
    this.elements.importStatus.textContent = 'Opening sticker pack locally…';
    const choice = this.elements.importCategory.value;
    const customName = this.elements.customCategory.value.trim();
    if (choice === 'custom' && !customName) throw new Error('Give the new sticker category a name first.');
    const defaultCategory = choice === 'auto' ? null : choice === 'custom' ? safeId(customName, 'imported') : choice;
    const pack = await processStickerPack(file, { defaultCategory });
    await this.storage.putPack(pack); this.packs = await this.storage.listPacks();
    const categoryTitle = defaultCategory ? (choice === 'custom' ? customName : this.elements.importCategory.selectedOptions[0].textContent) : 'the pack categories';
    this.elements.importStatus.textContent = `${pack.assets.length} item${pack.assets.length === 1 ? '' : 's'} added from ${pack.title} in ${categoryTitle}.`;
    this.elements.importReport.replaceChildren(...pack.report.map((entry) => { const line = document.createElement('p'); line.textContent = `${entry.status.toUpperCase()} · ${entry.path} · ${entry.reason}`; return line; }));
    this.elements.importDetails.hidden = false; this.elements.packInput.value = '';
    this.category = defaultCategory || pack.assets.find((asset) => asset.kind === 'sticker')?.category || this.category;
    this.renderPackList(); this.renderLibrary(); await this.refreshStorageSummary(); this.toast('Sticker pack ready!');
  }

  renderPackList() {
    if (!this.elements?.packList) return;
    this.controls.destroyWithin(this.elements.packList);
    if (!this.packs.length) { const empty = document.createElement('p'); empty.textContent = 'No imported packs yet.'; this.elements.packList.replaceChildren(empty); return; }
    this.elements.packList.replaceChildren(...this.packs.map((pack) => {
      const item = document.createElement('div'); item.className = 'pack-item';
      const strong = document.createElement('strong'); strong.textContent = pack.title;
      const small = document.createElement('small'); const stickers = pack.assets.filter((asset) => asset.kind === 'sticker').length; const backgrounds = pack.assets.filter((asset) => asset.kind === 'background').length; const category = pack.importCategory ? ` · category ${pack.importCategory.replace(/[-_]+/g, ' ')}` : ''; small.textContent = `${pack.version} · ${pack.creator || 'Creator not listed'} · ${stickers} stickers · ${backgrounds} backgrounds${category}`;
      const button = document.createElement('button'); button.type = 'button'; button.dataset.removePack = pack.id; button.textContent = 'Remove'; item.append(strong, small, this.controls.upgradeButton(button, { family: 'tool', value: `remove-${pack.id}`, palette: 'trash' })); return item;
    }));
  }

  async removePack(packId) {
    const pack = this.packs.find((item) => item.id === packId); if (!pack) return;
    if (!(await this.confirm(`Remove “${pack.title}”? Saved pictures keep their used stickers.`, 'Remove pack'))) return;
    if (this.current) this.syncCurrentFromCanvas();
    await this.storage.deletePack(packId); this.packs = await this.storage.listPacks(); this.renderPackList(); this.renderLibrary(); await this.refreshStorageSummary(); this.toast('Pack removed. Saved pictures are safe.');
  }

  async refreshStorageSummary() {
    const usage = await this.storage.usageSummary();
    this.elements.storageSummary.textContent = `${usage.pictures} of ${GALLERY_LIMIT} pictures · ${usage.packs} imported packs · about ${(usage.bytes / 1024 / 1024).toFixed(1)} MiB · ${usage.mode === 'indexeddb' ? 'saved on this device' : 'temporary session storage'}`;
  }

  exportRecovery() {
    if (!this.current) { this.toast('Make or open a picture first.'); return; }
    if (this.legacySession) return;
    this.syncCurrentFromCanvas(); downloadBlob(new Blob([JSON.stringify(this.current, null, 2)], { type: 'application/json' }), `blockfolk-imaginarium-${safeFilename(this.current.title)}-recovery.json`);
  }

  async importRecovery(file) {
    if (!file) return;
    const value = JSON.parse(await file.text()); validatePicture(value); this.windowAttachments.clear(); this.current = normalizePicture(value); this.current.id = createStableId('blockfolk-picture'); this.current.updatedAt = new Date().toISOString();
    await this.storage.putPicture(this.current); await this.renderCurrentPicture(); this.restoreWindowAttachmentsFromCurrent(); this.history.clear(); this.elements.recoveryInput.value = ''; this.showScreen('editor-screen'); this.toast('Picture recovery opened.');
  }

  async clearData() {
    if (this.legacySession) return;
    const typed = prompt('Type CLEAR to erase all local BlockFolk Imaginarium pictures, packs, and settings.');
    if (typed !== 'CLEAR') { this.toast('Nothing was erased.'); return; }
    await this.storage.clearAll(); localStorage.removeItem(PREFERENCE_KEY); this.windowAttachments.clear(); this.current = null; this.packs = []; this.renderPackList(); this.renderLibrary(); this.toast('Local BlockFolk Imaginarium data cleared.'); await this.goHome();
  }

  updatePreference(name, value) { this.preferences[name] = value; savePreferences(this.preferences); this.applyPreferences(); this.updateSelection(); this.announce('Setting saved.'); }

  applyPreferences() {
    document.body.classList.toggle('reduced-motion', !!this.preferences.reducedMotion);
    for (const control of this.root.querySelectorAll('[data-action="toggle-sound"]')) this.controls?.setSelected(control, !!this.preferences.sound);
    this.controls?.setSelected(this.elements?.hapticsSetting, !!this.preferences.haptics);
    this.controls?.setSelected(this.elements?.motionSetting, !!this.preferences.reducedMotion);
    for (const control of this.root.querySelectorAll('[data-autosave-mode]')) this.controls?.setSelected(control, control.dataset.autosaveMode === this.preferences.autosaveMode);
    this.controls?.updatePreferences(this.preferences);
  }

  feedback(kind) {
    this.controls.playProductCue(kind);
  }

  confirm(message, acceptLabel) {
    this.elements.confirmMessage.textContent = message;
    this.controls.setVisibleLabel(this.elements.confirmSheet.querySelector('[data-action="accept-confirm"]'), acceptLabel);
    this.elements.confirmSheet.hidden = false;
    return new Promise((resolve) => { this.confirmResolver = resolve; });
  }

  resolveConfirm(value) {
    this.elements.confirmSheet.hidden = true;
    const resolver = this.confirmResolver; this.confirmResolver = null; resolver?.(value);
  }

  announce(message) { this.elements.live.textContent = ''; requestAnimationFrame(() => { this.elements.live.textContent = message; }); }

  toast(message) {
    clearTimeout(this.toastTimer); this.elements.toast.textContent = message; this.elements.toast.hidden = false;
    this.toastTimer = setTimeout(() => { this.elements.toast.hidden = true; }, 2600);
  }

  handleError(error) {
    console.warn('[BlockFolk Imaginarium]', error);
    const friendly = mapChildSafeError(error); this.toast(friendly); this.announce(friendly);
    this.controls?.playProductCue('error');
    if (this.elements.importStatus && !this.elements.parentTools.hidden) this.elements.importStatus.textContent = error.message || friendly;
  }

  diagnostics() {
    return {
      screen: SCREEN_IDS.find((id) => !this.root.querySelector(`#${id}`).hidden),
      pictureId: this.current?.id || null,
      stickers: this.canvas.getObjects().length,
      background: this.current?.page.backgroundAssetId || null,
      world: { size: WORLD_SIZE, camera: structuredClone(this.camera), viewport: { width: this.canvas.width, height: this.canvas.height }, activePointers: this.worldPointers.size },
      render: {
        retinaScale: this.canvas.getRetinaScaling?.() || 1,
        lowerBacking: { width: this.canvas.lowerCanvasEl?.width || 0, height: this.canvas.lowerCanvasEl?.height || 0 },
        upperBacking: { width: this.canvas.upperCanvasEl?.width || 0, height: this.canvas.upperCanvasEl?.height || 0 },
        backgroundNatural: { width: this.canvas.backgroundImage?._element?.naturalWidth || 0, height: this.canvas.backgroundImage?._element?.naturalHeight || 0 },
        imageSmoothingEnabled: this.canvas.contextContainer?.imageSmoothingEnabled ?? null,
        imageSmoothingQuality: this.canvas.contextContainer?.imageSmoothingQuality ?? null
      },
      storageMode: this.storage.mode,
      legacySession: this.legacySession ? { schema: this.legacySession.schema, pictureId: this.legacySession.originalIdentity.id, canonicalHash: this.legacySession.canonicalHash, capabilities: this.legacySession.capabilities } : null,
      controlFeedback: this.controls?.diagnostics() || null,
      puzzle: this.puzzle?.diagnostics() || null,
      externalRuntimeUrls: []
    };
  }
}
