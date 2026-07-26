import { Graphics } from "pixi.js";
import { createSfhsPixiV8Presentation } from "@sfhs/adapter-pixi-v8";
import type { SfhsGameScene, SfhsSemanticActionSource } from "@sfhs/pixi-runtime";

export interface NativeFixtureAction { readonly moveX: number; }
export interface NativeFixtureState { readonly x: number; readonly ticks: number; }
export interface NativeFixtureSnapshot { readonly x: number; readonly ticks: number; }

export const nativeFixtureScene: SfhsGameScene<NativeFixtureState, NativeFixtureAction, NativeFixtureSnapshot> = {
  mount: () => Object.freeze({ x: 100, ticks: 0 }), enter: (state) => state,
  update: (state, action) => Object.freeze({ x: state.x + action.moveX * 4, ticks: state.ticks + 1 }),
  snapshot: (state) => Object.freeze({ ...state }), pause() {}, resume() {}, exit() {}, resize() {}, destroy() {}
};

export function createNativeFixturePresentation() {
  let player: Graphics | undefined;
  return createSfhsPixiV8Presentation<NativeFixtureSnapshot>({ backgroundColor: 0x08111f, presenter: {
    present(snapshot, _alpha, layers) {
      player ??= layers.actorLayer.addChild(new Graphics().circle(0, 0, 24).fill({ color: 0x22d3ee }));
      player.position.set(snapshot.x, 180);
    }
  } });
}

export function createKeyboardActions(target: EventTarget): SfhsSemanticActionSource<NativeFixtureAction> {
  const pressed = new Set<string>();
  const down = (event: Event) => pressed.add((event as KeyboardEvent).code);
  const up = (event: Event) => pressed.delete((event as KeyboardEvent).code);
  target.addEventListener("keydown", down); target.addEventListener("keyup", up);
  return { sampleForStep: () => Object.freeze({ moveX: Number(pressed.has("ArrowRight")) - Number(pressed.has("ArrowLeft")) }), clear: () => pressed.clear(), destroy() { pressed.clear(); target.removeEventListener("keydown", down); target.removeEventListener("keyup", up); } };
}
