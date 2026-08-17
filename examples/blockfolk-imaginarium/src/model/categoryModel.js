export const BUILT_IN_CATEGORY_IDS = Object.freeze(['animals', 'people', 'building', 'nature', 'magic', 'emoji']);

const LEGACY_CATEGORY_MIGRATIONS = Object.freeze({ things: 'building', silly: 'magic', words: 'emoji' });

export function migrateBuiltInCategory(value, fallback = 'animals') {
  const migrated = LEGACY_CATEGORY_MIGRATIONS[value] || value;
  return BUILT_IN_CATEGORY_IDS.includes(migrated) ? migrated : fallback;
}

export function migrateAssetCategory(value) {
  return LEGACY_CATEGORY_MIGRATIONS[value] || value || 'imported';
}
