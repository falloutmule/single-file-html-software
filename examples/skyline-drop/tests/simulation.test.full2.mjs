import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../.candidate/simulation.bundle.js", import.meta.url), "utf8");
const context = { console, Object, Array, Math, Set, Map, Error, Number, String, Boolean };
vm.createContext(context);
vm.runInContext(source, context);
const G = context.SkylineDrop;
assert.ok(G, "SkylineDrop namespace loads");

const rotated = G.rotatePiece(G.pieceById("main-street"), 1);
assert.equal(rotated.width, 1);
assert.equal(rotated.height, 4);

function makeLevelState(levelIndex, upgrades = []) {
  let state = G.createInitialState();
  state = Object.freeze({ ...state, upgrades: Object.freeze(upgrades) });
  return G.createLevelState(state, levelIndex, "playing");
}

function signature(state) {
  return state.occupied.map((cell) => cell ? `${cell.surface ?? "_"}:${cell.conduit}` : ".").join("|");
}

function score(state) {
  const level = G.levelAt(state.levelIndex);
  const m = state.metrics;
  return m.population * 25
    + m.jobs * 34
    + m.utilityCoverage * 2.1
    + m.greeneryCoverage * (level.greeneryTarget > 0 ? 1.2 : 0.1)
    + m.activeBuildings * 14
    + m.connectedRoadKeys.length * 2
    + m.connectedUtilityKeys.length * 2
    - m.totalBuildings * 0.8;
}

function solve(levelIndex, upgrades, beamWidth = 2400) {
  let beam = [{ state: makeLevelState(levelIndex, upgrades), moves: [] }];
  const level = G.levelAt(levelIndex);
  for (let depth = 0; depth < level.dropLimit; depth += 1) {
    const candidates = [];
    const seen = new Map();
    for (const node of beam) {
      const definition = G.pieceById(node.state.currentPieceId);
      for (let rotation = 0; rotation < 4; rotation += 1) {
        const piece = G.rotatePiece(definition, rotation);
        for (let y = 0; y <= G.BOARD_SIZE - piece.height; y += 1) {
          for (let x = 0; x <= G.BOARD_SIZE - piece.width; x += 1) {
            const positioned = Object.freeze({ ...node.state, rotation, anchor: Object.freeze({ x, y }) });
            if (!G.placementPreview(positioned).valid) continue;
            const next = G.reduceGameState(positioned, { type: "drop" });
            const moves = [...node.moves, { piece: positioned.currentPieceId, rotation, x, y }];
            if (next.phase === "level-complete") return { state: next, moves };
            if (next.phase !== "playing") continue;
            const key = `${next.queueIndex}:${signature(next)}`;
            const ranked = { state: next, moves, score: score(next) };
            const old = seen.get(key);
            if (!old || ranked.score > old.score) seen.set(key, ranked);
          }
        }
      }
    }
    for (const value of seen.values()) candidates.push(value);
    candidates.sort((a, b) => b.score - a.score);
    beam = candidates.slice(0, beamWidth);
    if (beam.length === 0) break;
  }
  return null;
}

const solutions = [
  solve(0, [], 600),
  solve(1, ["compact-housing"], 1400),
  solve(2, ["compact-housing", "small-business"], 2600)
];
for (let index = 0; index < solutions.length; index += 1) {
  const solution = solutions[index];
  assert.ok(solution, `level ${index + 1} has a valid solution`);
  assert.ok(G.objectivesMet(solution.state), `level ${index + 1} objectives met`);
  console.log(`LEVEL_${index + 1}_SOLVED drops=${solution.moves.length} pop=${solution.state.metrics.population} jobs=${solution.state.metrics.jobs} utility=${solution.state.metrics.utilityCoverage} greenery=${solution.state.metrics.greeneryCoverage}`);
  console.log(JSON.stringify(solution.moves));
}

console.log("SIMULATION_TEST PASS");
