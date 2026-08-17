export const DEFAULT_AUTOSAVE_MODE = 'relaxed';

export const AUTOSAVE_MODES = Object.freeze({
  quick: Object.freeze({ delayMs: 1000, pendingLabel: 'Saving soon...' }),
  relaxed: Object.freeze({ delayMs: 4000, pendingLabel: 'Saving later...' }),
  leaving: Object.freeze({ delayMs: null, pendingLabel: 'Saves when leaving' })
});

export function normalizeAutosaveMode(value) {
  return Object.hasOwn(AUTOSAVE_MODES, value) ? value : DEFAULT_AUTOSAVE_MODE;
}

export function autosavePolicy(value) {
  return AUTOSAVE_MODES[normalizeAutosaveMode(value)];
}
