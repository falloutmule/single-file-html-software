import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../.candidate/simulation.bundle.js", import.meta.url), "utf8");
const context = { console, Object, Array, Math, Set, Map, Error, Number, String, Boolean };
vm.createContext(context);
vm.runInContext(source, context);
const G = context.SkylineDrop;
assert.ok(G, "simulation namespace loads");

const J = 1 | 2 | 4 | 8;
const mainStreet = G.pieceById("main-street");
const base = G.rotatePiece(mainStreet, 0);
assert.equal(base.width, 4, "Main Street is a straight four-cell district");
assert.equal(base.height, 1);
assert.equal(
  base.cells.map((cell) => cell.surface).join(","),
  "road,road,road,shop",
  "Main Street uses three connected roads ending at one shop"
);
assert.equal(G.pieceContentsSummary(mainStreet), "1 shop · 3 roads");

// Main Street may reuse an existing road corridor while placing its shop on a
// free cell. Existing road ownership is retained and the new district is added
// as another road owner.
{
  const state = G.createLevelState(G.createInitialState(), 0, "playing");
  const occupied = [...state.occupied];
  for (const x of [1, 2]) {
    occupied[G.indexOf(x, 4)] = Object.freeze({
      pieceSerial: 70,
      pieceId: "row-homes",
      roadOwners: Object.freeze([70]),
      surface: "road",
      visual: "road",
      conduit: J,
      population: 0,
      jobs: 0
    });
  }
  const crossing = Object.freeze({
    ...state,
    occupied: Object.freeze(occupied),
    currentPieceId: "main-street",
    rotation: 0,
    anchor: Object.freeze({ x: 1, y: 4 }),
    pieceSerial: 91
  });
  const preview = G.placementPreview(crossing);
  assert.equal(preview.valid, true, preview.reason);
  const dropped = G.reduceGameState(crossing, { type: "drop" });
  for (const x of [1, 2]) {
    const road = dropped.occupied[G.indexOf(x, 4)];
    assert.equal(road?.surface, "road");
    assert.equal(road?.pieceSerial, 70, "shared road keeps its original inspection owner");
    assert.deepEqual([...road.roadOwners], [70, 91], "shared road records both district owners");
  }
  const newRoad = dropped.occupied[G.indexOf(3, 4)];
  assert.equal(newRoad?.surface, "road");
  assert.deepEqual([...newRoad.roadOwners], [91]);
  const shop = dropped.occupied[G.indexOf(4, 4)];
  assert.equal(shop?.surface, "shop");
  assert.equal(shop?.jobs, 2);
  assert.match(dropped.statusMessage, /2 shared road cells reused/i);
}

// Road merging is general for road-bearing districts, but only road-on-road is
// allowed. A road cannot erase a home, park, shop, plaza, tree, or mountain.
{
  const state = G.createLevelState(G.createInitialState(), 0, "playing");
  const occupied = [...state.occupied];
  occupied[G.indexOf(1, 4)] = Object.freeze({
    pieceSerial: 72,
    pieceId: "row-homes",
    surface: "home",
    visual: "home",
    conduit: 0,
    population: 4,
    jobs: 0
  });
  const blocked = Object.freeze({
    ...state,
    occupied: Object.freeze(occupied),
    currentPieceId: "main-street",
    rotation: 0,
    anchor: Object.freeze({ x: 1, y: 4 })
  });
  const preview = G.placementPreview(blocked);
  assert.equal(preview.valid, false);
  assert.match(preview.reason, /district already occupies/i);
}

// Shared-road ownership preserves district-level access. The two Row Homes
// roads below are entirely reused from an older connected corridor; all three
// incoming homes still recognize those shared cells as their district roads.
{
  const state = G.createLevelState(G.createInitialState(), 0, "playing");
  const occupied = [...state.occupied];
  for (const y of [5, 6]) {
    occupied[G.indexOf(4, y)] = Object.freeze({
      pieceSerial: 80,
      pieceId: "main-street",
      roadOwners: Object.freeze([80]),
      surface: "road",
      visual: "road",
      conduit: J,
      population: 0,
      jobs: 0
    });
  }
  occupied[G.indexOf(3, 6)] = Object.freeze({
    pieceSerial: 81,
    pieceId: "service-bore",
    surface: null,
    visual: "bore",
    conduit: 1 | 4,
    population: 0,
    jobs: 0
  });
  const incoming = Object.freeze({
    ...state,
    occupied: Object.freeze(occupied),
    currentPieceId: "row-homes",
    rotation: 2,
    anchor: Object.freeze({ x: 2, y: 5 }),
    pieceSerial: 92
  });
  const preview = G.placementPreview(incoming);
  assert.equal(preview.valid, true, preview.reason);
  const dropped = G.reduceGameState(incoming, { type: "drop" });
  assert.equal(dropped.metrics.population, 12, "all Row Homes residents use the shared district roads");
  assert.equal(dropped.metrics.utilityCoverage, 100, "shared-road district remains fully serviceable");
  for (const y of [5, 6]) {
    const road = dropped.occupied[G.indexOf(4, y)];
    assert.ok(road?.roadOwners?.includes(92), `shared road 4,${y} records incoming Row Homes ownership`);
  }
}

console.log("MAIN_STREET_ROAD_MERGE PASS i4 connected-road shop road-on-road reuse ownership access nonroad-blocked");
