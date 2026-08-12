import RAPIER from "#rapier2d-backend";

export const packageIdentity = "@sfhs/physics-2d" as const;
export const physics2DBackend = "rapier2d" as const;

export interface Physics2DVector {
  readonly x: number;
  readonly y: number;
}

export type Physics2DBodyType = "dynamic" | "fixed";

export type Physics2DColliderShape =
  | { readonly kind: "box"; readonly halfWidth: number; readonly halfHeight: number }
  | { readonly kind: "circle"; readonly radius: number };

export interface Physics2DColliderDefinition {
  readonly shape: Physics2DColliderShape;
  readonly density?: number;
  readonly friction?: number;
  readonly restitution?: number;
  readonly sensor?: boolean;
}

export interface Physics2DBodyDefinition {
  readonly id: string;
  readonly type: Physics2DBodyType;
  readonly position: Physics2DVector;
  readonly rotation?: number;
  readonly linearVelocity?: Physics2DVector;
  readonly angularVelocity?: number;
  readonly linearDamping?: number;
  readonly angularDamping?: number;
  readonly ccd?: boolean;
  readonly collider: Physics2DColliderDefinition;
}

export interface Physics2DBodyState {
  readonly id: string;
  readonly type: Physics2DBodyType;
  readonly position: Physics2DVector;
  readonly rotation: number;
  readonly linearVelocity: Physics2DVector;
  readonly angularVelocity: number;
}

export interface Physics2DCollisionEvent {
  readonly bodyA: string;
  readonly bodyB: string;
  readonly started: boolean;
}

export interface Physics2DSnapshot {
  readonly step: number;
  readonly bodies: readonly Physics2DBodyState[];
}

export interface Physics2DStepResult extends Physics2DSnapshot {
  readonly collisions: readonly Physics2DCollisionEvent[];
}

export interface CreatePhysics2DWorldOptions {
  readonly gravity: Physics2DVector;
  readonly timestepSeconds?: number;
}

export type Physics2DErrorCode =
  | "SFHS_PHYSICS_BODY_DUPLICATE"
  | "SFHS_PHYSICS_BODY_MISSING"
  | "SFHS_PHYSICS_INPUT_INVALID"
  | "SFHS_PHYSICS_WORLD_DESTROYED";

export class Physics2DError extends Error {
  readonly code: Physics2DErrorCode;

  constructor(code: Physics2DErrorCode, message: string) {
    super(message);
    this.name = "Physics2DError";
    this.code = code;
  }
}

let backendInitialization: Promise<void> | undefined;

async function initializeBackend(): Promise<void> {
  const initialize = (RAPIER as typeof RAPIER & { init?: () => Promise<void> }).init;
  if (initialize !== undefined) {
    backendInitialization ??= initialize();
    await backendInitialization;
  }
}

export interface Physics2DWorld {
  readonly backend: "rapier2d";
  readonly timestepSeconds: number;
  createBody(definition: Physics2DBodyDefinition): Physics2DBodyState;
  removeBody(id: string): boolean;
  getBody(id: string): Physics2DBodyState;
  snapshot(): Physics2DSnapshot;
  step(): Physics2DStepResult;
  setGravity(gravity: Physics2DVector): void;
  setBodyTransform(id: string, position: Physics2DVector, rotation: number): void;
  setBodyVelocity(id: string, linearVelocity: Physics2DVector, angularVelocity?: number): void;
  applyImpulse(id: string, impulse: Physics2DVector): void;
  destroy(): void;
}

interface RapierBodyRecord {
  readonly type: Physics2DBodyType;
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
}

const defaultTimestepSeconds = 1 / 60;
function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Physics2DError("SFHS_PHYSICS_INPUT_INVALID", `${label} must be finite.`);
  }
  return value;
}

function positive(value: number, label: string): number {
  finite(value, label);
  if (!(value > 0)) {
    throw new Physics2DError("SFHS_PHYSICS_INPUT_INVALID", `${label} must be greater than zero.`);
  }
  return value;
}

