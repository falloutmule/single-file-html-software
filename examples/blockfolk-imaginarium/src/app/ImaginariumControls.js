/* global HTMLButtonElement, HTMLInputElement, document, navigator, window */
import { controlPresetSchema } from '@sfhs/control-feedback-contract';
import { mountDomControl } from '@sfhs/control-feedback-dom';
import { createWebAudioCueTransport } from '@sfhs/control-feedback-audio-web';
import { createWebHapticTransport } from '@sfhs/control-feedback-haptics-web';
import { findControlFeedbackPreset } from '@sfhs/control-feedback-presets';

const px = (value) => Object.freeze({ value, unit: 'px' });

const tactileReference = findControlFeedbackPreset('uv-hover-lift-pill');
if (!tactileReference) throw new Error('The SFHS hover-lift tactile reference is unavailable.');

const referenceSurface = tactileReference.visuals.base.layers?.find((layer) => layer.role === 'surface');
const referencePressedSurface = tactileReference.visuals.pressedInside?.layers?.find((layer) => layer.role === 'surface');
const REFERENCE_PRESS_TRAVEL = referencePressedSurface?.transform?.translateY?.value || 4;
const REFERENCE_EASING = referenceSurface?.transition?.easing || 'ease-out';

const FAMILY = Object.freeze({
  big: Object.freeze({ depth: Math.max(6, REFERENCE_PRESS_TRAVEL + 2), travel: Math.max(5, REFERENCE_PRESS_TRAVEL + 1), selected: 2, pressMs: 55, releaseMs: 150, overshoot: 0.08, radius: 18, border: 3 }),
  tool: Object.freeze({ depth: 3, travel: 3, selected: 1, pressMs: 42, releaseMs: 95, overshoot: 0.03, radius: 14, border: 2 }),
  choice: Object.freeze({ depth: 5, travel: 4, selected: 2, pressMs: 48, releaseMs: 115, overshoot: 0.04, radius: 15, border: 2 })
});

const PALETTES = Object.freeze({
  cream: Object.freeze({ surface: '#FFFDF7', depth: '#CDBFD3', edge: '#FFFFFF', ink: '#34304B' }),
  sky: Object.freeze({ surface: '#85CCE4', depth: '#4B96B1', edge: '#E2F8FF', ink: '#34304B' }),
  lavender: Object.freeze({ surface: '#EDE2F8', depth: '#A88BC5', edge: '#FFF8FF', ink: '#34304B' }),
  purple: Object.freeze({ surface: '#7550AE', depth: '#4E2F79', edge: '#BDA6DE', ink: '#FFFFFF' }),
  yellow: Object.freeze({ surface: '#FFD27A', depth: '#D39A38', edge: '#FFF1BE', ink: '#34304B' }),
  mint: Object.freeze({ surface: '#8ED5C0', depth: '#4F9B86', edge: '#DFFFF5', ink: '#34304B' }),
  pink: Object.freeze({ surface: '#EF9BB9', depth: '#B85F80', edge: '#FFE1EC', ink: '#34304B' }),
  lilac: Object.freeze({ surface: '#B7A0DC', depth: '#8065AE', edge: '#E8DAFF', ink: '#34304B' }),
  peach: Object.freeze({ surface: '#FFC797', depth: '#C97C56', edge: '#FFE7D2', ink: '#34304B' }),
  danger: Object.freeze({ surface: '#B9495A', depth: '#7D2B39', edge: '#F2AAB5', ink: '#FFFFFF' }),
  trash: Object.freeze({ surface: '#FFE4E8', depth: '#CB8A95', edge: '#FFFFFF', ink: '#8D3040' })
});

function normalizeHex(value) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(String(value || '').trim());
  if (!match) return '#EDE2F8';
  let hex = match[1];
  if (hex.length === 3) hex = [...hex].map((character) => character.repeat(2)).join('');
  return `#${hex.slice(0, 6).toUpperCase()}`;
}

