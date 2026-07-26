import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Spritesheet,
  type SpritesheetData,
  type Texture
} from "pixi.js";
import type {
  SfhsPresentationAdapter,
  SfhsPresentationDiagnostics,
  SfhsViewportState
} from "@sfhs/pixi-runtime";

export const packageIdentity = "@sfhs/adapter-pixi-v8" as const;

export const pixiV8Adapter = {
  id: "pixi-v8",
  packageVersion: "8.19.0",
  requiredRenderer: "webgl",
  webgpu: "disabled"
} as const;

export interface SfhsPixiStageLayers {
  readonly worldRoot: Container;
  readonly backgroundLayer: Container;
  readonly environmentLayer: Container;
  readonly actorLayer: Container;
  readonly projectileLayer: Container;
  readonly worldEffectsLayer: Container;
  readonly screenEffectsLayer: Container;
  readonly debugLayer: Container;
  readonly hudLayer: Container;
}

export interface SfhsPixiPresenter<Snapshot> {
  present(snapshot: Readonly<Snapshot>, alpha: number, layers: SfhsPixiStageLayers): void;
  destroy?(): void;
}

export function createSfhsPixiV8Presentation<Snapshot>(options: {
  readonly backgroundColor: number;
  readonly presenter: SfhsPixiPresenter<Snapshot>;
}): SfhsPresentationAdapter<Snapshot> {
  const application = new Application();
  let layers: SfhsPixiStageLayers | undefined;
  let mounted = false;
  let paused = true;
  let destroyed = false;
  let viewport: SfhsViewportState | undefined;
  function requireLayers(): SfhsPixiStageLayers {
    if (layers === undefined) throw new Error("SFHS Pixi presentation is not mounted.");
    return layers;
  }
  return {
    async mount(host) {
      if (mounted || destroyed) throw new Error("SFHS Pixi presentation can only mount once.");
      await application.init({ width: 1, height: 1, backgroundColor: options.backgroundColor, autoDensity: true, autoStart: false, sharedTicker: false, preference: "webgl", preferWebGLVersion: 2 });
      const worldRoot = new Container({ label: "worldRoot" });
      const backgroundLayer = new Container({ label: "backgroundLayer" });
      const environmentLayer = new Container({ label: "environmentLayer" });
      const actorLayer = new Container({ label: "actorLayer" });
      const projectileLayer = new Container({ label: "projectileLayer" });
      const worldEffectsLayer = new Container({ label: "worldEffectsLayer" });
      const screenEffectsLayer = new Container({ label: "screenEffectsLayer" });
      const debugLayer = new Container({ label: "debugLayer" });
      const hudLayer = new Container({ label: "hudLayer" });
      worldRoot.addChild(backgroundLayer, environmentLayer, actorLayer, projectileLayer, worldEffectsLayer);
      application.stage.addChild(worldRoot, screenEffectsLayer, debugLayer, hudLayer);
      layers = { worldRoot, backgroundLayer, environmentLayer, actorLayer, projectileLayer, worldEffectsLayer, screenEffectsLayer, debugLayer, hudLayer };
      host.replaceChildren(application.canvas);
      mounted = true;
    },
    resize(next) { if (destroyed) throw new Error("Destroyed SFHS Pixi presentation cannot resize."); viewport = next; application.renderer.resize(next.logicalWidth, next.logicalHeight, next.resolution); const canvas = application.canvas; canvas.style.display = "block"; canvas.style.position = "absolute"; canvas.style.left = "0"; canvas.style.top = "0"; canvas.style.width = `${next.logicalWidth}px`; canvas.style.height = `${next.logicalHeight}px`; canvas.style.transformOrigin = "0 0"; canvas.style.transform = `translate(${next.offsetX}px, ${next.offsetY}px) scale(${next.scaleX}, ${next.scaleY})`; },
    present(snapshot, alpha) { if (destroyed) throw new Error("Destroyed SFHS Pixi presentation cannot present."); options.presenter.present(snapshot, alpha, requireLayers()); application.render(); },
    pause() { if (destroyed) return; paused = true; },
    resume() { if (destroyed) throw new Error("Destroyed SFHS Pixi presentation cannot resume."); paused = false; },
    destroy() { if (destroyed) return; options.presenter.destroy?.(); application.destroy(true, true); destroyed = true; },
    getPrimarySurface() { return application.canvas; },
    getDiagnostics(): SfhsPresentationDiagnostics {
      const stage = layers;
      const meaningfulObjectCount = stage === undefined ? 0 : stage.backgroundLayer.children.length + stage.environmentLayer.children.length + stage.actorLayer.children.length + stage.projectileLayer.children.length + stage.worldEffectsLayer.children.length + stage.screenEffectsLayer.children.length + stage.debugLayer.children.length + stage.hudLayer.children.length;
      return { renderer: "PIXI", paused, destroyed, ...(viewport === undefined ? {} : { viewport }), stage: { hierarchy: ["worldRoot/backgroundLayer", "worldRoot/environmentLayer", "worldRoot/actorLayer", "worldRoot/projectileLayer", "worldRoot/worldEffectsLayer", "screenEffectsLayer", "debugLayer", "hudLayer"], meaningfulObjectCount } };
    }
  };
}

