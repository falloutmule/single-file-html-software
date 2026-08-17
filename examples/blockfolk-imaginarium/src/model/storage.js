/* global CustomEvent, EventTarget, TextEncoder, indexedDB, localStorage, structuredClone */
export const DB_NAME = 'blockfolk-imaginarium-library-v1';
export const PREFERENCE_KEY = 'blockfolk-imaginarium.preferences@1';

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Device storage request failed.'));
  });
}

export class BlockFolkImaginariumStorage extends EventTarget {
  constructor() {
    super();
    this.db = null;
    this.memoryPictures = new Map();
    this.memoryPacks = new Map();
    this.memoryPuzzle = null;
    this.mode = 'indexeddb';
  }

  async init() {
    if (!globalThis.indexedDB) { this.mode = 'memory'; return this; }
    try {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('pictures')) db.createObjectStore('pictures', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('packs')) db.createObjectStore('packs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('puzzles')) db.createObjectStore('puzzles', { keyPath: 'id' });
      };
      this.db = await requestResult(request);
      this.db.onversionchange = () => this.db.close();
    } catch (error) {
      this.mode = 'memory';
      this.dispatchEvent(new CustomEvent('storagewarning', { detail: { error } }));
    }
    return this;
  }

  async transaction(storeName, mode, action) {
    if (!this.db) throw new Error('Device storage is unavailable.');
    const transaction = this.db.transaction(storeName, mode);
    const result = await action(transaction.objectStore(storeName));
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Device storage transaction failed.'));
      transaction.onabort = () => reject(transaction.error || new Error('Device storage transaction stopped.'));
    });
    return result;
  }

  async putPicture(picture) {
    const clone = structuredClone(picture);
    if (!this.db) { this.memoryPictures.set(clone.id, clone); return clone; }
    await this.transaction('pictures', 'readwrite', (store) => requestResult(store.put(clone)));
    return clone;
  }

  async getPicture(id) {
    if (!this.db) return structuredClone(this.memoryPictures.get(id) || null);
    const result = await this.transaction('pictures', 'readonly', (store) => requestResult(store.get(id)));
    return result ? structuredClone(result) : null;
  }

  async listPictures() {
    const values = this.db ? await this.transaction('pictures', 'readonly', (store) => requestResult(store.getAll())) : [...this.memoryPictures.values()];
    return values.map((value) => structuredClone(value)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  async deletePicture(id) {
    if (!this.db) { this.memoryPictures.delete(id); return; }
    await this.transaction('pictures', 'readwrite', (store) => requestResult(store.delete(id)));
  }

  async putPack(pack) {
    const clone = structuredClone(pack);
    if (!this.db) { this.memoryPacks.set(clone.id, clone); return clone; }
    await this.transaction('packs', 'readwrite', (store) => requestResult(store.put(clone)));
    return clone;
  }

  async listPacks() {
    const values = this.db ? await this.transaction('packs', 'readonly', (store) => requestResult(store.getAll())) : [...this.memoryPacks.values()];
    return values.map((value) => structuredClone(value)).sort((a, b) => String(a.title).localeCompare(String(b.title)));
  }

  async deletePack(id) {
    if (!this.db) { this.memoryPacks.delete(id); return; }
    await this.transaction('packs', 'readwrite', (store) => requestResult(store.delete(id)));
  }

  async putPuzzle(puzzle) {
    const clone = structuredClone(puzzle);
    if (!this.db) { this.memoryPuzzle = clone; return clone; }
    await this.transaction('puzzles', 'readwrite', (store) => requestResult(store.put(clone)));
    return clone;
  }

  async getPuzzle() {
    if (!this.db) return structuredClone(this.memoryPuzzle);
    const result = await this.transaction('puzzles', 'readonly', (store) => requestResult(store.get('current')));
    return result ? structuredClone(result) : null;
  }

  async deletePuzzle() {
    if (!this.db) { this.memoryPuzzle = null; return; }
    await this.transaction('puzzles', 'readwrite', (store) => requestResult(store.delete('current')));
  }

  async clearAll() {
    if (!this.db) { this.memoryPictures.clear(); this.memoryPacks.clear(); this.memoryPuzzle = null; return; }
    await this.transaction('pictures', 'readwrite', (store) => requestResult(store.clear()));
    await this.transaction('packs', 'readwrite', (store) => requestResult(store.clear()));
    await this.transaction('puzzles', 'readwrite', (store) => requestResult(store.clear()));
  }

  async usageSummary() {
    const [pictures, packs, puzzle] = await Promise.all([this.listPictures(), this.listPacks(), this.getPuzzle()]);
    const bytes = new TextEncoder().encode(JSON.stringify({ pictures, packs, puzzle })).byteLength;
    return { pictures: pictures.length, packs: packs.length, puzzle: !!puzzle, bytes, mode: this.mode };
  }
}

export function loadPreferences() {
  try { return JSON.parse(localStorage.getItem(PREFERENCE_KEY) || '{}'); } catch { return {}; }
}

export function savePreferences(preferences) {
  try { localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences)); return true; } catch { return false; }
}
