/**
 * save.js — LocalStorage save/load/export/import
 */

const STORAGE_PREFIX = 'sfs_save_';

/**
 * Load save data from a named slot.
 * Returns parsed object or null if not found / corrupt.
 */
export function loadSave(slot) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + slot);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[save] Failed to load slot "${slot}":`, e);
    return null;
  }
}

/**
 * Write save data to a named slot.
 * Only serialises own enumerable properties (plain object).
 * Returns true on success, false on failure.
 */
export function writeSave(slot, data) {
  try {
    // Serialise only plain-data-safe subset
    const plain = JSON.parse(JSON.stringify(data));
    localStorage.setItem(STORAGE_PREFIX + slot, JSON.stringify(plain));
    return true;
  } catch (e) {
    console.warn(`[save] Failed to write slot "${slot}":`, e);
    return false;
  }
}

/**
 * Export save data as a JSON string (for download / sharing).
 * Returns JSON string or null if slot is empty.
 */
export function exportSave(slot) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + slot);
    return raw; // already JSON
  } catch (e) {
    console.warn(`[save] Failed to export slot "${slot}":`, e);
    return null;
  }
}

/**
 * Import save data from a JSON string.
 * Validates that it parses to a plain object before writing.
 * Returns true on success, false on failure.
 */
export function importSave(slot, json) {
  try {
    const parsed = JSON.parse(json);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn(`[save] Import data for "${slot}" is not a plain object.`);
      return false;
    }
    return writeSave(slot, parsed);
  } catch (e) {
    console.warn(`[save] Failed to import slot "${slot}":`, e);
    return false;
  }
}
