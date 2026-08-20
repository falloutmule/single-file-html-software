import { constructionScaleMultiplier, localNormalToWorld, resolveConstructionPlane, sourceArtPointToWorld, supportedObjectOrientation, worldPointToViewport } from './coordinateTransforms.js';

export function objectLayerId(object) {
  return object?.layerId || object?.blockfolkLayerId || null;
}

export function objectAssetId(object) {
  return object?.assetId || object?.blockfolkAssetId || null;
}

export function portEndpointKey(layerId, portId) {
  return `${layerId}::${portId}`;
}

export function connectionEndpointOccupancy(connections = []) {
  const occupancy = new Map();
  for (const connection of connections || []) {
    for (const [layerId, portId] of [[connection.aLayerId, connection.aPortId], [connection.bLayerId, connection.bPortId]]) {
      if (!layerId || !portId) continue;
      const key = portEndpointKey(layerId, portId);
      occupancy.set(key, (occupancy.get(key) || 0) + 1);
    }
  }
  return occupancy;
}

export function transformedPort(profile, object, port, viewportTransform = [1, 0, 0, 1, 0, 0]) {
  const layerId = objectLayerId(object); const assetId = objectAssetId(object);
  if (!profile || !object || !port || !layerId || !assetId) return null;
  const worldPoint = sourceArtPointToWorld(profile, object, port.localPoint);
  const worldNormal = localNormalToWorld(object, port.localNormal);
  if (!worldPoint || !worldNormal) return null;
  return Object.freeze({
    layerId,
    assetId,
    profileVersion: profile.version,
    portId: port.id,
    type: port.type,
    compatibleTypes: Object.freeze([...(port.compatibleTypes || [])]),
    role: port.role,
    capacity: port.capacity,
    priority: Number.isFinite(port.priority) ? port.priority : 100,
    plane: resolveConstructionPlane(profile, port, object),
    worldPoint,
    viewportPoint: worldPointToViewport(worldPoint, viewportTransform),
    worldNormal,
    scaleClass: profile.canonicalScaleClass,
    scaleMultiplier: constructionScaleMultiplier(profile, object),
    orientationSupported: supportedObjectOrientation(profile, object),
    orientationId: object.orientationId || 'default'
  });
}

export function transformedPortsForObject({ object, profile, viewportTransform, connections = [], includeAtCapacity = false }) {
  if (!profile?.productionEnabled || !Array.isArray(profile.ports)) return [];
  const occupancy = connectionEndpointOccupancy(connections);
  return profile.ports.map((port) => transformedPort(profile, object, port, viewportTransform)).filter((port) => {
    if (!port) return false;
    return includeAtCapacity || (occupancy.get(portEndpointKey(port.layerId, port.portId)) || 0) < port.capacity;
  });
}

export function transformedPortsForObjects({ objects = [], profiles = {}, viewportTransform, connections = [], includeAtCapacity = false }) {
  return objects.flatMap((object) => transformedPortsForObject({
    object,
    profile: profiles[objectAssetId(object)],
    viewportTransform,
    connections,
    includeAtCapacity
  }));
}
