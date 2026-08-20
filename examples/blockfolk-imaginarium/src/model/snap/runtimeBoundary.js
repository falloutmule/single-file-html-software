import { ASSET_CONSTRUCTION_PROFILES } from './assetProfiles.js';
import { SNAP_CONNECTION_SCHEMA_VERSION, SNAP_PROFILE_SCHEMA_VERSION } from './policy.js';

// Typed building v1 owns all ten blocks, both doors, and both windows. Legacy
// page@3 readers remain
// isolated in the page migration path rather than candidate generation.
export const SNAP_CORE_RUNTIME_BOUNDARY = Object.freeze({
  productionEngine: 'typed-building-v1+versioned-legacy-reader',
  typedCoreAvailable: true,
  typedProfileSchemaVersion: SNAP_PROFILE_SCHEMA_VERSION,
  typedConnectionSchemaVersion: SNAP_CONNECTION_SCHEMA_VERSION,
  productionEnabledTypedProfiles: Object.values(ASSET_CONSTRUCTION_PROFILES).filter((profile) => profile.productionEnabled).length
});
