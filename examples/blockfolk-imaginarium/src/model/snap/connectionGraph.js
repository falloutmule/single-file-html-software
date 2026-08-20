import { SNAP_CONNECTION_SCHEMA_VERSION } from './policy.js';
import { objectAssetId, objectLayerId, portEndpointKey } from './portModel.js';
import { resolveConstructionPlane } from './coordinateTransforms.js';

function asLayerMap(layers) {
  if (layers instanceof Map) return layers;
  if (Array.isArray(layers)) return new Map(layers.map((layer) => [objectLayerId(layer), layer]));
  return new Map(Object.entries(layers || {}));
}

function portFor(profiles, assetId, portId) {
  return profiles?.[assetId]?.ports?.find((port) => port.id === portId) || null;
}

function finiteRelativeTransform(transform) {
  return Number.isFinite(transform?.dx) && Number.isFinite(transform?.dy) && Number.isFinite(transform?.scale)
    && typeof transform?.orientation === 'string' && typeof transform?.flipped === 'boolean';
}

export function layerPairKey(first, second) {
  return [first, second].sort().join('::');
}

export function endpointPairKey(connection) {
  return [
    portEndpointKey(connection.aLayerId, connection.aPortId),
    portEndpointKey(connection.bLayerId, connection.bPortId)
  ].sort().join('<->');
}

export function buildAdjacency(connections = [], layerIds = []) {
  const adjacency = new Map([...layerIds].map((layerId) => [layerId, new Set()]));
  for (const connection of connections || []) {
    if (!adjacency.has(connection.aLayerId)) adjacency.set(connection.aLayerId, new Set());
    if (!adjacency.has(connection.bLayerId)) adjacency.set(connection.bLayerId, new Set());
    adjacency.get(connection.aLayerId).add(connection.bLayerId);
    adjacency.get(connection.bLayerId).add(connection.aLayerId);
  }
  return adjacency;
}

export function connectedComponentLayerIds(connections = [], seedLayerId) {
  if (!seedLayerId) return new Set();
  const adjacency = buildAdjacency(connections, [seedLayerId]);
  const visited = new Set([seedLayerId]); const queue = [seedLayerId];
  while (queue.length) {
    const layerId = queue.shift();
    for (const neighbor of adjacency.get(layerId) || []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor); queue.push(neighbor);
    }
  }
  return visited;
}

export function connectedComponents(connections = [], layerIds = []) {
  const remaining = new Set(layerIds); const components = [];
  while (remaining.size) {
    const seed = remaining.values().next().value;
    const component = connectedComponentLayerIds(connections, seed);
    for (const layerId of component) remaining.delete(layerId);
    components.push(component);
  }
  return components;
}

export function removeIncidentConnections(connections = [], selectedLayerId) {
  return connections.filter((connection) => connection.aLayerId !== selectedLayerId && connection.bLayerId !== selectedLayerId);
}

export function cloneInternalConnections(connections = [], layerIdMap, idFactory) {
  if (!(layerIdMap instanceof Map) || typeof idFactory !== 'function') return [];
  return connections.filter((connection) => layerIdMap.has(connection.aLayerId) && layerIdMap.has(connection.bLayerId)).map((connection) => ({
    ...connection,
    id: idFactory('blockfolk-snap-connection'),
    aLayerId: layerIdMap.get(connection.aLayerId),
    bLayerId: layerIdMap.get(connection.bLayerId),
    relativeTransform: { ...connection.relativeTransform }
  }));
}

export function validateConnectionGraph({ connections = [], layers = [], profiles = {} }) {
  const layerMap = asLayerMap(layers); const errors = []; const valid = [];
  const ids = new Set(); const endpointPairs = new Set(); const layerPairs = new Set(); const occupancy = new Map();
  for (const connection of connections || []) {
    const prefix = connection?.id || '<missing-id>';
    if (!connection || connection.schemaVersion !== SNAP_CONNECTION_SCHEMA_VERSION) { errors.push(`${prefix}:schema`); continue; }
    if (typeof connection.id !== 'string' || !connection.id || ids.has(connection.id)) { errors.push(`${prefix}:id`); continue; }
    ids.add(connection.id);
    if (!connection.aLayerId || !connection.bLayerId || connection.aLayerId === connection.bLayerId) { errors.push(`${prefix}:layers`); continue; }
    const aLayer = layerMap.get(connection.aLayerId); const bLayer = layerMap.get(connection.bLayerId);
    if (!aLayer || !bLayer) { errors.push(`${prefix}:missing-layer`); continue; }
    if (objectAssetId(aLayer) !== connection.aAssetId || objectAssetId(bLayer) !== connection.bAssetId) { errors.push(`${prefix}:asset`); continue; }
    const aProfile = profiles[connection.aAssetId]; const bProfile = profiles[connection.bAssetId];
    const aPort = portFor(profiles, connection.aAssetId, connection.aPortId); const bPort = portFor(profiles, connection.bAssetId, connection.bPortId);
    if (!aPort || !bPort) { errors.push(`${prefix}:port`); continue; }
    if (!aPort.compatibleTypes.includes(bPort.type) || !bPort.compatibleTypes.includes(aPort.type)) { errors.push(`${prefix}:type`); continue; }
    if (resolveConstructionPlane(aProfile, aPort, aLayer) !== connection.plane || resolveConstructionPlane(bProfile, bPort, bLayer) !== connection.plane) { errors.push(`${prefix}:plane`); continue; }
    if (!finiteRelativeTransform(connection.relativeTransform)) { errors.push(`${prefix}:transform`); continue; }
    const endpoints = endpointPairKey(connection); const layersKey = layerPairKey(connection.aLayerId, connection.bLayerId);
    if (endpointPairs.has(endpoints) || layerPairs.has(layersKey)) { errors.push(`${prefix}:duplicate-pair`); continue; }
    const aKey = portEndpointKey(connection.aLayerId, connection.aPortId); const bKey = portEndpointKey(connection.bLayerId, connection.bPortId);
    const nextA = (occupancy.get(aKey) || 0) + 1; const nextB = (occupancy.get(bKey) || 0) + 1;
    if (nextA > aPort.capacity || nextB > bPort.capacity) { errors.push(`${prefix}:capacity`); continue; }
    endpointPairs.add(endpoints); layerPairs.add(layersKey); occupancy.set(aKey, nextA); occupancy.set(bKey, nextB); valid.push({ ...connection, relativeTransform: { ...connection.relativeTransform } });
  }
  return { valid: errors.length === 0, connections: valid, errors };
}