export interface PixiMinimalPresentation {
  readonly primaryColor: number;
  readonly accentColor: number;
  readonly playerX: number;
  readonly playerY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly targetActive: boolean;
  readonly playerFrame: 0 | 1;
}

export interface PixiMinimalAssetSources {
  readonly atlasImageUrl: string;
  readonly atlasData: object;
  readonly targetSvgUrl: string;
}

export interface PixiMinimalRenderer {
  render(presentation: PixiMinimalPresentation): void;
  applyViewport(viewport: PixiViewportPresentation): void;
  destroy(): void;
}

export interface PixiViewportPresentation {
  readonly logicalWidth: number;
  readonly logicalHeight: number;
  readonly resolution: number;
}

export interface PixiCirclePrimitive {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: number;
  readonly visible: boolean;
}

export interface PixiCircleScene {
  readonly circles: readonly PixiCirclePrimitive[];
}

export interface PixiCircleStageOptions {
  readonly width: number;
  readonly height: number;
  readonly backgroundColor: number;
  readonly maximumDevicePixelRatio?: number;
}

export interface PixiCircleStageRenderer {
  render(scene: PixiCircleScene): void;
  destroy(): void;
}

export class PixiWebGlRequiredError extends Error {
  readonly code = "SFHS_PIXI_WEBGL_REQUIRED" as const;

  constructor() {
    super("This SFHS fixture requires WebGL and does not use a Canvas or WebGPU fallback.");
    this.name = "PixiWebGlRequiredError";
  }
}

const webGlCapabilityProbes = new WeakMap<object, {
  readonly canvas: HTMLCanvasElement;
  readonly supported: boolean;
}>();

function webGlCapability(documentLike: Pick<Document, "createElement">): {
  readonly canvas: HTMLCanvasElement;
  readonly supported: boolean;
} {
  const existing = webGlCapabilityProbes.get(documentLike);
  if (existing !== undefined) {
    return existing;
  }
  const canvas = documentLike.createElement("canvas");
  const supported = canvas.getContext("webgl2") !== null || canvas.getContext("webgl") !== null;
  const capability = { canvas, supported };
  webGlCapabilityProbes.set(documentLike, capability);
  return capability;
}

export function supportsRequiredWebGl(documentLike: Pick<Document, "createElement">): boolean {
  return webGlCapability(documentLike).supported;
}

