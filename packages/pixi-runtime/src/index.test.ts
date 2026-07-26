import { describe, expect, it, vi } from "vitest";
import { calculateSfhsViewport, createSfhsPixiGameRuntime, type SfhsPresentationAdapter, type SfhsPresentationDiagnostics } from "./index.ts";

class Source extends EventTarget {
  innerWidth = 400; innerHeight = 800; devicePixelRatio = 3;
}

function harness() {
  const calls: string[] = [];
  const canvas = {} as HTMLCanvasElement;
  const diagnostics: SfhsPresentationDiagnostics = { renderer: "PIXI", paused: false, destroyed: false, stage: { hierarchy: ["worldRoot/backgroundLayer", "worldRoot/environmentLayer", "worldRoot/actorLayer", "worldRoot/projectileLayer", "worldRoot/worldEffectsLayer", "screenEffectsLayer", "debugLayer", "hudLayer"], meaningfulObjectCount: 1 } };
  const presentation: SfhsPresentationAdapter<{ value: number }> = {
    async mount() { calls.push("mount"); }, resize() { calls.push("resize"); }, present() { calls.push("present"); }, pause() { calls.push("presentation.pause"); }, resume() { calls.push("presentation.resume"); }, destroy() { calls.push("presentation.destroy"); }, getPrimarySurface: () => canvas, getDiagnostics: () => diagnostics
  };
  const scene = {
    mount: () => (calls.push("scene.mount"), 0), enter: (state: number) => (calls.push("scene.enter"), state),
    update: (state: number, action: Readonly<{ delta: number }>) => state + action.delta,
    snapshot: (state: number) => Object.freeze({ value: state }), pause: () => { calls.push("scene.pause"); }, resume: () => { calls.push("scene.resume"); }, exit: () => { calls.push("scene.exit"); }, resize: () => { calls.push("scene.resize"); }, destroy: () => { calls.push("scene.destroy"); }
  };
  const actions = { sampleForStep: () => ({ delta: 1 }), clear: vi.fn(), destroy: vi.fn() };
  const callbacks = new Map<number, (time: number) => void>(); let next = 1;
  const scheduler = { request(callback: (time: number) => void) { const id = next++; callbacks.set(id, callback); return id; }, cancel(id: number) { callbacks.delete(id); } };
  return { calls, canvas, presentation, scene, actions, callbacks, scheduler };
}

