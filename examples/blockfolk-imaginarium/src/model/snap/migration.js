const FAILED_DOORWAY_PORT_IDS = new Set([
  'doorJambLowerLeft', 'doorJambLowerRight', 'doorJambUpperLeft', 'doorJambUpperRight', 'doorLintel',
  'blockJambLowerLeft', 'blockJambLowerRight', 'blockJambUpperLeft', 'blockJambUpperRight', 'blockLintel',
  'backFace', 'frontFace'
]);

const DOOR_ASSET_IDS = new Set(['sticker-blockfolk-wood-door', 'sticker-blockfolk-stone-door']);

export function isFailedDoorwayLegacyConnection(connection) {
  if (!connection || Number.isFinite(connection.schemaVersion)) return false;
  const involvesDoor = DOOR_ASSET_IDS.has(connection.aAssetId) || DOOR_ASSET_IDS.has(connection.bAssetId);
  return involvesDoor && (FAILED_DOORWAY_PORT_IDS.has(connection.aAnchorId) || FAILED_DOORWAY_PORT_IDS.has(connection.bAnchorId));
}

export function migrateConnectionsForPage4(connections = []) {
  const quarantinedConnectionIds = [];
  const retained = [];
  for (const connection of connections || []) {
    if (isFailedDoorwayLegacyConnection(connection)) {
      if (typeof connection.id === 'string' && connection.id) quarantinedConnectionIds.push(connection.id);
      continue;
    }
    retained.push(connection);
  }
  return Object.freeze({
    connections: Object.freeze(retained.map((connection) => ({
      ...connection,
      ...(connection.relativeTransform ? { relativeTransform: { ...connection.relativeTransform } } : {})
    }))),
    quarantinedConnectionIds: Object.freeze(quarantinedConnectionIds)
  });
}

export function pictureMigrationNotice({ sourceSchema, quarantinedConnectionIds = [] } = {}) {
  if (!sourceSchema) return null;
  if (quarantinedConnectionIds.length) return 'Older doorway links were detached safely. Your stickers stayed in place.';
  return 'Older picture opened safely. It will update when you edit or save it.';
}
