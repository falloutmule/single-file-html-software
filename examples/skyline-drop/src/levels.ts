import { BOARD_SIZE, Direction, indexOf, type LevelDefinition, type TerrainKind } from "./types.ts";

  function terrain(entries: readonly [number, number, TerrainKind][]): readonly TerrainKind[] {
    const cells: TerrainKind[] = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => "empty");
    for (const [x, y, kind] of entries) cells[indexOf(x, y)] = kind;
    return Object.freeze(cells);
  }

  export const LEVELS: readonly LevelDefinition[] = Object.freeze([
    Object.freeze({
      id: "open-lot",
      name: "Open Lot",
      subtitle: "Learn the two networks",
      dropLimit: 8,
      populationTarget: 12,
      jobsTarget: 2,
      utilityTarget: 50,
      greeneryTarget: 0,
      entrance: Object.freeze({ x: 4, y: 7 }),
      hub: Object.freeze({ x: 3, y: 7 }),
      hubMask: Direction.North | Direction.East | Direction.South | Direction.West,
      terrain: terrain([
        [0, 0, "tree"], [1, 0, "tree"], [0, 1, "tree"],
        [7, 0, "hill"], [7, 1, "hill"], [6, 0, "hill"],
        [1, 5, "tree"], [6, 5, "tree"]
      ]),
      queue: Object.freeze([
        "row-homes", "main-street", "mixed-corner", "service-bore",
        "apartment-court", "green-strip", "utility-plaza", "main-street",
        "row-homes", "service-bore", "mixed-corner"
      ]),
      objectiveText: "Reach 12 residents and 2 jobs. Buildings count only when both road and utility networks reach them."
    }),
    Object.freeze({
      id: "hill-cut",
      name: "Hill Cut",
      subtitle: "Route around bedrock",
      dropLimit: 9,
      populationTarget: 18,
      jobsTarget: 4,
      utilityTarget: 70,
      greeneryTarget: 0,
      entrance: Object.freeze({ x: 2, y: 7 }),
      hub: Object.freeze({ x: 1, y: 7 }),
      hubMask: Direction.North | Direction.East | Direction.South | Direction.West,
      terrain: terrain([
        [3, 0, "hill"], [4, 0, "hill"], [3, 1, "hill"], [4, 1, "hill"],
        [3, 2, "hill"], [4, 2, "hill"], [4, 3, "hill"],
        [2, 4, "tree"], [3, 4, "tree"], [5, 4, "tree"],
        [0, 2, "tree"], [7, 2, "tree"], [0, 3, "tree"]
      ]),
      queue: Object.freeze([
        "row-homes", "main-street", "mixed-corner", "service-bore",
        "utility-plaza", "apartment-court", "green-strip", "main-street",
        "row-homes", "mixed-corner", "service-bore"
      ]),
      objectiveText: "The central ridge blocks surface and underground construction. Reach 18 residents, 4 jobs, and 70% utility coverage."
    }),
    Object.freeze({
      id: "green-basin",
      name: "Green Basin",
      subtitle: "Build without erasing nature",
      dropLimit: 10,
      populationTarget: 24,
      jobsTarget: 6,
      utilityTarget: 75,
      greeneryTarget: 50,
      entrance: Object.freeze({ x: 2, y: 7 }),
      hub: Object.freeze({ x: 1, y: 7 }),
      hubMask: Direction.North | Direction.East | Direction.South | Direction.West,
      terrain: terrain([
        [0, 0, "hill"], [1, 0, "hill"], [0, 1, "hill"],
        [6, 0, "hill"], [7, 0, "hill"], [7, 1, "hill"],
        [2, 1, "tree"], [3, 1, "tree"], [5, 1, "tree"],
        [1, 3, "tree"], [6, 3, "tree"],
        [3, 5, "tree"], [6, 5, "tree"],
        [4, 6, "hill"], [5, 6, "hill"], [4, 7, "hill"], [5, 7, "hill"]
      ]),
      queue: Object.freeze([
        "row-homes", "main-street", "mixed-corner", "apartment-court",
        "green-strip", "utility-plaza", "service-bore", "main-street",
        "row-homes", "mixed-corner", "service-bore"
      ]),
      objectiveText: "Reach 24 residents, 6 jobs, 75% utilities, and place at least half of active homes beside a park or existing tree."
    })
  ]);

  export function levelAt(index: number): LevelDefinition {
    const level = LEVELS[index];
    if (!level) throw new Error(`Unknown level index: ${index}`);
    return level;
  }