describe("SFHS Pixi game runtime", () => {
  it("calculates truthful fixed and adaptive portrait viewports", () => {
    const fixed = calculateSfhsViewport({ mode: "fixed", logicalWidth: 960, logicalHeight: 540, maximumDevicePixelRatio: 2, scalePolicy: "contain" }, 400, 800, 3);
    expect(fixed).toMatchObject({ logicalWidth: 960, logicalHeight: 540, resolution: 2, orientation: "portrait", backingWidth: 1920 });
    const adaptive = calculateSfhsViewport({ mode: "adaptive", logicalWidth: 960, logicalHeight: 540, maximumDevicePixelRatio: 2, scalePolicy: "stretch" }, 400, 800, 3);
    expect(adaptive).toMatchObject({ logicalWidth: 400, logicalHeight: 800, backingWidth: 800, backingHeight: 1600 });
  });

  it("owns mount, fixed-step scheduling, semantic action sampling, resize, pause, and cleanup", async () => {
    const h = harness(); const source = new Source();
    const runtime = await createSfhsPixiGameRuntime({ host: {} as HTMLElement, presentation: h.presentation, scene: h.scene, actions: h.actions, viewport: { mode: "adaptive", logicalWidth: 960, logicalHeight: 540, maximumDevicePixelRatio: 2, scalePolicy: "stretch" }, simulationHz: 10, maximumFrameDeltaMilliseconds: 250, scheduler: h.scheduler, viewportSource: source });
    expect(h.calls.slice(0, 5)).toEqual(["mount", "scene.mount", "scene.enter", "resize", "scene.resize"]);
    runtime.start(); const first = [...h.callbacks.values()][0]; first?.(0); const second = [...h.callbacks.values()][0]; second?.(210);
    expect(runtime.getState()).toBe(2); expect(runtime.getPrimarySurface()).toBe(h.canvas); expect(runtime.getDiagnostics().stage.meaningfulObjectCount).toBe(1);
    source.innerWidth = 900; source.innerHeight = 400; source.dispatchEvent(new Event("orientationchange")); expect(runtime.getViewport().orientation).toBe("landscape");
    runtime.pause(); expect(h.actions.clear).toHaveBeenCalledOnce(); runtime.resume(); runtime.resume(); runtime.destroy();
    expect(h.actions.destroy).toHaveBeenCalledOnce(); expect(h.calls.filter((value) => value === "scene.resume")).toHaveLength(1); expect(h.calls).toEqual(expect.arrayContaining(["scene.pause", "scene.resume", "scene.exit", "scene.destroy", "presentation.destroy"]));
    const before = h.calls.length; source.dispatchEvent(new Event("resize")); expect(h.calls).toHaveLength(before);
  });

  it("destroys the presentation when mount rejects before scene ownership begins", async () => {
    const h = harness(); h.presentation.mount = async () => { throw new Error("mount failed"); };
    await expect(createSfhsPixiGameRuntime({ host: {} as HTMLElement, presentation: h.presentation, scene: h.scene, actions: h.actions, viewport: { mode: "adaptive", logicalWidth: 1, logicalHeight: 1, maximumDevicePixelRatio: 1, scalePolicy: "stretch" }, simulationHz: 10, maximumFrameDeltaMilliseconds: 250, scheduler: h.scheduler, viewportSource: new Source() })).rejects.toThrow("mount failed");
    expect(h.calls).toEqual(["presentation.destroy"]); expect(h.actions.destroy).toHaveBeenCalledOnce();
  });

  it("destroys actions and a scene whose mount hook rejects", async () => {
    const h = harness(); h.scene.mount = () => { throw new Error("scene mount failed"); };
    await expect(createSfhsPixiGameRuntime({ host: {} as HTMLElement, presentation: h.presentation, scene: h.scene, actions: h.actions, viewport: { mode: "adaptive", logicalWidth: 1, logicalHeight: 1, maximumDevicePixelRatio: 1, scalePolicy: "stretch" }, simulationHz: 10, maximumFrameDeltaMilliseconds: 250, scheduler: h.scheduler, viewportSource: new Source() })).rejects.toThrow("scene mount failed");
    expect(h.calls).toEqual(expect.arrayContaining(["mount", "scene.destroy", "presentation.destroy"])); expect(h.actions.destroy).toHaveBeenCalledOnce();
  });

  it("cleans up the mounted scene and presentation when initial resize rejects", async () => {
    const h = harness(); h.presentation.resize = () => { throw new Error("resize failed"); };
    await expect(createSfhsPixiGameRuntime({ host: {} as HTMLElement, presentation: h.presentation, scene: h.scene, actions: h.actions, viewport: { mode: "adaptive", logicalWidth: 1, logicalHeight: 1, maximumDevicePixelRatio: 1, scalePolicy: "stretch" }, simulationHz: 10, maximumFrameDeltaMilliseconds: 250, scheduler: h.scheduler, viewportSource: new Source() })).rejects.toThrow("resize failed");
    expect(h.calls).toEqual(expect.arrayContaining(["mount", "scene.mount", "scene.enter", "scene.destroy", "presentation.destroy"])); expect(h.actions.destroy).toHaveBeenCalledOnce();
  });

  it("destroys a mounted scene when enter rejects and never resumes after destroy", async () => {
    const h = harness(); h.scene.enter = () => { throw new Error("enter failed"); };
    await expect(createSfhsPixiGameRuntime({ host: {} as HTMLElement, presentation: h.presentation, scene: h.scene, actions: h.actions, viewport: { mode: "adaptive", logicalWidth: 1, logicalHeight: 1, maximumDevicePixelRatio: 1, scalePolicy: "stretch" }, simulationHz: 10, maximumFrameDeltaMilliseconds: 250, scheduler: h.scheduler, viewportSource: new Source() })).rejects.toThrow("enter failed");
    expect(h.calls).toEqual(expect.arrayContaining(["mount", "scene.mount", "scene.destroy", "presentation.destroy"]));
    const liveHarness = harness(); const live = await createSfhsPixiGameRuntime({ host: {} as HTMLElement, presentation: liveHarness.presentation, scene: liveHarness.scene, actions: liveHarness.actions, viewport: { mode: "adaptive", logicalWidth: 1, logicalHeight: 1, maximumDevicePixelRatio: 1, scalePolicy: "stretch" }, simulationHz: 10, maximumFrameDeltaMilliseconds: 250, scheduler: liveHarness.scheduler, viewportSource: new Source() }); live.destroy(); expect(() => live.resume()).toThrow("Destroyed SFHS runtime");
  });
});
