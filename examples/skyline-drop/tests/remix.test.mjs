import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../.candidate/simulation.bundle.js", import.meta.url), "utf8");
const context = { console, Object, Array, Math, Set, Map, Error, Number, String, Boolean };
vm.createContext(context);
vm.runInContext(source, context);
const G = context.SkylineDrop;
assert.ok(G, "simulation namespace loads");

const footprint = (piece) => piece.cells.map((cell) => `${cell.x},${cell.y}`).sort();
const tileIdentity = (cell) => `${cell.surface ?? "none"}|${cell.visual}|${cell.population ?? 0}|${cell.jobs ?? 0}`;
const tileInventory = (piece) => piece.cells.map(tileIdentity).sort();
const conduitFootprint = (piece) => piece.cells.map((cell) => `${cell.x},${cell.y}:${cell.conduit === 0 ? 0 : 1}`).sort();

function roadsConnected(piece) {
  const roads = piece.cells.filter((cell) => cell.surface === "road");
  if (roads.length <= 1) return true;
  const remaining = new Set(roads.map((cell) => `${cell.x},${cell.y}`));
  const queue = [roads[0]];
  while (queue.length) {
    const cell = queue.shift();
    if (!cell) break;
    const key = `${cell.x},${cell.y}`;
    if (!remaining.delete(key)) continue;
    for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
      const next = roads.find((candidate) => candidate.x === cell.x + dx && candidate.y === cell.y + dy);
      if (next && remaining.has(`${next.x},${next.y}`)) queue.push(next);
    }
  }
  return remaining.size === 0;
}

function normalizedSurfaceSignature(piece, rotation) {
  let cells = piece.cells.map((cell) => ({ x: cell.x, y: cell.y, id: tileIdentity(cell) }));
  for (let step = 0; step < rotation; step += 1) {
    cells = cells.map((cell) => ({ ...cell, x: -cell.y, y: cell.x }));
  }
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  return cells
    .map((cell) => `${cell.x - minX},${cell.y - minY}:${cell.id}`)
    .sort()
    .join(";");
}

// Only pieces with authored, non-rotation-equivalent road plans are eligible.
assert.equal(G.roadRemixVariantCount(G.pieceById("row-homes")), 2, "Row Homes has edge and center road plans");
assert.equal(G.roadRemixVariantCount(G.pieceById("green-strip")), 2, "Green Strip has edge and center road plans");
for (const id of ["main-street", "apartment-court", "mixed-corner", "utility-plaza", "service-bore"]) {
  assert.equal(G.roadRemixVariantCount(G.pieceById(id)), 1, `${id} has no fake alternate plan`);
}

for (const id of ["row-homes", "green-strip"]) {
  const definition = G.pieceById(id);
  const base = G.roadRemixedPiece(definition, 0);
  const alternate = G.roadRemixedPiece(definition, 1);
  assert.deepEqual(footprint(alternate), footprint(base), `${id} preserves footprint`);
  assert.deepEqual(tileInventory(alternate), tileInventory(base), `${id} preserves tile counts and outputs`);
  assert.deepEqual(conduitFootprint(alternate), conduitFootprint(base), `${id} preserves which footprint cells carry utility`);
  assert.equal(roadsConnected(base), true, `${id} base road plan is connected`);
  assert.equal(roadsConnected(alternate), true, `${id} alternate road plan is connected`);
  const baseRotations = new Set([0, 1, 2, 3].map((rotation) => normalizedSurfaceSignature(base, rotation)));
  assert.equal(baseRotations.has(normalizedSurfaceSignature(alternate, 0)), false, `${id} alternate is not a rotation of the base plan`);
  assert.equal(G.roadRemixPlanName(definition, 0), "Edge road");
  assert.equal(G.roadRemixPlanName(definition, 1), "Center road");
}

// A run starts with one charge. Row Homes switches from edge roads to a connected center road.
{
  const state = G.createLevelState(G.createInitialState(), 0, "playing");
  assert.equal(state.remixCharges, 1, "run starts with one Road Remix charge");
  const before = G.currentRotatedPiece(state);
  const changed = G.reduceGameState(state, { type: "remix" });
  const after = G.currentRotatedPiece(changed);
  assert.equal(changed.currentPieceId, state.currentPieceId);
  assert.equal(changed.rotation, state.rotation);
  assert.deepEqual(changed.anchor, state.anchor);
  assert.equal(changed.remixCharges, 0);
  assert.equal(changed.remixVariant, 1);
  assert.deepEqual(footprint(after), footprint(before));
  assert.deepEqual(tileInventory(after), tileInventory(before));
  assert.equal(roadsConnected(after), true);
  assert.equal(G.roadRemixPlanName(G.pieceById(changed.currentPieceId), changed.remixVariant), "Center road");
  assert.match(changed.statusMessage, /road plan changed to center road/i);

  const exhausted = G.reduceGameState(changed, { type: "remix" });
  assert.equal(exhausted.remixVariant, changed.remixVariant);
  assert.equal(exhausted.remixCharges, 0);
  assert.equal(exhausted.statusKind, "error");
  assert.match(exhausted.statusMessage, /no road remix charges/i);
}

// Dropping the center-road plan commits it and resets the next piece to its base plan.
{
  let state = G.createLevelState(G.createInitialState(), 0, "playing");
  state = Object.freeze({ ...state, rotation: 2, anchor: Object.freeze({ x: 2, y: 5 }) });
  state = G.reduceGameState(state, { type: "remix" });
  const preview = G.placementPreview(state);
  assert.equal(preview.valid, true, preview.reason);
  const dropped = G.reduceGameState(state, { type: "drop" });
  assert.equal(dropped.turn, 1);
  for (const entry of preview.cells) {
    const placed = dropped.occupied[G.indexOf(entry.x, entry.y)];
    assert.ok(placed, `placed Road Remix cell ${entry.x},${entry.y}`);
    assert.equal(placed.surface, entry.cell.surface);
    assert.equal(placed.visual, entry.cell.visual);
    assert.equal(placed.conduit, entry.cell.conduit);
  }
  assert.equal(dropped.remixVariant, 0, "next district starts with its base road plan");
}

// Unsupported pieces cannot consume a charge.
{
  const state = Object.freeze({
    ...G.createLevelState(G.createInitialState(), 0, "playing"),
    currentPieceId: "main-street",
    remixCharges: 1,
    remixVariant: 0
  });
  const result = G.reduceGameState(state, { type: "remix" });
  assert.equal(result.remixCharges, 1);
  assert.equal(result.remixVariant, 0);
  assert.equal(result.statusKind, "error");
  assert.match(result.statusMessage, /no alternate road plan/i);
}

// Road Crew grants one additional Road Remix charge and persists into the next level.
{
  const base = G.createLevelState(G.createInitialState(), 0, "playing");
  const upgradeState = Object.freeze({ ...base, phase: "upgrade", remixCharges: 0 });
  const next = G.reduceGameState(upgradeState, { type: "choose-upgrade", upgrade: "remix-permit" });
  assert.equal(next.levelIndex, 1);
  assert.equal(next.phase, "playing");
  assert.equal(next.remixCharges, 1);
  assert.ok(next.upgrades.includes("remix-permit"));
}

console.log("ROAD_REMIX PASS authored plans connected roads rotation uniqueness footprint inventory charge drop upgrade");