export async function bootPixiV8CircleStage(
  host: HTMLElement,
  options: PixiCircleStageOptions
): Promise<PixiCircleStageRenderer> {
  if (!supportsRequiredWebGl(host.ownerDocument)) {
    throw new PixiWebGlRequiredError();
  }

  const application = new Application();
  await application.init({
    width: options.width,
    height: options.height,
    backgroundColor: options.backgroundColor,
    autoDensity: true,
    autoStart: false,
    sharedTicker: false,
    resolution: Math.min(window.devicePixelRatio || 1, options.maximumDevicePixelRatio ?? 2),
    preference: "webgl",
    preferWebGLVersion: 2
  });
  const circles = new Map<string, Graphics>();
  host.replaceChildren(application.canvas);

  return {
    render(scene): void {
      const activeIds = new Set(scene.circles.map((circle) => circle.id));
      for (const [id, graphic] of circles) {
        if (!activeIds.has(id)) {
          graphic.destroy();
          circles.delete(id);
        }
      }
      for (const circle of scene.circles) {
        let graphic = circles.get(circle.id);
        if (graphic === undefined) {
          graphic = new Graphics();
          circles.set(circle.id, graphic);
          application.stage.addChild(graphic);
        }
        graphic.clear().circle(0, 0, circle.radius).fill({ color: circle.color });
        graphic.position.set(circle.x, circle.y);
        graphic.visible = circle.visible;
      }
      application.render();
    },
    destroy(): void {
      host.replaceChildren();
      circles.clear();
      application.destroy(true, true);
    }
  };
}

function drawFixtureBackdrop(marker: Graphics, presentation: PixiMinimalPresentation): void {
  marker
    .clear()
    .roundRect(144, 144, 672, 252, 24)
    .fill({ color: presentation.primaryColor })
    .roundRect(192, 192, 576, 156, 16)
    .fill({ color: presentation.accentColor });
}

export async function bootPixiV8MinimalFixture(
  host: HTMLElement,
  assets: PixiMinimalAssetSources
): Promise<PixiMinimalRenderer> {
  if (!supportsRequiredWebGl(host.ownerDocument)) {
    throw new PixiWebGlRequiredError();
  }

  const application = new Application();
  await application.init({
    width: 960,
    height: 540,
    backgroundColor: 0x0d1524,
    autoDensity: true,
    autoStart: false,
    sharedTicker: false,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: "webgl",
    preferWebGLVersion: 2
  });
  const marker = new Graphics();
  const [atlasTexture, targetTexture] = await Promise.all([
    Assets.load<Texture>(assets.atlasImageUrl),
    Assets.load<Texture>(assets.targetSvgUrl)
  ]);
  const spritesheet = new Spritesheet(atlasTexture, assets.atlasData as SpritesheetData);
  await spritesheet.parse();
  const playerFrames = [spritesheet.textures["player-0"], spritesheet.textures["player-1"]];
  if (playerFrames.some((texture) => texture === undefined)) {
    application.destroy(true, true);
    throw new Error("The SFHS fixture atlas is missing a required player frame.");
  }
  const player = new Sprite(playerFrames[0]);
  const target = new Sprite(targetTexture);
  player.anchor.set(0.5);
  player.scale.set(2);
  target.anchor.set(0.5);
  target.width = 84;
  target.height = 84;
  application.stage.addChild(marker, target, player);
  host.replaceChildren(application.canvas);

  return {
    render(presentation) {
      drawFixtureBackdrop(marker, presentation);
      player.texture = playerFrames[presentation.playerFrame] ?? player.texture;
      player.position.set(presentation.playerX, presentation.playerY);
      target.position.set(presentation.targetX, presentation.targetY);
      target.tint = presentation.targetActive ? 0xfbbf24 : 0xffffff;
      application.render();
    },
    applyViewport(viewport) {
      application.renderer.resize(viewport.logicalWidth, viewport.logicalHeight, viewport.resolution);
    },
    destroy() {
      host.replaceChildren();
      application.destroy(true, true);
    }
  };
}
