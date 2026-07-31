namespace SkylineDrop {
  export const BOARD_SIZE = 8;
  export const LOGICAL_WIDTH = 720;
  export const LOGICAL_HEIGHT = 960;
  export const SIMULATION_HZ = 60;
  export const FIXED_STEP_MS = 1000 / SIMULATION_HZ;
  export const MAX_FRAME_DELTA_MS = 250;

  export const enum Direction {
    North = 1,
    East = 2,
    South = 4,
    West = 8
  }

  export type GamePhase = "title" | "playing" | "upgrade" | "level-complete" | "won" | "lost" | "paused";
  export type ViewLayer = "surface" | "underground";
  export type TerrainKind = "empty" | "tree" | "hill";
  export type SurfaceKind = "road" | "home" | "shop" | "park" | "plaza";
  export type VisualKind = "road" | "home" | "apartment" | "shop" | "park" | "utility" | "bore";
  export type UpgradeId = "compact-housing" | "small-business" | "planning-office" | "remix-permit";

  export interface GridPoint { readonly x: number; readonly y: number; }

  export interface PieceCell {
    readonly x: number;
    readonly y: number;
    readonly surface: SurfaceKind | null;
    readonly visual: VisualKind;
    readonly conduit: number;
    readonly population?: number;
    readonly jobs?: number;
  }

  export interface PieceDefinition {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly roadPlanName?: string;
    readonly cells: readonly PieceCell[];
  }

  export interface RotatedPiece {
    readonly definition: PieceDefinition;
    readonly rotation: number;
    readonly width: number;
    readonly height: number;
    readonly cells: readonly PieceCell[];
  }

  export interface LevelDefinition {
    readonly id: string;
    readonly name: string;
    readonly subtitle: string;
    readonly dropLimit: number;
    readonly populationTarget: number;
    readonly jobsTarget: number;
    readonly utilityTarget: number;
    readonly greeneryTarget: number;
    readonly terrain: readonly TerrainKind[];
    readonly entrance: GridPoint;
    readonly hub: GridPoint;
    readonly hubMask: number;
    readonly queue: readonly string[];
    readonly objectiveText: string;
  }

  export interface PlacedCell {
    readonly pieceSerial: number;
    readonly pieceId: string;
    /**
     * Roads may be shared by more than one placed district. The original
     * pieceSerial/pieceId remain the visual inspection owner, while this list
     * records every district that may use the merged road as one of its own
     * internal road cells.
     */
    readonly roadOwners?: readonly number[];
    readonly surface: SurfaceKind | null;
    readonly visual: VisualKind;
    readonly conduit: number;
    readonly population: number;
    readonly jobs: number;
  }

  export interface Metrics {
    readonly population: number;
    readonly jobs: number;
    readonly utilityCoverage: number;
    readonly greeneryCoverage: number;
    readonly totalBuildings: number;
    readonly activeBuildings: number;
    readonly connectedRoadKeys: readonly string[];
    readonly connectedUtilityKeys: readonly string[];
    readonly activeBuildingKeys: readonly string[];
    readonly greenHomeKeys: readonly string[];
  }

  export interface PlacementEvent {
    readonly id: number;
    readonly pieceId: string;
    readonly rotation: number;
    readonly anchor: GridPoint;
    readonly cells: readonly GridPoint[];
    readonly valid: boolean;
  }

  export interface GameState {
    readonly phase: GamePhase;
    readonly phaseBeforePause: GamePhase | null;
    readonly ticks: number;
    readonly levelIndex: number;
    readonly turn: number;
    readonly occupied: readonly (PlacedCell | null)[];
    readonly currentPieceId: string;
    readonly queueIndex: number;
    readonly anchor: GridPoint;
    readonly rotation: number;
    readonly viewLayer: ViewLayer;
    readonly upgrades: readonly UpgradeId[];
    readonly redrawUsedThisLevel: boolean;
    readonly remixCharges: number;
    readonly remixVariant: number;
    readonly metrics: Metrics;
    readonly pieceSerial: number;
    readonly lastPlacement: PlacementEvent | null;
    readonly statusMessage: string;
    readonly statusKind: "normal" | "error" | "success";
    readonly statusRevision: number;
    readonly visualRevision: number;
  }

  export type GameAction =
    | { readonly type: "start" }
    | { readonly type: "move"; readonly dx: number; readonly dy: number }
    | { readonly type: "select-cell"; readonly x: number; readonly y: number }
    | { readonly type: "rotate"; readonly direction: -1 | 1 }
    | { readonly type: "drop" }
    | { readonly type: "toggle-layer" }
    | { readonly type: "redraw" }
    | { readonly type: "remix" }
    | { readonly type: "restart-level" }
    | { readonly type: "toggle-pause" }
    | { readonly type: "choose-upgrade"; readonly upgrade: UpgradeId }
    | { readonly type: "continue" };

  export interface ActionSnapshot {
    readonly actions: readonly GameAction[];
  }

  export interface PlacementPreview {
    readonly valid: boolean;
    readonly reason: string;
    readonly piece: RotatedPiece;
    readonly cells: readonly { readonly x: number; readonly y: number; readonly cell: PieceCell }[];
  }

  export interface PresentationSnapshot {
    readonly state: Readonly<GameState>;
    readonly level: LevelDefinition;
    readonly currentPiece: RotatedPiece;
    readonly preview: PlacementPreview;
    readonly nextNames: readonly string[];
  }

  export interface UpgradeDefinition {
    readonly id: UpgradeId;
    readonly icon: string;
    readonly name: string;
    readonly description: string;
  }

  export function keyOf(x: number, y: number): string { return `${x},${y}`; }
  export function indexOf(x: number, y: number): number { return y * BOARD_SIZE + x; }
  export function inBounds(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE; }
  export function oppositeDirection(direction: Direction): Direction {
    if (direction === Direction.North) return Direction.South;
    if (direction === Direction.East) return Direction.West;
    if (direction === Direction.South) return Direction.North;
    return Direction.East;
  }
  export const CARDINALS: readonly { readonly dx: number; readonly dy: number; readonly direction: Direction }[] = Object.freeze([
    { dx: 0, dy: -1, direction: Direction.North },
    { dx: 1, dy: 0, direction: Direction.East },
    { dx: 0, dy: 1, direction: Direction.South },
    { dx: -1, dy: 0, direction: Direction.West }
  ]);
}
