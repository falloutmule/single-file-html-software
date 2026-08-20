import { ASSET_CONSTRUCTION_PROFILES } from './assetProfiles.js';
import { SNAP_CONNECTION_SCHEMA_VERSION, SNAP_PROFILE_SCHEMA_VERSION } from './policy.js';

// Phase 3 enables only the calibrated Brick/Log pilot. Every other construction
// asset remains on the page@3 compatibility path; doors and formations stay
// disabled until their later physical-review phases.
export const SNAP_CORE_RUNTIME_BOUNDARY = Object.freeze({
  productionEngine: 'typed-brick-log-pilot+page@3-compatibility',
  typedCoreAvailable: true,
  typedProfileSchemaVersion: SNAP_PROFILE_SCHEMA_VERSION,
  typedConnectionSchemaVersion: SNAP_CONNECTION_SCHEMA_VERSION,
  productionEnabledTypedProfiles: Object.values(ASSET_CONSTRUCTION_PROFILES).filter((profile) => profile.productionEnabled).length
});
