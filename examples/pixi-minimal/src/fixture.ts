import type { PixiMinimalPresentation } from "@sfhs/adapter-pixi-v8";

import type { FixtureActionSnapshot } from "./input.ts";

export interface PixiMinimalFixtureState {
  readonly phase: "ready" | "running";
  readonly visualRevision: number;
  readonly ticks: number;
  readonly playerX: number;
  readonly playerY: number;
  readonly activationCount: number;
}

export function createInitialPixiMinimalFixtureState(): PixiMinimalFixtureState {
  return Object.freeze({
    phase: "ready",
    visualRevision: 1,
    ticks: 0,
    playerX: 240,
    playerY: 270,
    activationCount: 0
  });
}

const movementUnitsPerStep = 4;
const targetX = 720;
const targetY = 270;
const targetActivationRadius = 64;

function boundedPlayerCoordinate(value: number, maximum: number): number {
  return Math.min(Math.max(value, 32), maximum - 32);
}

function activatesTarget(action: FixtureActionSnapshot): boolean {
  if (action.activateAt === undefined) {
    return false;
  }

  return Math.hypot(action.activateAt.x - targetX, action.activateAt.y - targetY) <= targetActivationRadius;
}

export function advancePixiMinimalFixtureSimulation(
  state: PixiMinimalFixtureState,
  action: FixtureActionSnapshot = Object.freeze({ moveX: 0, moveY: 0 })
): PixiMinimalFixtureState {
  const magnitude = Math.hypot(action.moveX, action.moveY);
  const movementScale = magnitude > 1 ? 1 / magnitude : 1;
  return Object.freeze({
    phase: "running",
    visualRevision: state.visualRevision + 1,
    ticks: state.ticks + 1,
    playerX: boundedPlayerCoordinate(
      state.playerX + action.moveX * movementScale * movementUnitsPerStep,
      960
    ),
    playerY: boundedPlayerCoordinate(
      state.playerY + action.moveY * movementScale * movementUnitsPerStep,
      540
    ),
    activationCount: state.activationCount + Number(activatesTarget(action))
  });
}

export function presentPixiMinimalFixture(
  state: PixiMinimalFixtureState
): PixiMinimalPresentation {
  return Object.freeze({
    primaryColor: state.visualRevision % 2 === 0 ? 0x1e40af : 0x1d4ed8,
    accentColor: state.phase === "ready" ? 0x34d399 : 0x14b8a6,
    playerX: state.playerX,
    playerY: state.playerY,
    targetX,
    targetY,
    targetActive: state.activationCount > 0,
    playerFrame: state.ticks % 20 < 10 ? 0 : 1
  });
}
