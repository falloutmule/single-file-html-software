import { connectedComponentLayerIds } from './connectionGraph.js';
import { constructionScaleMultiplier, sourceArtPointToWorld } from './coordinateTransforms.js';
import { objectAssetId, objectLayerId, transformedPort } from './portModel.js';
import { BLOCK_PILOT_CALIBRATION, DOORWAY_FRAME_BLOCK_ASSET_IDS } from './blockProfiles.js';
import { DOORWAY_RESERVED_CELLS, DOORWAY_SLOT_CELLS } from './doorProfiles.js';
import { PROVISIONAL_SNAP_POLICY, SNAP_CONNECTION_SCHEMA_VERSION } from './policy.js';

function positionOf(object) {
  return { x: Number(object?.x ?? object?.left ?? 0), y: Number(object?.y ?? object?.top ?? 0) };
}

function movedObject(object, movingLayerIds, delta) {
  if (!movingLayerIds.has(objectLayerId(object))) return { ...object };
  const position = positionOf(object);
  if (Object.hasOwn(object, 'x') || Object.hasOwn(object, 'y')) return { ...object, x: position.x + delta.x, y: position.y + delta.y };
  return { ...object, left: position.x + delta.x, top: position.y + delta.y };
}

function sourcePointAtCell(profile, cell) {
  const column = {
    x: BLOCK_PILOT_CALIBRATION.plane.columnWorld.x / profile.canonicalInsertScale,
    y: BLOCK_PILOT_CALIBRATION.plane.columnWorld.y / profile.canonicalInsertScale
  };
  const tier = {
    x: BLOCK_PILOT_CALIBRATION.plane.tierWorld.x / profile.canonicalInsertScale,
    y: BLOCK_PILOT_CALIBRATION.plane.tierWorld.y / profile.canonicalInsertScale
  };
  return {
    x: profile.constructionOrigin.x + column.x * cell.column + tier.x * cell.tier,
    y: profile.constructionOrigin.y + column.y * cell.column + tier.y * cell.tier
  };
}

function frameCellPorts(objects, profiles) {
  return objects.filter((object) => DOORWAY_FRAME_BLOCK_ASSET_IDS.includes(objectAssetId(object))).map((object) => {
    const profile = profiles[objectAssetId(object)]; const port = profile?.ports?.find((item) => item.id === 'cellMount');
    const transformed = port && transformedPort(profile, object, port);
    return transformed ? { object, port: transformed } : null;
  }).filter(Boolean);
}

function nearestUnusedSlotMember(slotPort, members, usedLayerIds, tolerance) {
  return members.map((member) => ({
    member,
    distance: Math.hypot(member.port.worldPoint.x - slotPort.worldPoint.x, member.port.worldPoint.y - slotPort.worldPoint.y)
  })).filter(({ member, distance }) => !usedLayerIds.has(objectLayerId(member.object)) && distance <= tolerance)
    .sort((first, second) => first.distance - second.distance || objectLayerId(first.member.object).localeCompare(objectLayerId(second.member.object)))[0] || null;
}

