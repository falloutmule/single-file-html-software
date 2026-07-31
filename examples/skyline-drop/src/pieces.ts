import { Direction, type PieceCell, type PieceDefinition, type RotatedPiece, type SurfaceKind, type UpgradeDefinition, type VisualKind } from "./types.ts";

  const N = Direction.North;
  const E = Direction.East;
  const S = Direction.South;
  const W = Direction.West;
  const J = N | E | S | W;

  function cell(
    x: number,
    y: number,
    surface: SurfaceKind | null,
    visual: VisualKind,
    conduit: number,
    population = 0,
    jobs = 0
  ): PieceCell {
    return Object.freeze({ x, y, surface, visual, conduit, population, jobs });
  }

  export const PIECES: Readonly<Record<string, PieceDefinition>> = Object.freeze({
    "row-homes": Object.freeze({
      id: "row-homes",
      name: "Row Homes",
      description: "A broad neighborhood with a useful utility bend.",
      roadPlanName: "Edge road",
      cells: Object.freeze([
        cell(0, 0, "road", "road", J),
        cell(1, 0, "home", "home", E | W, 4),
        cell(2, 0, "home", "home", S | W, 4),
        cell(0, 1, "road", "road", J),
        cell(1, 1, "park", "park", E | W),
        cell(2, 1, "home", "home", N | W, 4)
      ])
    }),
    "main-street": Object.freeze({
      id: "main-street",
      name: "Main Street",
      description: "A long connected street reaches a shop at the block's end.",
      cells: Object.freeze([
        cell(0, 0, "road", "road", J),
        cell(1, 0, "road", "road", J),
        cell(2, 0, "road", "road", J),
        cell(3, 0, "shop", "shop", E | W, 0, 2)
      ])
    }),
    "apartment-court": Object.freeze({
      id: "apartment-court",
      name: "Apartment Court",
      description: "High population in a tight square, but hard to route.",
      cells: Object.freeze([
        cell(0, 0, "home", "apartment", E | S, 5),
        cell(1, 0, "home", "apartment", S | W, 5),
        cell(0, 1, "road", "road", J),
        cell(1, 1, "home", "apartment", N | W, 5)
      ])
    }),
    "mixed-corner": Object.freeze({
      id: "mixed-corner",
      name: "Mixed Corner",
      description: "Homes and shops share a flexible street corner.",
      cells: Object.freeze([
        cell(0, 0, "home", "home", E | S, 4),
        cell(1, 0, "shop", "shop", S | W, 0, 2),
        cell(0, 1, "road", "road", J),
        cell(1, 1, "road", "road", J)
      ])
    }),
    "green-strip": Object.freeze({
      id: "green-strip",
      name: "Green Strip",
      description: "A small boulevard that raises nearby quality of life.",
      roadPlanName: "Edge road",
      cells: Object.freeze([
        cell(0, 0, "road", "road", J),
        cell(1, 0, "park", "park", E | W),
        cell(2, 0, "park", "park", E | W)
      ])
    }),
    "utility-plaza": Object.freeze({
      id: "utility-plaza",
      name: "Utility Plaza",
      description: "A strong underground junction with a civic surface.",
      cells: Object.freeze([
        cell(1, 0, "plaza", "utility", S),
        cell(0, 1, "road", "road", J),
        cell(1, 1, "park", "park", J),
        cell(2, 1, "road", "road", J),
        cell(1, 2, null, "bore", N)
      ])
    }),
    "service-bore": Object.freeze({
      id: "service-bore",
      name: "Service Bore",
      description: "An underground-only line that can pass beneath trees.",
      cells: Object.freeze([
        cell(0, 0, null, "bore", E | W),
        cell(1, 0, null, "bore", E | W),
        cell(2, 0, null, "bore", E | W)
      ])
    })
  });

  export function pieceContentsSummary(definition: PieceDefinition): string {
    const counts = new Map<VisualKind, number>();
    for (const entry of definition.cells) counts.set(entry.visual, (counts.get(entry.visual) ?? 0) + 1);

    const allUnderground = definition.cells.every((entry) => entry.surface === null);
    if (allUnderground) {
      const conduits = definition.cells.length;
      return `UNDERGROUND ONLY · ${conduits} conduit ${conduits === 1 ? "cell" : "cells"}`;
    }

    const labels: readonly [VisualKind, string, string][] = Object.freeze([
      ["home", "home", "homes"],
      ["apartment", "apartment", "apartments"],
      ["shop", "shop", "shops"],
      ["road", "road", "roads"],
      ["park", "park", "parks"],
      ["utility", "utility plaza", "utility plazas"],
      ["bore", "underground bore", "underground bores"]
    ]);
    const parts: string[] = [];
    for (const [visual, singular, plural] of labels) {
      const count = counts.get(visual) ?? 0;
      if (count > 0) parts.push(`${count} ${count === 1 ? singular : plural}`);
    }
    return parts.join(" · ");
  }

  export const UPGRADE_DEFINITIONS: readonly UpgradeDefinition[] = Object.freeze([
    Object.freeze({
      id: "compact-housing" as const,
      icon: "🏘️",
      name: "Compact Housing",
      description: "Every active home supplies one additional resident."
    }),
    Object.freeze({
      id: "small-business" as const,
      icon: "☕",
      name: "Small Business Grant",
      description: "Every active shop supplies one additional job."
    }),
    Object.freeze({
      id: "planning-office" as const,
      icon: "📐",
      name: "Planning Office",
      description: "Redraw the current piece once during each remaining level."
    }),
    Object.freeze({
      id: "remix-permit" as const,
      icon: "🛣️",
      name: "Road Crew",
      description: "Gain one additional Road Remix charge for this run."
    })
  ]);

  interface RoadRemixPlan {
    readonly name: string;
    readonly definition: PieceDefinition;
  }

  function authoredPlan(base: PieceDefinition, name: string, cells: readonly PieceCell[]): RoadRemixPlan {
    return Object.freeze({
      name,
      definition: Object.freeze({
        id: base.id,
        name: base.name,
        description: base.description,
        roadPlanName: name,
        cells: Object.freeze(cells)
      })
    });
  }

  const ROAD_REMIX_PLANS: Readonly<Record<string, readonly RoadRemixPlan[]>> = Object.freeze({
    "row-homes": Object.freeze([
      Object.freeze({ name: "Edge road", definition: PIECES["row-homes"] as PieceDefinition }),
      authoredPlan(PIECES["row-homes"] as PieceDefinition, "Center road", [
        cell(0, 0, "home", "home", E | S, 4),
        cell(1, 0, "road", "road", J),
        cell(2, 0, "home", "home", S | W, 4),
        cell(0, 1, "park", "park", N | E),
        cell(1, 1, "road", "road", J),
        cell(2, 1, "home", "home", N | W, 4)
      ])
    ]),
    "green-strip": Object.freeze([
      Object.freeze({ name: "Edge road", definition: PIECES["green-strip"] as PieceDefinition }),
      authoredPlan(PIECES["green-strip"] as PieceDefinition, "Center road", [
        cell(0, 0, "park", "park", E),
        cell(1, 0, "road", "road", J),
        cell(2, 0, "park", "park", W)
      ])
    ])
  });

  function roadRemixPlans(definition: PieceDefinition): readonly RoadRemixPlan[] {
    return ROAD_REMIX_PLANS[definition.id] ?? Object.freeze([
      Object.freeze({ name: definition.roadPlanName ?? "Standard plan", definition })
    ]);
  }

  export function roadRemixVariantCount(definition: PieceDefinition): number {
    return roadRemixPlans(definition).length;
  }

  export function roadRemixedPiece(definition: PieceDefinition, rawVariant: number): PieceDefinition {
    const plans = roadRemixPlans(definition);
    const variant = ((rawVariant % plans.length) + plans.length) % plans.length;
    return plans[variant]?.definition ?? definition;
  }

  export function roadRemixPlanName(definition: PieceDefinition, rawVariant: number): string {
    const plans = roadRemixPlans(definition);
    const variant = ((rawVariant % plans.length) + plans.length) % plans.length;
    return plans[variant]?.name ?? definition.roadPlanName ?? "Standard plan";
  }

  function rotateMaskClockwise(mask: number): number {
    let rotated = 0;
    if (mask & N) rotated |= E;
    if (mask & E) rotated |= S;
    if (mask & S) rotated |= W;
    if (mask & W) rotated |= N;
    return rotated;
  }

  export function rotatePiece(definition: PieceDefinition, rawRotation: number): RotatedPiece {
    const rotation = ((rawRotation % 4) + 4) % 4;
    let transformed = definition.cells.map((source) => ({ ...source }));
    for (let step = 0; step < rotation; step += 1) {
      transformed = transformed.map((source) => ({
        ...source,
        x: -source.y,
        y: source.x,
        conduit: rotateMaskClockwise(source.conduit)
      }));
    }
    const minX = Math.min(...transformed.map((entry) => entry.x));
    const minY = Math.min(...transformed.map((entry) => entry.y));
    const cells = transformed.map((source) => Object.freeze({ ...source, x: source.x - minX, y: source.y - minY }));
    const width = Math.max(...cells.map((entry) => entry.x)) + 1;
    const height = Math.max(...cells.map((entry) => entry.y)) + 1;
    return Object.freeze({ definition, rotation, width, height, cells: Object.freeze(cells) });
  }

  export function pieceById(id: string): PieceDefinition {
    const result = PIECES[id];
    if (!result) throw new Error(`Unknown piece: ${id}`);
    return result;
  }