function nonNegative(value: number, label: string): number {
  finite(value, label);
  if (value < 0) {
    throw new Physics2DError("SFHS_PHYSICS_INPUT_INVALID", `${label} must not be negative.`);
  }
  return value;
}

function vector(value: Physics2DVector, label: string): Physics2DVector {
  return Object.freeze({ x: finite(value.x, `${label}.x`), y: finite(value.y, `${label}.y`) });
}

function bodyState(id: string, record: RapierBodyRecord): Physics2DBodyState {
  const position = record.body.translation();
  const linearVelocity = record.body.linvel();
  return Object.freeze({
    id,
    type: record.type,
    position: Object.freeze({ x: position.x, y: position.y }),
    rotation: record.body.rotation(),
    linearVelocity: Object.freeze({ x: linearVelocity.x, y: linearVelocity.y }),
    angularVelocity: record.body.angvel()
  });
}

function colliderDescription(definition: Physics2DColliderDefinition): RAPIER.ColliderDesc {
  const description = definition.shape.kind === "circle"
    ? RAPIER.ColliderDesc.ball(positive(definition.shape.radius, "collider.radius"))
    : RAPIER.ColliderDesc.cuboid(
        positive(definition.shape.halfWidth, "collider.halfWidth"),
        positive(definition.shape.halfHeight, "collider.halfHeight")
      );
  description.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  if (definition.density !== undefined) description.setDensity(nonNegative(definition.density, "collider.density"));
  if (definition.friction !== undefined) description.setFriction(nonNegative(definition.friction, "collider.friction"));
  if (definition.restitution !== undefined) description.setRestitution(nonNegative(definition.restitution, "collider.restitution"));
  if (definition.sensor === true) description.setSensor(true);
  return description;
}

class RapierPhysics2DWorld implements Physics2DWorld {
  readonly backend = physics2DBackend;
  readonly timestepSeconds: number;
  private readonly world: RAPIER.World;
  private readonly eventQueue: RAPIER.EventQueue;
  private readonly bodies = new Map<string, RapierBodyRecord>();
  private readonly colliderBodies = new Map<number, string>();
  private stepIndex = 0;
  private destroyed = false;

  constructor(options: CreatePhysics2DWorldOptions) {
    this.timestepSeconds = positive(options.timestepSeconds ?? defaultTimestepSeconds, "timestepSeconds");
    this.world = new RAPIER.World(vector(options.gravity, "gravity"));
    this.eventQueue = new RAPIER.EventQueue(true);
    this.world.timestep = this.timestepSeconds;
  }

  private requireActive(): void {
    if (this.destroyed) {
      throw new Physics2DError("SFHS_PHYSICS_WORLD_DESTROYED", "Physics world has been destroyed.");
    }
  }

  private requireBody(id: string): RapierBodyRecord {
    this.requireActive();
    const record = this.bodies.get(id);
    if (record === undefined) {
      throw new Physics2DError("SFHS_PHYSICS_BODY_MISSING", `Physics body does not exist: ${id}`);
    }
    return record;
  }

