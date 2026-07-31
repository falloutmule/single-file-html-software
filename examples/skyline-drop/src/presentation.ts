import * as PIXI from "pixi.js";
import { createSfhsPixiV8Presentation, type SfhsPixiPresenter, type SfhsPixiStageLayers } from "@sfhs/adapter-pixi-v8";
import type { SfhsPresentationAdapter, SfhsViewportState } from "@sfhs/pixi-runtime";
import { SKYLINE_ASSET_URLS } from "./asset-urls.ts";
import { BOARD_SIZE, CARDINALS, indexOf, inBounds, keyOf, LOGICAL_HEIGHT, LOGICAL_WIDTH, type GridPoint, type PieceCell, type PresentationSnapshot, type TerrainKind } from "./types.ts";

  const TILE_WIDTH = 68;
  const TILE_HEIGHT = 34;
  const BOARD_ORIGIN_X = LOGICAL_WIDTH / 2;
  const BOARD_ORIGIN_Y = 250;
  const HOVER_HEIGHT = 108;
  const BOARD_CENTER_Y = BOARD_ORIGIN_Y + BOARD_SIZE * TILE_HEIGHT / 2;
  const PORTRAIT_WORLD_SCALE = 1.25;
  const PORTRAIT_WORLD_CENTER_Y = 450;

  export interface GamePresenter {
    readonly presentation: SfhsPresentationAdapter<PresentationSnapshot>;
    resize(viewport: SfhsViewportState): void;
    screenToGrid(logicalX: number, logicalY: number): GridPoint | null;
  }

  type TextureMap = Readonly<Record<string, PIXI.Texture>>;

  function isoPoint(x: number, y: number): GridPoint {
    return Object.freeze({
      x: BOARD_ORIGIN_X + (x - y) * TILE_WIDTH / 2,
      y: BOARD_ORIGIN_Y + (x + y) * TILE_HEIGHT / 2
    });
  }

  function destroyChildren(container: PIXI.Container): void {
    const removed = container.removeChildren();
    for (const child of removed) {
      const displayObject = child as { destroy?: (options?: unknown) => void };
      displayObject.destroy?.({ children: true });
    }
  }

  function drawDiamond(graphics: PIXI.Graphics, x: number, y: number, color: number, alpha = 1, strokeColor = 0x172130): void {
    graphics.poly([
      x, y - TILE_HEIGHT / 2,
      x + TILE_WIDTH / 2, y,
      x, y + TILE_HEIGHT / 2,
      x - TILE_WIDTH / 2, y
    ]).fill({ color, alpha }).stroke({ color: strokeColor, width: 1, alpha: 0.72 });
  }

  function drawLandingShadow(graphics: PIXI.Graphics, valid: boolean): void {
    const outline = valid ? 0x8be28b : 0xff6b6b;
    drawDiamond(graphics, 0, 0, outline, valid ? 0.18 : 0.24, outline);
    graphics.poly([
      0, -TILE_HEIGHT / 2 + 3,
      TILE_WIDTH / 2 - 6, 0,
      0, TILE_HEIGHT / 2 - 3,
      -TILE_WIDTH / 2 + 6, 0
    ]).stroke({ color: outline, width: 2, alpha: 0.92 });
    graphics.circle(0, 0, 2).fill({ color: outline, alpha: 0.95 });
  }

  function makeSprite(texture: PIXI.Texture, maxWidth: number, maxHeight: number, anchorY = 0.82): PIXI.Sprite {
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5, anchorY);
    const width = Math.max(1, texture.width);
    const height = Math.max(1, texture.height);
    const scale = Math.min(maxWidth / width, maxHeight / height);
    sprite.scale.set(scale);
    sprite.eventMode = "none";
    return sprite;
  }

  function terrainTextureKey(kind: TerrainKind, x: number, y: number): string {
    if (kind === "tree") return (x + y) % 2 === 0 ? "treeA" : "treeB";
    return (x + y) % 2 === 0 ? "boulders" : "rock";
  }

  function visualTextureKey(cell: Pick<PieceCell, "visual">): string | null {
    if (cell.visual === "home") return "home";
    if (cell.visual === "apartment") return "apartment";
    if (cell.visual === "shop") return "shop";
    if (cell.visual === "park") return "treeA";
    if (cell.visual === "utility") return "utility";
    return null;
  }

  function makeLabel(text: string, color: number, size = 12): PIXI.Text {
    const label = new PIXI.Text({
      text,
      style: {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: size,
        fontWeight: "800",
        fill: color,
        stroke: { color: 0x101824, width: 3 },
        align: "center"
      }
    });
    label.anchor.set(0.5);
    label.eventMode = "none";
    return label;
  }

  function createRoadGraphic(connected: boolean): PIXI.Graphics {
    const road = new PIXI.Graphics();
    drawDiamond(road, 0, 0, 0x596777, 1, connected ? 0xa9c0cf : 0x778895);
    road.moveTo(-19, -9).lineTo(19, 9)
      .stroke({ color: 0xf8d976, width: 2, alpha: connected ? 0.92 : 0.78 });
    road.eventMode = "none";
    return road;
  }

  function drawRoadTile(layer: PIXI.Container, x: number, y: number, connected: boolean): void {
    const point = isoPoint(x, y);
    const root = new PIXI.Container();
    root.position.set(point.x, point.y);
    root.eventMode = "none";
    root.addChild(createRoadGraphic(connected));
    layer.addChild(root);
  }

  interface DistrictVisualOptions {
    readonly connectedRoad: boolean;
    readonly activeBuilding: boolean;
    readonly previewValid: boolean | null;
    readonly showUnderground: boolean;
  }

  function addPreviewValidityOverlay(root: PIXI.Container, valid: boolean | null): void {
    if (valid !== false) return;
    const invalid = new PIXI.Graphics();
    drawDiamond(invalid, 0, 0, 0xff5c5c, 0.18, 0xff6b6b);
    invalid.eventMode = "none";
    root.addChild(invalid);
  }

  function createLocalConduit(mask: number, connected: boolean): PIXI.Graphics {
    const line = new PIXI.Graphics();
    if (mask === 0) return line;
    const color = connected ? 0x56d9ff : 0x6e8796;
    const glow = connected ? 0.95 : 0.78;
    line.circle(0, 0, 5).fill({ color, alpha: glow });
    for (const step of CARDINALS) {
      if ((mask & step.direction) === 0) continue;
      line.moveTo(0, 0)
        .lineTo(step.dx * TILE_WIDTH * 0.34, step.dy * TILE_HEIGHT * 0.34)
        .stroke({ color, width: connected ? 7 : 5, alpha: glow });
      line.moveTo(0, 0)
        .lineTo(step.dx * TILE_WIDTH * 0.34, step.dy * TILE_HEIGHT * 0.34)
        .stroke({ color: connected ? 0xd9f8ff : 0xa8bbc5, width: 2, alpha: glow });
    }
    line.eventMode = "none";
    return line;
  }

  function renderDistrictCell(
    layer: PIXI.Container,
    x: number,
    y: number,
    cell: Pick<PieceCell, "surface" | "visual" | "conduit">,
    textures: TextureMap,
    options: DistrictVisualOptions
  ): void {
    const point = isoPoint(x, y);
    const root = new PIXI.Container();
    root.position.set(point.x, point.y);
    root.eventMode = "none";
    root.interactiveChildren = false;

    if (options.showUnderground) {
      if (cell.conduit === 0) return;
      const soil = new PIXI.Graphics();
      drawDiamond(soil, 0, 0, 0x4b342c, 0.92, 0x231f26);
      root.addChild(soil, createLocalConduit(cell.conduit, false));
      addPreviewValidityOverlay(root, options.previewValid);
      layer.addChild(root);
      return;
    }

    if (cell.surface === null) return;

    if (cell.surface === "road") {
      root.addChild(createRoadGraphic(options.connectedRoad));
    } else if (cell.surface === "park") {
      const parkTile = new PIXI.Graphics();
      drawDiamond(parkTile, 0, 0, 0x5da965, 0.9, 0x347343);
      root.addChild(parkTile);
      const parkTexture = textures[(x + y) % 2 === 0 ? "treeA" : "hedge"];
      if (parkTexture) {
        const parkSprite = makeSprite(parkTexture, 48, 52);
        parkSprite.position.set(0, 4);
        root.addChild(parkSprite);
      }
    } else if (cell.surface === "plaza") {
      const plaza = new PIXI.Graphics();
      drawDiamond(plaza, 0, 0, 0xb7aa91, 1, 0x5b5b58);
      root.addChild(plaza);
      const utilityTexture = textures.utility;
      if (utilityTexture) {
        const utility = makeSprite(utilityTexture, 42, 50);
        utility.position.set(0, 5);
        root.addChild(utility);
      }
    } else {
      const pad = new PIXI.Graphics();
      const padColor = cell.surface === "home" ? 0x83b67c : 0xb99b72;
      drawDiamond(pad, 0, 0, padColor, 0.96, cell.surface === "home" ? 0x476c4d : 0x705b43);
      root.addChild(pad);
      const textureKey = visualTextureKey(cell);
      const texture = textureKey ? textures[textureKey] : undefined;
      if (texture) {
        const maxWidth = cell.visual === "home" ? 52 : cell.visual === "apartment" ? 48 : 44;
        const maxHeight = cell.visual === "apartment" ? 72 : cell.visual === "home" ? 46 : 60;
        const sprite = makeSprite(texture, maxWidth, maxHeight);
        sprite.position.set(0, 5);
        root.addChild(sprite);
      }
      if (!options.activeBuilding && options.previewValid === null) {
        const warning = makeLabel("!", 0xff7369, 15);
        warning.position.set(19, -28);
        root.addChild(warning);
      }
    }

    addPreviewValidityOverlay(root, options.previewValid);
    layer.addChild(root);
  }

  function drawConduit(layer: PIXI.Container, x: number, y: number, mask: number, connected: boolean): void {
    if (mask === 0) return;
    const point = isoPoint(x, y);
    const root = new PIXI.Container();
    root.position.set(point.x, point.y);
    root.eventMode = "none";
    root.addChild(createLocalConduit(mask, connected));
    layer.addChild(root);
  }

  function loadImageTexture(path: string): Promise<PIXI.Texture> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        try {
          const texture = PIXI.Texture.from(image);
          if (texture.source) texture.source.scaleMode = "nearest";
          resolve(texture);
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => reject(new Error(`Unable to load texture: ${path}`));
      image.src = path;
    });
  }

  async function loadTextures(): Promise<TextureMap> {
    const files: Readonly<Record<string, string>> = Object.freeze({
      home: SKYLINE_ASSET_URLS.home,
      shop: SKYLINE_ASSET_URLS.shop,
      apartment: SKYLINE_ASSET_URLS.apartment,
      tower: SKYLINE_ASSET_URLS.tower,
      powerPlant: SKYLINE_ASSET_URLS.powerPlant,
      utility: SKYLINE_ASSET_URLS.utility,
      treeA: SKYLINE_ASSET_URLS.treeA,
      treeB: SKYLINE_ASSET_URLS.treeB,
      hedge: SKYLINE_ASSET_URLS.hedge,
      boulders: SKYLINE_ASSET_URLS.boulders,
      rock: SKYLINE_ASSET_URLS.rock,
      gate: SKYLINE_ASSET_URLS.gate,
      smoke: SKYLINE_ASSET_URLS.smoke,
      indicator: SKYLINE_ASSET_URLS.indicator,
      coin: SKYLINE_ASSET_URLS.coin
    });
    const entries = await Promise.all(Object.entries(files).map(async ([key, path]) => {
      return [key, await loadImageTexture(path)] as const;
    }));
    return Object.freeze(Object.fromEntries(entries) as Record<string, PIXI.Texture>);
  }

  export async function createGamePresenter(): Promise<GamePresenter> {
    const textures = await loadTextures();
    let initialized = false;
    let backgroundLayer!: PIXI.Container;
    let worldRoot!: PIXI.Container;
    let undergroundLayer!: PIXI.Container;
    let surfaceBaseLayer!: PIXI.Container;
    let environmentLayer!: PIXI.Container;
    let actorLayer!: PIXI.Container;
    let shadowLayer!: PIXI.Container;
    let hoverLayer!: PIXI.Container;
    let worldEffectsLayer!: PIXI.Container;
    let latestViewport: SfhsViewportState | undefined;
    let worldScale = 1;
    let worldPositionX = BOARD_ORIGIN_X;
    let worldPositionY = BOARD_CENTER_Y;
    let lastBoardRevision = -1;
    let lastPreviewSignature = "";
    let lastPieceSerial = -1;
    let lastPlacementEvent = -1;
    let spawnStartedAt = 0;
    let layerMix = 0;
    let dropEffect: { container: PIXI.Container; startedAt: number; cells: readonly GridPoint[] } | null = null;

    function initialize(layers: SfhsPixiStageLayers): void {
      if (initialized) return;
      initialized = true;
      backgroundLayer = layers.backgroundLayer;
      worldRoot = new PIXI.Container({ label: "skyline-board-root" });
      undergroundLayer = new PIXI.Container({ label: "skyline-underground" });
      surfaceBaseLayer = new PIXI.Container({ label: "skyline-surface" });
      environmentLayer = new PIXI.Container({ label: "skyline-environment" });
      actorLayer = new PIXI.Container({ label: "skyline-districts" });
      shadowLayer = new PIXI.Container({ label: "skyline-preview-shadows" });
      hoverLayer = new PIXI.Container({ label: "skyline-preview" });
      worldEffectsLayer = new PIXI.Container({ label: "skyline-effects" });
      for (const layer of [backgroundLayer, worldRoot, undergroundLayer, surfaceBaseLayer, environmentLayer, actorLayer, shadowLayer, hoverLayer, worldEffectsLayer]) {
        layer.eventMode = "none";
        layer.interactiveChildren = false;
      }
      worldRoot.addChild(undergroundLayer, surfaceBaseLayer, environmentLayer, actorLayer, shadowLayer, hoverLayer, worldEffectsLayer);
      layers.environmentLayer.addChild(worldRoot);

      const background = new PIXI.Graphics();
      background.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT).fill(0x17283c);
      background.circle(110, 180, 170).fill({ color: 0x315972, alpha: 0.38 });
      background.circle(610, 220, 210).fill({ color: 0x5a715c, alpha: 0.22 });
      background.rect(0, 645, LOGICAL_WIDTH, 315).fill({ color: 0x101b2b, alpha: 0.72 });
      backgroundLayer.addChild(background);
      const skyline = new PIXI.Container();
      skyline.alpha = 0.28;
      const distantTower = makeSprite(textures.tower!, 100, 160);
      distantTower.position.set(88, 220);
      const distantPlant = makeSprite(textures.powerPlant!, 120, 145);
      distantPlant.position.set(632, 245);
      skyline.addChild(distantTower, distantPlant);
      backgroundLayer.addChild(skyline);
      if (latestViewport) applyViewport(latestViewport);
    }

    function buildBoard(snapshot: PresentationSnapshot): void {
      destroyChildren(undergroundLayer);
      destroyChildren(surfaceBaseLayer);
      destroyChildren(environmentLayer);
      destroyChildren(actorLayer);
      const state = snapshot.state;
      const level = snapshot.level;
      const connectedRoads = new Set(state.metrics.connectedRoadKeys);
      const connectedUtilities = new Set(state.metrics.connectedUtilityKeys);
      const activeBuildings = new Set(state.metrics.activeBuildingKeys);

      const orderedCells: GridPoint[] = [];
      for (let y = 0; y < BOARD_SIZE; y += 1) for (let x = 0; x < BOARD_SIZE; x += 1) orderedCells.push({ x, y });
      orderedCells.sort((left, right) => (left.x + left.y) - (right.x + right.y) || left.y - right.y);

      for (const pointCell of orderedCells) {
        const { x, y } = pointCell;
        const point = isoPoint(x, y);
        const terrain = level.terrain[indexOf(x, y)] ?? "empty";
        const placed = state.occupied[indexOf(x, y)];

        const soil = new PIXI.Graphics();
        drawDiamond(soil, point.x, point.y, terrain === "hill" ? 0x3f4652 : 0x4b342c, 1, 0x231f26);
        undergroundLayer.addChild(soil);
        if (terrain === "hill") {
          const stone = new PIXI.Graphics();
          stone.circle(point.x - 8, point.y - 1, 8).fill(0x555d68);
          stone.circle(point.x + 7, point.y + 2, 9).fill(0x444b56);
          undergroundLayer.addChild(stone);
        }
        const mask = (x === level.hub.x && y === level.hub.y) ? level.hubMask : (placed?.conduit ?? 0);
        drawConduit(undergroundLayer, x, y, mask, connectedUtilities.has(keyOf(x, y)));

        const tile = new PIXI.Graphics();
        const baseColor = terrain === "hill" ? 0x8b845c : terrain === "tree" ? 0x6f9d57 : ((x + y) % 2 === 0 ? 0x83b866 : 0x78ad5d);
        drawDiamond(tile, point.x, point.y, baseColor, 1, 0x36513d);
        surfaceBaseLayer.addChild(tile);

        if (x === level.entrance.x && y === level.entrance.y) {
          drawRoadTile(actorLayer, x, y, true);
          const gate = makeSprite(textures.gate!, 72, 65, 0.84);
          gate.position.set(point.x, point.y + 4);
          actorLayer.addChild(gate);
          const label = makeLabel("ROAD", 0xffe083, 10);
          label.position.set(point.x, point.y + 27);
          actorLayer.addChild(label);
        }
        if (x === level.hub.x && y === level.hub.y) {
          const hub = makeSprite(textures.utility!, 58, 64, 0.82);
          hub.position.set(point.x, point.y + 4);
          environmentLayer.addChild(hub);
          const label = makeLabel("HUB", 0x6fe3ff, 10);
          label.position.set(point.x, point.y + 27);
          environmentLayer.addChild(label);
        }

        if (terrain !== "empty") {
          const texture = textures[terrainTextureKey(terrain, x, y)];
          if (texture) {
            const sprite = makeSprite(texture, terrain === "tree" ? 66 : 74, terrain === "tree" ? 82 : 62);
            sprite.position.set(point.x, point.y + 5);
            environmentLayer.addChild(sprite);
          }
        }

        if (!placed) continue;
        renderDistrictCell(actorLayer, x, y, placed, textures, {
          connectedRoad: connectedRoads.has(keyOf(x, y)),
          activeBuilding: activeBuildings.has(keyOf(x, y)),
          previewValid: null,
          showUnderground: false
        });
      }
      lastBoardRevision = state.visualRevision;
    }

    function buildPreview(snapshot: PresentationSnapshot): void {
      destroyChildren(shadowLayer);
      destroyChildren(hoverLayer);
      const preview = snapshot.preview;
      const showUnderground = snapshot.state.viewLayer === "underground";
      const visibleCells = preview.cells
        .filter((entry) => inBounds(entry.x, entry.y))
        .filter((entry) => showUnderground ? entry.cell.conduit !== 0 : entry.cell.surface !== null)
        .slice()
        .sort((left, right) => (left.x + left.y) - (right.x + right.y) || left.y - right.y);

      for (const entry of visibleCells) {
        const groundPoint = isoPoint(entry.x, entry.y);
        const shadowCell = new PIXI.Container();
        shadowCell.position.set(groundPoint.x, groundPoint.y);
        shadowCell.eventMode = "none";
        const shadow = new PIXI.Graphics();
        drawLandingShadow(shadow, preview.valid);
        shadowCell.addChild(shadow);
        shadowLayer.addChild(shadowCell);

        renderDistrictCell(hoverLayer, entry.x, entry.y, entry.cell, textures, {
          connectedRoad: false,
          activeBuilding: true,
          previewValid: preview.valid,
          showUnderground
        });
      }
      lastPreviewSignature = `${snapshot.state.currentPieceId}:${snapshot.state.remixVariant}:${snapshot.state.rotation}:${snapshot.state.anchor.x}:${snapshot.state.anchor.y}:${snapshot.state.viewLayer}:${preview.valid}`;
    }

    function startDropEffect(snapshot: PresentationSnapshot, nowMs: number): void {
      const event = snapshot.state.lastPlacement;
      if (!event || event.id === lastPlacementEvent) return;
      lastPlacementEvent = event.id;
      if (dropEffect) dropEffect.container.destroy({ children: true });
      const container = new PIXI.Container();
      container.eventMode = "none";
      for (const cell of event.cells) {
        const point = isoPoint(cell.x, cell.y);
        const puff = makeSprite(textures.smoke!, 48, 34);
        puff.position.set(point.x, point.y + 11);
        puff.alpha = 0.5;
        container.addChild(puff);
      }
      worldEffectsLayer.addChild(container);
      dropEffect = { container, startedAt: nowMs, cells: event.cells };
    }

    function animate(snapshot: PresentationSnapshot, nowMs: number): void {
      const targetMix = snapshot.state.viewLayer === "underground" ? 1 : 0;
      layerMix += (targetMix - layerMix) * 0.18;
      undergroundLayer.alpha = layerMix;
      surfaceBaseLayer.alpha = 1 - layerMix * 0.82;
      environmentLayer.alpha = 1 - layerMix * 0.88;
      actorLayer.alpha = 1 - layerMix * 0.72;
      shadowLayer.alpha = snapshot.state.phase === "playing" ? 1 - layerMix * 0.45 : 0;
      hoverLayer.alpha = snapshot.state.phase === "playing" ? 1 : 0;

      const age = Math.max(0, nowMs - spawnStartedAt);
      const arrival = Math.max(0, 1 - Math.min(1, age / 320));
      const bob = Math.sin(nowMs / 430) * 5;
      hoverLayer.y = -HOVER_HEIGHT - arrival * 150 + bob;
      shadowLayer.alpha *= 0.72 + Math.sin(nowMs / 430) * 0.06;

      if (dropEffect) {
        const elapsed = nowMs - dropEffect.startedAt;
        const progress = Math.min(1, elapsed / 420);
        dropEffect.container.alpha = 1 - progress;
        dropEffect.container.scale.set(0.75 + progress * 0.65);
        if (progress >= 1) {
          dropEffect.container.destroy({ children: true });
          dropEffect = null;
        }
      }
    }

    function present(snapshot: PresentationSnapshot, alpha: number, layers: SfhsPixiStageLayers): void {
      initialize(layers);
      const nowMs = performance.now();
      if (snapshot.state.visualRevision !== lastBoardRevision) buildBoard(snapshot);
      const signature = `${snapshot.state.currentPieceId}:${snapshot.state.remixVariant}:${snapshot.state.rotation}:${snapshot.state.anchor.x}:${snapshot.state.anchor.y}:${snapshot.state.viewLayer}:${snapshot.preview.valid}`;
      if (signature !== lastPreviewSignature) buildPreview(snapshot);
      if (snapshot.state.pieceSerial !== lastPieceSerial) {
        lastPieceSerial = snapshot.state.pieceSerial;
        spawnStartedAt = nowMs;
      }
      startDropEffect(snapshot, nowMs);
      animate(snapshot, nowMs);
    }

    function applyViewport(viewport: SfhsViewportState): void {
      latestViewport = viewport;
      if (!initialized) return;
        worldScale = viewport.orientation === "portrait" ? PORTRAIT_WORLD_SCALE : 1;
        worldPositionX = BOARD_ORIGIN_X;
        worldPositionY = viewport.orientation === "portrait" ? PORTRAIT_WORLD_CENTER_Y : BOARD_CENTER_Y;
        worldRoot.pivot.set(BOARD_ORIGIN_X, BOARD_CENTER_Y);
        worldRoot.position.set(worldPositionX, worldPositionY);
        worldRoot.scale.set(worldScale);
    }

    const pixiPresenter: SfhsPixiPresenter<PresentationSnapshot> = {
      present,
      destroy(): void {
        if (initialized) worldRoot.destroy({ children: true });
        initialized = false;
      }
    };
    const presentation = createSfhsPixiV8Presentation({ backgroundColor: 0x17283c, presenter: pixiPresenter });
    return Object.freeze({
      presentation,
      resize(viewport: SfhsViewportState): void {
        applyViewport(viewport);
        const canvas = presentation.getPrimarySurface();
        canvas.setAttribute("aria-label", "Isometric city board");
        canvas.tabIndex = 0;
        canvas.dataset.worldFraming = viewport.orientation === "portrait" ? "portrait-large" : "landscape-default";
        canvas.dataset.worldScale = worldScale.toFixed(2);
      },
      screenToGrid(logicalX: number, logicalY: number): GridPoint | null {
        const worldX = (logicalX - worldPositionX) / worldScale + BOARD_ORIGIN_X;
        const worldY = (logicalY - worldPositionY) / worldScale + BOARD_CENTER_Y;
        const relativeX = (worldX - BOARD_ORIGIN_X) / (TILE_WIDTH / 2);
        const relativeY = (worldY - BOARD_ORIGIN_Y) / (TILE_HEIGHT / 2);
        const x = Math.floor((relativeX + relativeY) / 2 + 0.5);
        const y = Math.floor((relativeY - relativeX) / 2 + 0.5);
        if (!inBounds(x, y)) return null;
        return Object.freeze({ x, y });
      }
    });
  }