export function evaluateDoorwayForDoor({ door, objects = [], connections = [], profiles = {}, policy = PROVISIONAL_SNAP_POLICY }) {
  const doorLayerId = objectLayerId(door); const doorProfile = profiles[objectAssetId(door)];
  if (!doorLayerId || doorProfile?.formationKind !== 'doorway-1x2') return null;
  const componentIds = connectedComponentLayerIds(connections, doorLayerId);
  if (componentIds.size < 2) return null;
  const componentObjects = objects.filter((object) => componentIds.has(objectLayerId(object)));
  const blockPorts = frameCellPorts(componentObjects, profiles);
  const multiplier = constructionScaleMultiplier(doorProfile, door);
  const tolerance = policy.formationCellAlignmentEpsilonWorld * Math.max(multiplier, Number.EPSILON);
  const occupiedRequiredSlots = []; const slotMembers = {}; const usedLayerIds = new Set();
  for (const slotId of Object.keys(DOORWAY_SLOT_CELLS)) {
    const slot = doorProfile.ports.find((port) => port.id === slotId); const slotPort = slot && transformedPort(doorProfile, door, slot);
    if (!slotPort) continue;
    const match = nearestUnusedSlotMember(slotPort, blockPorts, usedLayerIds, tolerance);
    if (!match) continue;
    const layerId = objectLayerId(match.member.object); usedLayerIds.add(layerId); occupiedRequiredSlots.push(slotId); slotMembers[slotId] = layerId;
  }
  const reservedViolations = [];
  for (const cell of DOORWAY_RESERVED_CELLS) {
    const worldPoint = sourceArtPointToWorld(doorProfile, door, sourcePointAtCell(doorProfile, cell));
    for (const member of blockPorts) {
      const distance = Math.hypot(member.port.worldPoint.x - worldPoint.x, member.port.worldPoint.y - worldPoint.y);
      if (distance <= tolerance) reservedViolations.push(objectLayerId(member.object));
    }
  }
  const materials = new Set(Object.values(slotMembers).map((layerId) => objectAssetId(componentObjects.find((object) => objectLayerId(object) === layerId))));
  const allSlots = occupiedRequiredSlots.length === Object.keys(DOORWAY_SLOT_CELLS).length;
  const mixedPolicyPending = allSlots && materials.size > 1 && policy.mixedDoorwayCompletion === null;
  const materialAllowed = materials.size <= 1 || policy.mixedDoorwayCompletion === true;
  const complete = allSlots && reservedViolations.length === 0 && materialAllowed;
  return Object.freeze({
    formationId: `doorway:${doorLayerId}`, anchorLayerId: doorLayerId, kind: 'doorway-1x2',
    status: complete ? 'complete' : 'partial', occupiedRequiredSlots: Object.freeze(occupiedRequiredSlots),
    slotMembers: Object.freeze({ ...slotMembers }), totalRequiredSlots: 5,
    reservedViolations: Object.freeze([...new Set(reservedViolations)].sort()), mixedPolicyPending,
    materialAssetIds: Object.freeze([...materials].sort()), componentLayerIds: Object.freeze([...componentIds].sort())
  });
}

export function evaluateDoorwayFormations({ objects = [], connections = [], profiles = {}, policy = PROVISIONAL_SNAP_POLICY }) {
  return objects.filter((object) => profiles[objectAssetId(object)]?.formationKind === 'doorway-1x2')
    .map((door) => evaluateDoorwayForDoor({ door, objects, connections, profiles, policy })).filter(Boolean);
}

export function doorwayReservedSpaceValidator({ objects = [], connections = [], movingLayerIds = new Set(), profiles = {}, policy = PROVISIONAL_SNAP_POLICY }) {
  return (proposal) => {
    const moved = objects.map((object) => movedObject(object, movingLayerIds, proposal.worldDelta));
    const hypothetical = {
      id: '__doorway-reserved-preview__', schemaVersion: SNAP_CONNECTION_SCHEMA_VERSION,
      aLayerId: proposal.movingPort.layerId, aAssetId: proposal.movingPort.assetId, aPortId: proposal.movingPort.portId,
      bLayerId: proposal.targetPort.layerId, bAssetId: proposal.targetPort.assetId, bPortId: proposal.targetPort.portId,
      plane: proposal.plane, relativeTransform: { dx: 0, dy: 0, scale: 1, orientation: 'default', flipped: false }
    };
    return evaluateDoorwayFormations({ objects: moved, connections: [...connections, hypothetical], profiles, policy })
      .every((formation) => formation.reservedViolations.length === 0);
  };
}

export function doorwayFeedback(formations = []) {
  const complete = formations.find((formation) => formation.status === 'complete');
  if (complete) return Object.freeze({ toast: 'Doorway complete', announcement: 'Doorway complete. All five frame pieces are connected.' });
  const partial = [...formations].sort((first, second) => second.occupiedRequiredSlots.length - first.occupiedRequiredSlots.length)[0];
  if (!partial) return null;
  if (partial.mixedPolicyPending && partial.occupiedRequiredSlots.length === 5) return Object.freeze({ toast: 'Doorway 5 of 5', announcement: 'Five doorway frame pieces are connected. Mixed-material completion is not enabled.' });
  const count = partial.occupiedRequiredSlots.length;
  return Object.freeze({ toast: `Doorway ${count} of 5`, announcement: `Doorway ${count} of 5 frame pieces connected.` });
}
