namespace SkylineDrop {
  export const EMPTY_METRICS: Metrics = Object.freeze({
    population: 0,
    jobs: 0,
    utilityCoverage: 0,
    greeneryCoverage: 0,
    totalBuildings: 0,
    activeBuildings: 0,
    connectedRoadKeys: Object.freeze([]),
    connectedUtilityKeys: Object.freeze([]),
    activeBuildingKeys: Object.freeze([]),
    greenHomeKeys: Object.freeze([])
  });

  export function initialAnchorForPiece(pieceId: string): GridPoint {
    const piece = rotatePiece(pieceById(pieceId), 0);
    return Object.freeze({
      x: Math.max(0, Math.floor((BOARD_SIZE - piece.width) / 2)),
      y: Math.max(0, BOARD_SIZE - piece.height - 1)
    });
  }

  export function createInitialState(): GameState {
    const level = levelAt(0);
    const currentPieceId = level.queue[0] ?? "row-homes";
    return Object.freeze({
      phase: "title",
      phaseBeforePause: null,
      ticks: 0,
      levelIndex: 0,
      turn: 0,
      occupied: Object.freeze(Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null)),
      currentPieceId,
      queueIndex: 0,
      anchor: initialAnchorForPiece(currentPieceId),
      rotation: 0,
      viewLayer: "surface",
      upgrades: Object.freeze([]),
      redrawUsedThisLevel: false,
      remixCharges: 1,
      remixVariant: 0,
      metrics: EMPTY_METRICS,
      pieceSerial: 1,
      lastPlacement: null,
      statusMessage: "",
      statusKind: "normal",
      statusRevision: 0,
      visualRevision: 0
    });
  }

  export function createLevelState(previous: GameState, levelIndex: number, phase: GamePhase = "playing"): GameState {
    const level = levelAt(levelIndex);
    const currentPieceId = level.queue[0] ?? "row-homes";
    const base: GameState = Object.freeze({
      phase,
      phaseBeforePause: null,
      ticks: previous.ticks,
      levelIndex,
      turn: 0,
      occupied: Object.freeze(Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null)),
      currentPieceId,
      queueIndex: 0,
      anchor: initialAnchorForPiece(currentPieceId),
      rotation: 0,
      viewLayer: "surface",
      upgrades: previous.upgrades,
      redrawUsedThisLevel: false,
      remixCharges: previous.remixCharges,
      remixVariant: 0,
      metrics: EMPTY_METRICS,
      pieceSerial: previous.pieceSerial + 1,
      lastPlacement: null,
      statusMessage: `Level ${levelIndex + 1}: ${level.name}`,
      statusKind: "normal",
      statusRevision: previous.statusRevision + 1,
      visualRevision: previous.visualRevision + 1
    });
    return Object.freeze({ ...base, metrics: calculateMetrics(base) });
  }
}
