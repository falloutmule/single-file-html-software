namespace SkylineDrop {
  function withMessage(state: GameState, message: string, kind: GameState["statusKind"] = "normal"): GameState {
    return Object.freeze({
      ...state,
      statusMessage: message,
      statusKind: kind,
      statusRevision: state.statusRevision + 1
    });
  }

  function currentLevel(state: GameState): LevelDefinition { return levelAt(state.levelIndex); }

  export function currentRotatedPiece(state: GameState): RotatedPiece {
    const definition = roadRemixedPiece(pieceById(state.currentPieceId), state.remixVariant);
    return rotatePiece(definition, state.rotation);
  }

  export function placementPreview(state: GameState): PlacementPreview {
    const level = currentLevel(state);
    const piece = currentRotatedPiece(state);
    const cells = piece.cells.map((cell) => Object.freeze({
      x: state.anchor.x + cell.x,
      y: state.anchor.y + cell.y,
      cell
    }));
    let reason = "";
    for (const entry of cells) {
      if (!inBounds(entry.x, entry.y)) {
        reason = "The district would extend beyond the planning boundary.";
        break;
      }
      const terrainKind = level.terrain[indexOf(entry.x, entry.y)] ?? "empty";
      const existing = state.occupied[indexOf(entry.x, entry.y)];
      if (entry.cell.surface !== null) {
        if (terrainKind === "tree") { reason = "Trees already occupy part of this footprint."; break; }
        if (terrainKind === "hill") { reason = "A hill blocks this surface footprint."; break; }
        const sharedRoad = entry.cell.surface === "road" && existing?.surface === "road";
        if (existing && existing.surface !== null && !sharedRoad) {
          reason = "Another district already occupies this cell.";
          break;
        }
      }
      if (entry.cell.conduit !== 0) {
        if (terrainKind === "hill") { reason = "Bedrock blocks the underground conduit."; break; }
        // Existing conduit is intentionally allowed. Overlapping routes merge their
        // directional masks when the piece is placed, creating a shared junction.
      }
      if (entry.x === level.entrance.x && entry.y === level.entrance.y) {
        reason = "The city entrance must remain open.";
        break;
      }
      if (entry.x === level.hub.x && entry.y === level.hub.y) {
        reason = "The municipal utility hub must remain accessible.";
        break;
      }
    }
    return Object.freeze({ valid: reason === "", reason, piece, cells: Object.freeze(cells) });
  }

  function roadAt(state: GameState, level: LevelDefinition, x: number, y: number): boolean {
    if (x === level.entrance.x && y === level.entrance.y) return true;
    const cell = state.occupied[indexOf(x, y)];
    return cell?.surface === "road";
  }

  function conduitAt(state: GameState, level: LevelDefinition, x: number, y: number): number {
    if (x === level.hub.x && y === level.hub.y) return level.hubMask;
    return state.occupied[indexOf(x, y)]?.conduit ?? 0;
  }

  function connectedRoads(state: GameState, level: LevelDefinition): Set<string> {
    const visited = new Set<string>();
    const queue: GridPoint[] = [{ x: level.entrance.x, y: level.entrance.y }];
    while (queue.length > 0) {
      const point = queue.shift();
      if (!point) break;
      const key = keyOf(point.x, point.y);
      if (visited.has(key) || !roadAt(state, level, point.x, point.y)) continue;
      visited.add(key);
      for (const step of CARDINALS) {
        const x = point.x + step.dx;
        const y = point.y + step.dy;
        if (inBounds(x, y) && roadAt(state, level, x, y) && !visited.has(keyOf(x, y))) queue.push({ x, y });
      }
    }
    return visited;
  }

  function connectedUtilities(state: GameState, level: LevelDefinition): Set<string> {
    const visited = new Set<string>();
    const queue: GridPoint[] = [{ x: level.hub.x, y: level.hub.y }];
    while (queue.length > 0) {
      const point = queue.shift();
      if (!point) break;
      const key = keyOf(point.x, point.y);
      if (visited.has(key)) continue;
      const mask = conduitAt(state, level, point.x, point.y);
      if (mask === 0) continue;
      visited.add(key);
      for (const step of CARDINALS) {
        if ((mask & step.direction) === 0) continue;
        const x = point.x + step.dx;
        const y = point.y + step.dy;
        if (!inBounds(x, y)) continue;
        const neighborMask = conduitAt(state, level, x, y);
        const isHub = point.x === level.hub.x && point.y === level.hub.y;
        if ((isHub ? neighborMask !== 0 : (neighborMask & oppositeDirection(step.direction)) !== 0) && !visited.has(keyOf(x, y))) queue.push({ x, y });
      }
    }
    return visited;
  }

  function hasRoadAccess(state: GameState, roads: Set<string>, x: number, y: number): boolean {
    for (const step of CARDINALS) if (roads.has(keyOf(x + step.dx, y + step.dy))) return true;
    if (roads.has(keyOf(x, y))) return true;
    const building = state.occupied[indexOf(x, y)];
    if (!building) return false;
    for (let py = 0; py < BOARD_SIZE; py += 1) {
      for (let px = 0; px < BOARD_SIZE; px += 1) {
        const sibling = state.occupied[indexOf(px, py)];
        if (!sibling || sibling.surface !== "road" || !roads.has(keyOf(px, py))) continue;
        const roadOwners = sibling.roadOwners ?? Object.freeze([sibling.pieceSerial]);
        if (roadOwners.includes(building.pieceSerial)) return true;
      }
    }
    return false;
  }

  function hasGreenNeighbor(state: GameState, level: LevelDefinition, x: number, y: number): boolean {
    for (const step of CARDINALS) {
      const nx = x + step.dx;
      const ny = y + step.dy;
      if (!inBounds(nx, ny)) continue;
      if (level.terrain[indexOf(nx, ny)] === "tree") return true;
      if (state.occupied[indexOf(nx, ny)]?.surface === "park") return true;
    }
    return false;
  }

  export function calculateMetrics(state: GameState): Metrics {
    const level = currentLevel(state);
    const roads = connectedRoads(state, level);
    const utilities = connectedUtilities(state, level);
    const activeBuildings = new Set<string>();
    const greenHomes = new Set<string>();
    const compact = state.upgrades.includes("compact-housing");
    const business = state.upgrades.includes("small-business");
    let population = 0;
    let jobs = 0;
    let totalBuildings = 0;
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const cell = state.occupied[indexOf(x, y)];
        if (!cell || (cell.surface !== "home" && cell.surface !== "shop")) continue;
        totalBuildings += 1;
        const key = keyOf(x, y);
        const active = hasRoadAccess(state, roads, x, y) && utilities.has(key);
        if (!active) continue;
        activeBuildings.add(key);
        if (cell.surface === "home") {
          population += cell.population + (compact ? 1 : 0);
          if (hasGreenNeighbor(state, level, x, y)) greenHomes.add(key);
        } else {
          jobs += cell.jobs + (business ? 1 : 0);
        }
      }
    }
    const utilityCoverage = totalBuildings === 0 ? 0 : Math.round(activeBuildings.size / totalBuildings * 100);
    const activeHomes = [...activeBuildings].filter((key) => {
      const [xText, yText] = key.split(",");
      const x = Number(xText);
      const y = Number(yText);
      return state.occupied[indexOf(x, y)]?.surface === "home";
    }).length;
    const greeneryCoverage = activeHomes === 0 ? 0 : Math.round(greenHomes.size / activeHomes * 100);
    return Object.freeze({
      population,
      jobs,
      utilityCoverage,
      greeneryCoverage,
      totalBuildings,
      activeBuildings: activeBuildings.size,
      connectedRoadKeys: Object.freeze([...roads]),
      connectedUtilityKeys: Object.freeze([...utilities]),
      activeBuildingKeys: Object.freeze([...activeBuildings]),
      greenHomeKeys: Object.freeze([...greenHomes])
    });
  }

  export function objectivesMet(state: GameState): boolean {
    const level = currentLevel(state);
    const metrics = state.metrics;
    return metrics.population >= level.populationTarget
      && metrics.jobs >= level.jobsTarget
      && metrics.utilityCoverage >= level.utilityTarget
      && metrics.greeneryCoverage >= level.greeneryTarget;
  }

  function nextPieceId(level: LevelDefinition, queueIndex: number): string {
    return level.queue[queueIndex % level.queue.length] ?? "row-homes";
  }

  function dropCurrentPiece(state: GameState): GameState {
    const preview = placementPreview(state);
    if (!preview.valid) return withMessage(state, preview.reason || "That district cannot be placed there.", "error");
    const occupied = [...state.occupied];
    let mergedUtilityCells = 0;
    let mergedRoadCells = 0;
    for (const entry of preview.cells) {
      const previous = occupied[indexOf(entry.x, entry.y)];
      const incomingSurface = entry.cell.surface !== null;
      const sharedRoad = entry.cell.surface === "road" && previous?.surface === "road";
      const preserveExistingSurface = (!incomingSurface && previous?.surface !== null && previous?.surface !== undefined) || sharedRoad;
      const previousConduit = previous?.conduit ?? 0;
      const mergedConduit = previousConduit | entry.cell.conduit;
      if (previousConduit !== 0 && entry.cell.conduit !== 0) mergedUtilityCells += 1;
      if (sharedRoad) mergedRoadCells += 1;

      const previousRoadOwners = previous?.surface === "road"
        ? previous.roadOwners ?? Object.freeze([previous.pieceSerial])
        : Object.freeze([] as number[]);
      const nextRoadOwners = entry.cell.surface === "road"
        ? Object.freeze([...new Set([...previousRoadOwners, state.pieceSerial])])
        : previous?.surface === "road" && !incomingSurface
          ? previousRoadOwners
          : null;

      const newCell: PlacedCell = Object.freeze({
        // Underground-only placements crossing an existing surface cell must not
        // steal that building's district identity; road-access checks depend on it.
        pieceSerial: preserveExistingSurface ? previous.pieceSerial : state.pieceSerial,
        pieceId: preserveExistingSurface ? previous.pieceId : state.currentPieceId,
        ...(nextRoadOwners ? { roadOwners: nextRoadOwners } : {}),
        surface: incomingSurface ? entry.cell.surface : previous?.surface ?? null,
        visual: incomingSurface ? entry.cell.visual : previous?.visual ?? entry.cell.visual,
        conduit: mergedConduit,
        population: incomingSurface ? entry.cell.population ?? 0 : previous?.population ?? 0,
        jobs: incomingSurface ? entry.cell.jobs ?? 0 : previous?.jobs ?? 0
      });
      occupied[indexOf(entry.x, entry.y)] = newCell;
    }
    const level = currentLevel(state);
    const queueIndex = state.queueIndex + 1;
    const currentPieceId = nextPieceId(level, queueIndex);
    let next: GameState = Object.freeze({
      ...state,
      occupied: Object.freeze(occupied),
      turn: state.turn + 1,
      queueIndex,
      currentPieceId,
      anchor: initialAnchorForPiece(currentPieceId),
      rotation: 0,
      remixVariant: 0,
      pieceSerial: state.pieceSerial + 1,
      lastPlacement: Object.freeze({
        id: state.pieceSerial,
        pieceId: state.currentPieceId,
        rotation: state.rotation,
        anchor: state.anchor,
        cells: Object.freeze(preview.cells.map((entry) => Object.freeze({ x: entry.x, y: entry.y }))),
        valid: true
      }),
      statusMessage: mergedRoadCells > 0 || mergedUtilityCells > 0
        ? `District placed. ${[
            mergedRoadCells > 0
              ? `${mergedRoadCells} shared road ${mergedRoadCells === 1 ? "cell reused" : "cells reused"}`
              : "",
            mergedUtilityCells > 0
              ? `${mergedUtilityCells} overlapping utility ${mergedUtilityCells === 1 ? "cell merged" : "cells merged"}`
              : ""
          ].filter(Boolean).join(" · ")}.`
        : "District placed. Networks recalculated.",
      statusKind: "normal",
      statusRevision: state.statusRevision + 1,
      visualRevision: state.visualRevision + 1
    });
    next = Object.freeze({ ...next, metrics: calculateMetrics(next) });
    if (objectivesMet(next)) {
      return Object.freeze({
        ...next,
        phase: "level-complete",
        statusMessage: "Objectives complete!",
        statusKind: "success",
        statusRevision: next.statusRevision + 1
      });
    }
    if (next.turn >= level.dropLimit) {
      return Object.freeze({
        ...next,
        phase: "lost",
        statusMessage: "The planning window closed before the objectives were met.",
        statusKind: "error",
        statusRevision: next.statusRevision + 1
      });
    }
    return next;
  }

  function chooseUpgrade(state: GameState, upgrade: UpgradeId): GameState {
    if (state.phase !== "upgrade") return state;
    const newlySelected = !state.upgrades.includes(upgrade);
    const upgrades = newlySelected ? Object.freeze([...state.upgrades, upgrade]) : state.upgrades;
    const remixCharges = newlySelected && upgrade === "remix-permit" ? state.remixCharges + 1 : state.remixCharges;
    return createLevelState(Object.freeze({ ...state, upgrades, remixCharges }), state.levelIndex + 1, "playing");
  }

  function redraw(state: GameState): GameState {
    if (state.phase !== "playing") return state;
    if (!state.upgrades.includes("planning-office")) return withMessage(state, "The Planning Office upgrade is required.", "error");
    if (state.redrawUsedThisLevel) return withMessage(state, "The level redraw has already been used.", "error");
    const level = currentLevel(state);
    const queueIndex = state.queueIndex + 1;
    const currentPieceId = nextPieceId(level, queueIndex);
    return withMessage(Object.freeze({
      ...state,
      queueIndex,
      currentPieceId,
      anchor: initialAnchorForPiece(currentPieceId),
      rotation: 0,
      remixVariant: 0,
      redrawUsedThisLevel: true,
      pieceSerial: state.pieceSerial + 1,
      visualRevision: state.visualRevision + 1
    }), "Planning Office supplied a new district.", "normal");
  }

  function roadRemix(state: GameState): GameState {
    if (state.phase !== "playing") return state;
    const definition = pieceById(state.currentPieceId);
    const variantCount = roadRemixVariantCount(definition);
    if (variantCount <= 1) return withMessage(state, "No alternate road plan exists for this district.", "error");
    if (state.remixCharges <= 0) return withMessage(state, "No Road Remix charges remain.", "error");
    const remixVariant = (state.remixVariant + 1) % variantCount;
    const remixCharges = state.remixCharges - 1;
    const planName = roadRemixPlanName(definition, remixVariant);
    return withMessage(Object.freeze({
      ...state,
      remixVariant,
      remixCharges,
      visualRevision: state.visualRevision + 1
    }), `Road plan changed to ${planName}. ${remixCharges} Road Remix ${remixCharges === 1 ? "charge" : "charges"} remaining.`, "normal");
  }

  export function reduceGameState(state: GameState, action: GameAction): GameState {
    if (action.type === "start") {
      if (state.phase !== "title") return state;
      return createLevelState(state, 0, "playing");
    }
    if (action.type === "toggle-pause") {
      if (state.phase === "paused") return Object.freeze({ ...state, phase: state.phaseBeforePause ?? "playing", phaseBeforePause: null });
      if (state.phase === "playing") return Object.freeze({ ...state, phase: "paused", phaseBeforePause: state.phase });
      return state;
    }
    if (action.type === "restart-level") return createLevelState(state, state.levelIndex, "playing");
    if (action.type === "continue") {
      if (state.phase === "level-complete") {
        if (state.levelIndex >= LEVELS.length - 1) return Object.freeze({ ...state, phase: "won" });
        return Object.freeze({ ...state, phase: "upgrade" });
      }
      if (state.phase === "lost" || state.phase === "won") return createLevelState(state, 0, "playing");
      return state;
    }
    if (action.type === "choose-upgrade") return chooseUpgrade(state, action.upgrade);
    if (state.phase !== "playing") return state;

    if (action.type === "move") {
      const piece = currentRotatedPiece(state);
      const x = Math.max(-piece.width + 1, Math.min(BOARD_SIZE - 1, state.anchor.x + action.dx));
      const y = Math.max(-piece.height + 1, Math.min(BOARD_SIZE - 1, state.anchor.y + action.dy));
      return Object.freeze({ ...state, anchor: Object.freeze({ x, y }) });
    }
    if (action.type === "select-cell") return Object.freeze({ ...state, anchor: Object.freeze({ x: action.x, y: action.y }) });
    if (action.type === "rotate") {
      const rotation = (state.rotation + action.direction + 4) % 4;
      const piece = rotatePiece(pieceById(state.currentPieceId), rotation);
      const anchor = Object.freeze({
        x: Math.max(-piece.width + 1, Math.min(BOARD_SIZE - 1, state.anchor.x)),
        y: Math.max(-piece.height + 1, Math.min(BOARD_SIZE - 1, state.anchor.y))
      });
      return Object.freeze({ ...state, rotation, anchor });
    }
    if (action.type === "drop") return dropCurrentPiece(state);
    if (action.type === "toggle-layer") {
      const viewLayer: ViewLayer = state.viewLayer === "surface" ? "underground" : "surface";
      return withMessage(Object.freeze({ ...state, viewLayer }), viewLayer === "surface" ? "Surface view" : "Underground utility view", "normal");
    }
    if (action.type === "redraw") return redraw(state);
    if (action.type === "remix") return roadRemix(state);
    return state;
  }

  export function stepGame(state: GameState, actions: ActionSnapshot): GameState {
    let next = state;
    for (const action of actions.actions) next = reduceGameState(next, action);
    if (next.phase === "playing") next = Object.freeze({ ...next, ticks: next.ticks + 1 });
    return next;
  }

  export function createPresentationSnapshot(state: GameState): PresentationSnapshot {
    const level = currentLevel(state);
    const currentPiece = currentRotatedPiece(state);
    const preview = placementPreview(state);
    const nextNames: string[] = [];
    for (let offset = 1; offset <= 2; offset += 1) {
      const id = level.queue[(state.queueIndex + offset) % level.queue.length];
      if (id) nextNames.push(pieceById(id).name);
    }
    return Object.freeze({ state, level, currentPiece, preview, nextNames: Object.freeze(nextNames) });
  }
}