function shiftHex(value, amount) {
  const hex = normalizeHex(value).slice(1);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const shifted = channels.map((channel) => Math.round(amount >= 0 ? channel + ((255 - channel) * amount) : channel * (1 + amount)));
  return `#${shifted.map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function opaque(value) { return `${normalizeHex(value)}FF`; }

function readableInk(surface) {
  const hex = normalizeHex(surface).slice(1);
  const [red, green, blue] = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return ((red * 299) + (green * 587) + (blue * 114)) / 1000 < 126 ? '#FFFFFF' : '#34304B';
}

function paletteFromSurface(surface, ink) {
  const normalized = normalizeHex(surface);
  return Object.freeze({ surface: normalized, depth: shiftHex(normalized, -0.3), edge: shiftHex(normalized, 0.42), ink: ink || readableInk(normalized) });
}

function resolvePalette(palette) {
  if (typeof palette !== 'string') return palette;
  return PALETTES[palette] || paletteFromSurface(palette);
}

function transition(durationMs, overshoot = 0) {
  return Object.freeze({ durationMs, easing: REFERENCE_EASING, ...(overshoot ? { overshoot } : {}) });
}

function surfaceLayer(palette, settings, shape, transform, durationMs, overshoot = 0, opacity) {
  const radius = shape === 'round-rect' ? settings.radius : 999;
  return Object.freeze({
    role: 'surface',
    shape,
    fill: opaque(palette.surface),
    border: Object.freeze({ width: px(settings.border), color: opaque(palette.edge), radius: px(radius) }),
    shadows: Object.freeze([{ x: px(0), y: px(2), blur: px(0), spread: px(0), color: '#FFFFFF66', inset: true }]),
    ...(transform ? { transform: Object.freeze(transform) } : {}),
    ...(opacity === undefined ? {} : { opacity }),
    transition: transition(durationMs, overshoot)
  });
}

function depthLayer(palette, settings, shape, opacity = 1) {
  const radius = shape === 'round-rect' ? settings.radius : 999;
  return Object.freeze({
    role: 'depth',
    shape,
    fill: opaque(palette.depth),
    border: Object.freeze({ width: px(settings.border), color: opaque(shiftHex(palette.depth, -0.12)), radius: px(radius) }),
    transform: Object.freeze({ translateY: px(settings.depth) }),
    opacity
  });
}

function safeToken(value) {
  return String(value || 'control').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || 'control';
}

export function createBlockFolkControlPreset({ family = 'tool', palette = PALETTES.cream, shape = 'round-rect', semantic = { kind: 'momentary' }, value = 'control' } = {}) {
  const settings = FAMILY[family] || FAMILY.tool;
  const resolvedPalette = resolvePalette(palette);
  const base = Object.freeze([
    depthLayer(resolvedPalette, settings, shape),
    surfaceLayer(resolvedPalette, settings, shape, undefined, settings.releaseMs, settings.overshoot)
  ]);
  const pressed = Object.freeze([
    depthLayer(resolvedPalette, settings, shape),
    surfaceLayer(resolvedPalette, settings, shape, { translateY: px(settings.travel), scaleX: family === 'big' ? 0.99 : 0.995, scaleY: family === 'big' ? 0.965 : 0.98 }, settings.pressMs)
  ]);
  const visuals = {
    base: Object.freeze({ layers: base }),
    pressedInside: Object.freeze({ layers: pressed }),
    pressedOutside: Object.freeze({ layers: base }),
    focus: Object.freeze({ layers: Object.freeze([{ role: 'focus', shape, border: { width: px(3), color: '#1F79BFFF', radius: px(shape === 'round-rect' ? settings.radius + 3 : 999) } }]) }),
    disabled: Object.freeze({ layers: Object.freeze([depthLayer(resolvedPalette, settings, shape, 0.32), surfaceLayer(resolvedPalette, settings, shape, undefined, 0, 0, 0.45)]), effects: Object.freeze([]) }),
    reducedMotion: Object.freeze({ effects: Object.freeze([]) }),
    status: Object.freeze({
      success: Object.freeze({ layers: Object.freeze([depthLayer(paletteFromSurface('#69C394'), settings, shape), surfaceLayer(paletteFromSurface('#8EDBB2'), settings, shape, undefined, 80)]) }),
      error: Object.freeze({ layers: Object.freeze([depthLayer(PALETTES.danger, settings, shape), surfaceLayer(PALETTES.danger, settings, shape, undefined, 80)]) })
    })
  };
  if (semantic.kind !== 'momentary') {
    visuals.selected = Object.freeze({ layers: Object.freeze([
      depthLayer(resolvedPalette, settings, shape),
      surfaceLayer(resolvedPalette, settings, shape, { translateY: px(settings.selected) }, settings.releaseMs),
      Object.freeze({ role: 'edge', shape, border: { width: px(3), color: opaque(shiftHex(resolvedPalette.depth, -0.25)), radius: px(shape === 'round-rect' ? settings.radius + 1 : 999) }, transform: { translateY: px(settings.selected) }, transition: transition(settings.releaseMs) })
    ]) });
  }
  if (family !== 'choice') {
    visuals.hover = Object.freeze({ layers: Object.freeze([
      depthLayer(resolvedPalette, settings, shape),
      surfaceLayer(resolvedPalette, settings, shape, { translateY: px(-1) }, settings.releaseMs, settings.overshoot)
    ]) });
  }
  return Object.freeze({
    schema: controlPresetSchema,
    id: `blockfolk-imaginarium-${safeToken(family)}-${safeToken(semantic.kind)}-${safeToken(value)}`,
    title: `BlockFolk Imaginarium ${family} control`,
    semantic: Object.freeze(semantic),
    visuals: Object.freeze(visuals),
    cues: Object.freeze({
      press: family === 'big' || family === 'choice' ? 'plastic-click' : 'soft-click',
      activate: 'toggle-on',
      success: 'success',
      error: 'error'
    }),
    provenance: Object.freeze({ origin: 'sfhs-original' })
  });
}

function visibleLabel(button) {
  const explicit = button.getAttribute('aria-label');
  if (explicit) return explicit;
  const clone = button.cloneNode(true);
  clone.querySelectorAll('[aria-hidden="true"]').forEach((element) => element.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim() || 'Button';
}

export function shouldPlayControlCue(cue) { return cue?.role === 'press' || cue?.role === 'activate'; }
export function shouldPlayProductCue(kind) { return kind === 'save' || kind === 'error'; }

function inferredPalette(button, family) {
  const explicit = button.dataset.controlTone;
  if (explicit && PALETTES[explicit]) return PALETTES[explicit];
  const categoryColor = button.style.getPropertyValue('--category-color');
  if (categoryColor) return paletteFromSurface(categoryColor);
  if (button.classList.contains('make-card') || button.classList.contains('surprise-sticker') || button.classList.contains('gate-star')) return PALETTES.yellow;
  if (button.classList.contains('gallery-card')) return PALETTES.mint;
  if (button.classList.contains('surprise-card')) return PALETTES.pink;
  if (button.classList.contains('grown-card')) return PALETTES.lilac;
  if (button.classList.contains('danger-button')) return PALETTES.danger;
  if (button.classList.contains('trash') || button.classList.contains('delete')) return PALETTES.trash;
  if (button.classList.contains('done-button') || button.classList.contains('primary-button') || button.classList.contains('continue-button') || button.classList.contains('edit')) return PALETTES.purple;
  if (button.classList.contains('category-tab')) return PALETTES.lavender;
  return family === 'big' ? PALETTES.peach : PALETTES.cream;
}

function inferControlOptions(button) {
  const isCategory = button.dataset.category !== undefined;
  const isAutosave = button.dataset.autosaveMode !== undefined;
  const isPuzzleDifficulty = button.dataset.puzzleDifficulty !== undefined;
  const action = button.dataset.action;
  let family = button.dataset.controlFamily;
  if (!family) {
    if (isCategory || isAutosave || isPuzzleDifficulty) family = 'choice';
    else if (button.classList.contains('home-card') || button.classList.contains('primary-button') || button.classList.contains('done-button') || button.classList.contains('continue-button') || button.classList.contains('danger-button') || button.classList.contains('gate-star')) family = 'big';
    else family = 'tool';
  }
  const shape = button.classList.contains('gate-star') ? 'circle' : button.classList.contains('category-tab') || button.classList.contains('pill-button') || button.classList.contains('continue-button') ? 'capsule' : 'round-rect';
  let semantic = { kind: 'momentary' };
  let selected = false;
  let value = action || button.dataset.stickerId || button.dataset.galleryAction || button.dataset.gateStar || 'control';
  if (isCategory) {
    value = button.dataset.category;
    semantic = { kind: 'choice', groupId: 'blockfolk-imaginarium-sticker-category', value };
    selected = button.getAttribute('aria-selected') === 'true';
  } else if (isAutosave) {
    value = button.dataset.autosaveMode;
    semantic = { kind: 'choice', groupId: 'blockfolk-imaginarium-autosave-mode', value };
    selected = button.getAttribute('aria-pressed') === 'true';
  } else if (isPuzzleDifficulty) {
    value = button.dataset.puzzleDifficulty;
    semantic = { kind: 'choice', groupId: 'blockfolk-imaginarium-puzzle-difficulty', value };
    selected = button.getAttribute('aria-pressed') === 'true';
  } else if (action === 'toggle-sound') {
    semantic = { kind: 'toggle', variant: 'checkbox' };
    selected = button.getAttribute('aria-pressed') === 'true';
  }
  return { family, shape, semantic, selected, value, palette: inferredPalette(button, family) };
}

export class BlockFolkImaginariumControls {
  constructor({ root, onActivate, preferences }) {
    this.root = root;
    this.onActivate = onActivate;
    this.preferences = { ...preferences };
    this.controllers = new Set();
    this.byElement = new WeakMap();
    this.nextControlId = 1;
    this.activationCount = 0;
    this.audio = createWebAudioCueTransport({ window, config: { muted: !this.preferences.sound, masterVolume: 0.42, voiceLimit: 10, pitchVarianceCents: 22, seed: 20260811 } });
    this.haptics = createWebHapticTransport({ navigator, enabled: !!this.preferences.haptics });
    this.unlockPromise = null;
    this.handleTrustedGesture = (event) => {
      if (!this.preferences.sound) return;
      this.unlockPromise = this.audio.unlockFromGesture(event).catch(() => false);
    };
    document.addEventListener('pointerdown', this.handleTrustedGesture, { capture: true, passive: true });
    document.addEventListener('keydown', this.handleTrustedGesture, { capture: true });
  }

  upgradeButton(button, overrides = {}) {
    if (!(button instanceof HTMLButtonElement) || button.classList.contains('sfhs-cf-interactive')) return button;
    const inferred = inferControlOptions(button);
    const options = { ...inferred, ...overrides };
    options.palette = resolvePalette(options.palette);
    const label = visibleLabel(button);
    const preset = createBlockFolkControlPreset(options);
    const mount = document.createElement('span');
    let record;
    const controller = mountDomControl({
      container: mount,
      controlId: `blockfolk-imaginarium-${safeToken(options.value)}-${this.nextControlId++}`,
      preset,
      label,
      enabled: !button.disabled,
      selected: !!options.selected,
      reducedMotion: !!this.preferences.reducedMotion,
      onActivate: (proposal) => {
        this.activationCount += 1;
        Promise.resolve(this.onActivate?.(record.interactive, proposal)).catch(() => {});
      },
      onCue: (cue) => this.playControlCue(cue, options.family)
    });
    const root = controller.root;
    const interactive = controller.interactive;
    const content = root.querySelector('.sfhs-cf-content');
    root.classList.add(...button.classList, 'imaginarium-control', `control-family-${options.family}`);
    root.dataset.controlFamily = options.family;
    root.style.cssText += button.style.cssText;
    root.style.setProperty('--control-ink', options.palette.ink);
    root.style.setProperty('--control-press-travel', `${FAMILY[options.family]?.travel || FAMILY.tool.travel}px`);
    root.style.setProperty('--control-selected-depth', `${FAMILY[options.family]?.selected || 1}px`);
    if (button.id) root.id = button.id;
    root.hidden = button.hidden;
    for (const attribute of [...button.attributes]) {
      if (attribute.name.startsWith('data-')) interactive.setAttribute(attribute.name, attribute.value);
      if (attribute.name === 'title' || attribute.name === 'aria-describedby') interactive.setAttribute(attribute.name, attribute.value);
    }
    if (button.dataset.name) root.dataset.name = button.dataset.name;
    content.replaceChildren(...button.childNodes);
    content.classList.add('imaginarium-control-content');
    const stopClick = (event) => event.stopPropagation();
    interactive.addEventListener('click', stopClick);
    record = { controller, root, interactive, content, family: options.family, stopClick };
    this.controllers.add(record);
    this.byElement.set(root, record);
    this.byElement.set(interactive, record);
    button.replaceWith(root);
    return root;
  }

  upgradeSwitch(row, input, overrides = {}) {
    if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox' || !row) return row;
    const options = {
      family: 'choice',
      shape: 'capsule',
      semantic: { kind: 'toggle', variant: 'checkbox' },
      selected: input.checked,
      value: input.dataset.action || input.id || 'setting',
      palette: 'lavender',
      ...overrides
    };
    options.palette = resolvePalette(options.palette);
    const label = visibleLabel(row);
    const preset = createBlockFolkControlPreset(options);
    const mount = document.createElement('span');
    let record;
    const controller = mountDomControl({
      container: mount,
      controlId: `blockfolk-imaginarium-${safeToken(options.value)}-${this.nextControlId++}`,
      preset,
      label,
      enabled: !input.disabled,
      selected: !!options.selected,
      reducedMotion: !!this.preferences.reducedMotion,
      onActivate: (proposal) => {
        this.activationCount += 1;
        Promise.resolve(this.onActivate?.(record.interactive, proposal)).catch(() => {});
      },
      onCue: (cue) => this.playControlCue(cue, options.family)
    });
    const root = controller.root;
    const interactive = controller.interactive;
    const content = root.querySelector('.sfhs-cf-content');
    root.classList.add(...row.classList, 'imaginarium-control', 'control-family-choice');
    root.dataset.controlFamily = 'choice';
    root.style.setProperty('--control-ink', options.palette.ink);
    root.style.setProperty('--control-press-travel', `${FAMILY.choice.travel}px`);
    root.style.setProperty('--control-selected-depth', `${FAMILY.choice.selected}px`);
    if (input.id) interactive.id = input.id;
    for (const attribute of [...input.attributes]) {
      if (attribute.name.startsWith('data-')) interactive.setAttribute(attribute.name, attribute.value);
      if (attribute.name === 'title' || attribute.name === 'aria-describedby') interactive.setAttribute(attribute.name, attribute.value);
    }
    const labelNode = row.querySelector('span') || document.createElement('span');
    const state = document.createElement('span');
    state.className = 'switch-state';
    state.setAttribute('aria-hidden', 'true');
    state.textContent = '✓';
    content.replaceChildren(labelNode, state);
    content.classList.add('imaginarium-control-content');
    const stopClick = (event) => event.stopPropagation();
    interactive.addEventListener('click', stopClick);
    record = { controller, root, interactive, content, family: 'choice', stopClick };
    this.controllers.add(record);
    this.byElement.set(root, record);
    this.byElement.set(interactive, record);
    row.replaceWith(root);
    return root;
  }

  upgradeWithin(scope, resolver) {
    return [...scope.querySelectorAll('button:not(.sfhs-cf-interactive)')].map((button) => this.upgradeButton(button, resolver?.(button) || {}));
  }

  recordFor(target) {
    if (!target) return null;
    const direct = this.byElement.get(target);
    if (direct) return direct;
    const root = target.closest?.('.sfhs-cf-root');
    return root ? this.byElement.get(root) || null : null;
  }

  setEnabled(target, enabled) { this.recordFor(target)?.controller.setModel({ enabled: !!enabled }); }
  setSelected(target, selected) { this.recordFor(target)?.controller.setModel({ selected: !!selected }); }
  setStatus(target, status) { this.recordFor(target)?.controller.setModel({ status }); }

  setContextState(target, { state, icon, label, ariaLabel, title }) {
    const record = this.recordFor(target);
    if (!record) return;
    const iconNode = document.createElement('span');
    iconNode.setAttribute('aria-hidden', 'true');
    iconNode.textContent = icon;
    record.content.replaceChildren(iconNode, document.createTextNode(label));
    record.root.dataset.contextState = state;
    record.interactive.setAttribute('aria-label', ariaLabel);
    record.interactive.setAttribute('title', title || ariaLabel);
  }

  setVisibleLabel(target, label) {
    const record = this.recordFor(target);
    if (!record) return;
    record.content.textContent = label;
    record.interactive.setAttribute('aria-label', label);
  }

  updatePreferences(preferences) {
    this.preferences = { ...this.preferences, ...preferences };
    this.audio.updateConfig({ muted: !this.preferences.sound });
    this.haptics.setEnabled(!!this.preferences.haptics);
    for (const record of this.controllers) record.controller.setReducedMotion(!!this.preferences.reducedMotion);
  }

  playControlCue(cue, family) {
    if (!shouldPlayControlCue(cue)) return;
    if (this.preferences.sound) {
      const result = this.audio.playCue(cue);
      if (!result.played && result.reason === 'locked' && this.unlockPromise) this.unlockPromise.then((unlocked) => { if (unlocked && this.preferences.sound) this.audio.playCue(cue); }).catch(() => {});
    }
    if (this.preferences.haptics && cue.role === 'press') {
      const cueId = family === 'big' ? 'firm-press' : family === 'choice' ? 'toggle' : 'subtle-tick';
      this.haptics.playCue({ role: cue.role, cueId });
    }
  }

  playProductCue(kind) {
    if (!shouldPlayProductCue(kind)) return;
    const cue = kind === 'save'
      ? { role: 'success', cueId: 'success' }
      : { role: 'error', cueId: 'error' };
    if (this.preferences.sound) this.audio.playCue(cue);
    if (this.preferences.haptics) this.haptics.playCue({ role: cue.role, cueId: cue.role === 'success' ? 'success' : cue.role === 'error' ? 'error' : 'subtle-tick' });
  }

  playPuzzleCue(kind) {
    const cue = kind === 'complete' ? { role: 'success', cueId: 'success' }
      : kind === 'snap' ? { role: 'select-on', cueId: 'toggle-on' }
        : { role: 'press', cueId: 'soft-click' };
    if (this.preferences.sound) this.audio.playCue(cue);
    if (this.preferences.haptics) this.haptics.playCue({ role: cue.role, cueId: kind === 'complete' ? 'success' : kind === 'snap' ? 'toggle' : 'subtle-tick' });
  }

  destroyWithin(scope) {
    for (const record of [...this.controllers]) {
      if (record.root !== scope && !scope.contains(record.root)) continue;
      record.interactive.removeEventListener('click', record.stopClick);
      record.controller.destroy();
      this.controllers.delete(record);
    }
  }

  destroy() {
    this.destroyWithin(this.root);
    document.removeEventListener('pointerdown', this.handleTrustedGesture, { capture: true });
    document.removeEventListener('keydown', this.handleTrustedGesture, { capture: true });
    this.audio.dispose();
    this.haptics.dispose();
  }

  diagnostics() {
    return { controls: this.controllers.size, activations: this.activationCount, audio: this.audio.getDiagnostics(), hapticsSupported: this.haptics.supported };
  }
}
