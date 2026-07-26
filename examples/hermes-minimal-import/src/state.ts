import type { PixiCircleScene } from "@sfhs/adapter-pixi-v8";

export const collectorBuildId = "import1";
export const collectorWidth = 320;
export const collectorHeight = 200;
export const collectorPlayerRadius = 8;
export const collectorStarRadius = 10;
export const collectorStarX = 260;
export const collectorStarY = 100;
export const collectorSpeedPerStep = 2;

export interface CollectorActionSnapshot {
  readonly left: boolean;
  readonly right: boolean;
}

export interface CollectorState {
  readonly ticks: number;
  readonly playerX: number;
  readonly playerY: number;
  readonly starTaken: boolean;
  readonly score: number;
}

export function createInitialCollectorState(): CollectorState {
  return Object.freeze({ ticks: 0, playerX: 40, playerY: 100, starTaken: false, score: 0 });
}

export function advanceCollectorState(
  state: CollectorState,
  action: CollectorActionSnapshot
): CollectorState {
  const direction = Number(action.right) - Number(action.left);
  const playerX = Math.min(
    collectorWidth - collectorPlayerRadius,
    Math.max(collectorPlayerRadius, state.playerX + direction * collectorSpeedPerStep)
  );
  const distanceX = playerX - collectorStarX;
  const distanceY = state.playerY - collectorStarY;
  const collectionDistance = collectorPlayerRadius + collectorStarRadius;
  const collected = !state.starTaken && distanceX * distanceX + distanceY * distanceY < collectionDistance * collectionDistance;
  return Object.freeze({
    ticks: state.ticks + 1,
    playerX,
    playerY: state.playerY,
    starTaken: state.starTaken || collected,
    score: state.score + Number(collected)
  });
}

export function presentCollectorState(state: CollectorState): PixiCircleScene {
  return Object.freeze({
    circles: Object.freeze([
      Object.freeze({ id: "star", x: collectorStarX, y: collectorStarY, radius: collectorStarRadius, color: 0xffe66d, visible: !state.starTaken }),
      Object.freeze({ id: "player", x: state.playerX, y: state.playerY, radius: collectorPlayerRadius, color: 0xf0883e, visible: true })
    ])
  });
}

export function runCollectorStateSelfCheck(): Readonly<Record<string, boolean>> {
  const initial = createInitialCollectorState();
  const moved = advanceCollectorState(initial, { left: false, right: true });
  const nearStar = Object.freeze({ ...initial, playerX: collectorStarX - collectorPlayerRadius - collectorStarRadius + 1 });
  const collected = advanceCollectorState(nearStar, { left: false, right: false });
  return Object.freeze({
    buildId: collectorBuildId === "import1",
    movement: moved.playerX > initial.playerX,
    collection: collected.starTaken && collected.score === 1,
    renderPure: initial.starTaken === false && initial.score === 0
  });
}
