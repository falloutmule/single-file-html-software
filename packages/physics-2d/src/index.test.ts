import { describe, expect, it } from "vitest";

import {
  createPhysics2DWorld,
  type Physics2DError,
  type Physics2DWorld
} from "./index.ts";

async function fallingWorld(): Promise<Physics2DWorld> {
  const world = await createPhysics2DWorld({ gravity: { x: 0, y: 9.81 } });
  world.createBody({
    id: "floor",
    type: "fixed",
    position: { x: 0, y: 5 },
    collider: { shape: { kind: "box", halfWidth: 5, halfHeight: 0.25 } }
  });
  world.createBody({
    id: "ball",
    type: "dynamic",
    position: { x: 0, y: 0 },
    ccd: true,
    collider: { shape: { kind: "circle", radius: 0.5 }, density: 1, restitution: 0.4 }
  });
  return world;
}

describe("SFHS Physics 2D", () => {
  it("steps fixed and dynamic bodies and reports collision events", async () => {
    const world = await fallingWorld();
    try {
      let collisionStarted = false;
      for (let step = 0; step < 120; step += 1) {
        const result = world.step();
        collisionStarted ||= result.collisions.some((event) => event.started &&
          new Set([event.bodyA, event.bodyB]).size === 2 &&
          [event.bodyA, event.bodyB].includes("ball") &&
          [event.bodyA, event.bodyB].includes("floor"));
      }
      expect(collisionStarted).toBe(true);
      expect(world.getBody("ball").position.y).toBeGreaterThan(3);
      expect(world.snapshot().bodies.map((body) => body.id)).toEqual(["ball", "floor"]);
    } finally {
      world.destroy();
    }
  });

  it("supports transforms, velocities, impulses, removal, and idempotent disposal", async () => {
    const world = await fallingWorld();
    world.setBodyTransform("ball", { x: 2, y: 2 }, 0.25);
    world.setBodyVelocity("ball", { x: 1, y: -2 }, 0.5);
    world.applyImpulse("ball", { x: 3, y: 0 });
    const state = world.getBody("ball");
    expect(state.position).toEqual({ x: 2, y: 2 });
    expect(state.rotation).toBeCloseTo(0.25);
    expect(state.linearVelocity.x).toBeGreaterThan(1);
    expect(state.angularVelocity).toBeCloseTo(0.5);
    expect(world.removeBody("ball")).toBe(true);
    expect(world.removeBody("ball")).toBe(false);
    world.destroy();
    world.destroy();
    expect(() => world.snapshot()).toThrowError(expect.objectContaining<Partial<Physics2DError>>({
      code: "SFHS_PHYSICS_WORLD_DESTROYED"
    }));
  });

  it("rejects duplicate, missing, and invalid body operations with stable errors", async () => {
    const world = await createPhysics2DWorld({ gravity: { x: 0, y: 0 } });
    try {
      const definition = {
        id: "body",
        type: "dynamic" as const,
        position: { x: 0, y: 0 },
        collider: { shape: { kind: "circle" as const, radius: 1 } }
      };
      world.createBody(definition);
      expect(() => world.createBody(definition)).toThrowError(expect.objectContaining<Partial<Physics2DError>>({
        code: "SFHS_PHYSICS_BODY_DUPLICATE"
      }));
      expect(() => world.getBody("missing")).toThrowError(expect.objectContaining<Partial<Physics2DError>>({
        code: "SFHS_PHYSICS_BODY_MISSING"
      }));
      expect(() => world.createBody({ ...definition, id: "invalid", collider: { shape: { kind: "circle", radius: 0 } } }))
        .toThrowError(expect.objectContaining<Partial<Physics2DError>>({ code: "SFHS_PHYSICS_INPUT_INVALID" }));
      expect(world.snapshot().bodies.map((body) => body.id)).toEqual(["body"]);
    } finally {
      world.destroy();
    }
  });
});
