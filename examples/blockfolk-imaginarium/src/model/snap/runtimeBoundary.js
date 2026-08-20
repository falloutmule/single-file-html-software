import { ASSET_CONSTRUCTION_PROFILES } from './assetProfiles.js';
import { SNAP_CONNECTION_SCHEMA_VERSION, SNAP_PROFILE_SCHEMA_VERSION } from './policy.js';

// Phase 1 is intentionally observable without becoming authoritative. The
// existing page@3 model remains the production path until a calibrated pilot
// explicitly changes this boundary.
export const SNAP_CORE_RUNTIME_BOUNDARY = Object.freeze({
  productionEngine: 'page@3-compatibility',
  typedCoreAvailable: true,
  typedProfileSchemaVersion: SNAP_PROFILE_SCHEMA_VERSION,
  typedConnectionSchemaVersion: SNAP_CONNECTION_SCHEMA_VERSION,
  productionEnabledTypedProfiles: Object.values(ASSET_CONSTRUCTION_PROFILES).filter((profile) => profile.productionEnabled).length
});