  createBody(definition: Physics2DBodyDefinition): Physics2DBodyState {
    this.requireActive();
    if (definition.id.length === 0) {
      throw new Physics2DError("SFHS_PHYSICS_INPUT_INVALID", "Physics body id must not be empty.");
    }
    if (this.bodies.has(definition.id)) {
      throw new Physics2DError("SFHS_PHYSICS_BODY_DUPLICATE", `Physics body already exists: ${definition.id}`);
    }
    const position = vector(definition.position, "position");
    const linearVelocity = vector(definition.linearVelocity ?? { x: 0, y: 0 }, "linearVelocity");
    let bodyDescription = definition.type === "dynamic"
      ? RAPIER.RigidBodyDesc.dynamic()
      : RAPIER.RigidBodyDesc.fixed();
    bodyDescription = bodyDescription
      .setTranslation(position.x, position.y)
      .setRotation(finite(definition.rotation ?? 0, "rotation"))
      .setLinvel(linearVelocity.x, linearVelocity.y)
      .setAngvel(finite(definition.angularVelocity ?? 0, "angularVelocity"));
    if (definition.linearDamping !== undefined) {
      bodyDescription.setLinearDamping(nonNegative(definition.linearDamping, "linearDamping"));
    }
    if (definition.angularDamping !== undefined) {
      bodyDescription.setAngularDamping(nonNegative(definition.angularDamping, "angularDamping"));
    }
    if (definition.ccd === true) bodyDescription.setCcdEnabled(true);

    const colliderDescriptor = colliderDescription(definition.collider);
    const body = this.world.createRigidBody(bodyDescription);
    let collider: RAPIER.Collider;
    try {
      collider = this.world.createCollider(colliderDescriptor, body);
    } catch (error) {
      this.world.removeRigidBody(body);
      throw error;
    }
    const record = Object.freeze({ type: definition.type, body, collider });
    this.bodies.set(definition.id, record);
    this.colliderBodies.set(collider.handle, definition.id);
    return bodyState(definition.id, record);
  }

  removeBody(id: string): boolean {
    this.requireActive();
    const record = this.bodies.get(id);
    if (record === undefined) return false;
    this.colliderBodies.delete(record.collider.handle);
    this.world.removeRigidBody(record.body);
    this.bodies.delete(id);
    return true;
  }

  getBody(id: string): Physics2DBodyState {
    return bodyState(id, this.requireBody(id));
  }

  snapshot(): Physics2DSnapshot {
    this.requireActive();
    return Object.freeze({
      step: this.stepIndex,
      bodies: Object.freeze([...this.bodies.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, record]) => bodyState(id, record)))
    });
  }

  step(): Physics2DStepResult {
    this.requireActive();
    const collisions: Physics2DCollisionEvent[] = [];
    this.world.step(this.eventQueue);
    this.eventQueue.drainCollisionEvents((firstHandle, secondHandle, started) => {
      const bodyA = this.colliderBodies.get(firstHandle);
      const bodyB = this.colliderBodies.get(secondHandle);
      if (bodyA !== undefined && bodyB !== undefined) {
        const [first, second] = bodyA.localeCompare(bodyB) <= 0 ? [bodyA, bodyB] : [bodyB, bodyA];
        collisions.push(Object.freeze({ bodyA: first, bodyB: second, started }));
      }
    });
    collisions.sort((left, right) => left.bodyA.localeCompare(right.bodyA) || left.bodyB.localeCompare(right.bodyB));
    this.stepIndex += 1;
    const snapshot = this.snapshot();
    return Object.freeze({ ...snapshot, collisions: Object.freeze(collisions) });
  }

  setGravity(gravity: Physics2DVector): void {
    this.requireActive();
    this.world.gravity = vector(gravity, "gravity");
  }

  setBodyTransform(id: string, position: Physics2DVector, rotation: number): void {
    const body = this.requireBody(id).body;
    body.setTranslation(vector(position, "position"), true);
    body.setRotation(finite(rotation, "rotation"), true);
  }

  setBodyVelocity(id: string, linearVelocity: Physics2DVector, angularVelocity = 0): void {
    const body = this.requireBody(id).body;
    body.setLinvel(vector(linearVelocity, "linearVelocity"), true);
    body.setAngvel(finite(angularVelocity, "angularVelocity"), true);
  }

  applyImpulse(id: string, impulse: Physics2DVector): void {
    this.requireBody(id).body.applyImpulse(vector(impulse, "impulse"), true);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.bodies.clear();
    this.colliderBodies.clear();
    this.eventQueue.free();
    this.world.free();
  }
}

export async function createPhysics2DWorld(
  options: CreatePhysics2DWorldOptions
): Promise<Physics2DWorld> {
  await initializeBackend();
  return new RapierPhysics2DWorld(options);
}
