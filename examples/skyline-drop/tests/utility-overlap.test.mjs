import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../.candidate/simulation.bundle.js", import.meta.url), "utf8");
const context = { console, Object, Array, Math, Set, Map, Error, Number, String, Boolean };
vm.createContext(context);
vm.runInContext(source, context);
const G = context.SkylineDrop;
assert.ok(G, "simulation namespace loads");

const N = 1;
const E = 2;
const S = 4;
const W = 8;

function baseState() {
  return G.createLevelState(G.createInitialState(), 0, "playing");
}

// A vertical Service Bore may cross an existing horizontal conduit. The masks
// merge into a four-way junction instead of rejecting the placement.
{
  const state = baseState();
  const occupied = [...state.occupied];
  occupied[G.indexOf(3, 3)] = Object.freeze({
    pieceSerial: 77,
    pieceId: "row-homes",
    surface: "home",
    visual: "home",
    conduit: E | W,
    population: 4,
    jobs: 0
  });
  const crossing = Object.freeze({
    ...state,
    occupied: Object.freeze(occupied),
    currentPieceId: "service-bore",
    rotation: 1,
    anchor: Object.freeze({ x: 3, y: 2 })
  });
  const preview = G.placementPreview(crossing);
  assert.equal(preview.valid, true, preview.reason);
  const dropped = G.reduceGameState(crossing, { type: "drop" });
  const cell = dropped.occupied[G.indexOf(3, 3)];
  assert.ok(cell, "crossing cell remains occupied");
  assert.equal(cell.conduit, N | E | S | W, "overlapping masks combine into a junction");
  assert.equal(cell.surface, "home", "underground overlap preserves the surface building");
  assert.equal(cell.visual, "home", "underground overlap preserves the surface artwork");
  assert.equal(cell.population, 4, "underground overlap preserves building output");
  assert.equal(cell.pieceSerial, 77, "underground overlap preserves surface district identity");
  assert.match(dropped.statusMessage, /overlapping utility cell merged/i);
}

// A surface district can also be placed over an existing underground-only route.
{
  const state = baseState();
  const occupied = [...state.occupied];
  occupied[G.indexOf(4, 4)] = Object.freeze({
    pieceSerial: 88,
    pieceId: "service-bore",
    surface: null,
    visual: "bore",
    conduit: N | S,
    population: 0,
    jobs: 0
  });
  const crossing = Object.freeze({
    ...state,
    occupied: Object.freeze(occupied),
    currentPieceId: "main-street",
    rotation: 0,
    anchor: Object.freeze({ x: 1, y: 4 })
  });
  const preview = G.placementPreview(crossing);
  assert.equal(preview.valid, true, preview.reason);
  const dropped = G.reduceGameState(crossing, { type: "drop" });
  const cell = dropped.occupied[G.indexOf(4, 4)];
  assert.ok(cell);
  assert.equal(cell.surface, "shop", "new surface district occupies the cell");
  assert.equal(cell.visual, "shop");
  assert.equal(cell.jobs, 2);
  assert.equal(cell.conduit, N | E | S | W, "new and existing utility masks merge");
}

// Surface overlap remains illegal: this change affects utilities only.
{
  const state = baseState();
  const occupied = [...state.occupied];
  occupied[G.indexOf(2, 4)] = Object.freeze({
    pieceSerial: 91,
    pieceId: "row-homes",
    surface: "home",
    visual: "home",
    conduit: 0,
    population: 4,
    jobs: 0
  });
  const overlap = Object.freeze({
    ...state,
    occupied: Object.freeze(occupied),
    currentPieceId: "main-street",
    rotation: 0,
    anchor: Object.freeze({ x: 1, y: 4 })
  });
  const preview = G.placementPreview(overlap);
  assert.equal(preview.valid, false);
  assert.match(preview.reason, /district already occupies/i);
}

// Bedrock continues to reject underground construction.
{
  const state = G.createLevelState(G.createInitialState(), 1, "playing");
  const blocked = Object.freeze({
    ...state,
    currentPieceId: "service-bore",
    rotation: 0,
    anchor: Object.freeze({ x: 2, y: 0 })
  });
  const preview = G.placementPreview(blocked);
  assert.equal(preview.valid, false);
  assert.match(preview.reason, /bedrock/i);
}

console.log("UTILITY_OVERLAP PASS merge preserve-surface surface-overlap-blocked bedrock-blocked");
