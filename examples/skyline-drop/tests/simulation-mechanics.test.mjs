import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../.candidate/simulation.bundle.js', import.meta.url), 'utf8');
const context = { console, Object, Array, Math, Set, Map, Error, Number, String, Boolean };
vm.createContext(context);
vm.runInContext(source, context);
const G = context.SkylineDrop;
assert.ok(G, 'simulation namespace loads');

let state = G.createLevelState(G.createInitialState(), 0, 'playing');
const invalid = Object.freeze({ ...state, anchor: Object.freeze({ x: 0, y: 0 }) });
const rejected = G.reduceGameState(invalid, { type: 'drop' });
assert.equal(rejected.turn, 0, 'invalid placement does not consume a drop');
assert.equal(rejected.phase, 'playing');
assert.equal(rejected.statusKind, 'error');

const paused = G.reduceGameState(state, { type: 'toggle-pause' });
assert.equal(paused.phase, 'paused');
const resumed = G.reduceGameState(paused, { type: 'toggle-pause' });
assert.equal(resumed.phase, 'playing');

const placed = G.reduceGameState(Object.freeze({ ...state, rotation: 2, anchor: Object.freeze({ x: 2, y: 5 }) }), { type: 'drop' });
assert.equal(placed.turn, 1);
assert.ok(placed.occupied.some(Boolean));
const restarted = G.reduceGameState(placed, { type: 'restart-level' });
assert.equal(restarted.turn, 0);
assert.ok(restarted.occupied.every((cell) => cell === null));

const nearlyOut = Object.freeze({ ...state, turn: G.levelAt(0).dropLimit - 1 });
const lost = G.reduceGameState(Object.freeze({ ...nearlyOut, rotation: 2, anchor: Object.freeze({ x: 2, y: 5 }) }), { type: 'drop' });
assert.equal(lost.phase, 'lost', 'drop limit creates an honest loss state');
const newRun = G.reduceGameState(lost, { type: 'continue' });
assert.equal(newRun.phase, 'playing');
assert.equal(newRun.levelIndex, 0);
assert.equal(newRun.turn, 0);

let complete = state;
complete = G.reduceGameState(Object.freeze({ ...complete, rotation: 2, anchor: Object.freeze({ x: 2, y: 5 }) }), { type: 'drop' });
complete = G.reduceGameState(Object.freeze({ ...complete, rotation: 0, anchor: Object.freeze({ x: 2, y: 4 }) }), { type: 'drop' });
assert.equal(complete.phase, 'level-complete');
const upgrade = G.reduceGameState(complete, { type: 'continue' });
assert.equal(upgrade.phase, 'upgrade');
const nextLevel = G.reduceGameState(upgrade, { type: 'choose-upgrade', upgrade: 'compact-housing' });
assert.equal(nextLevel.levelIndex, 1);
assert.equal(nextLevel.phase, 'playing');
assert.ok(nextLevel.upgrades.includes('compact-housing'));

console.log('SIMULATION_MECHANICS PASS invalid pause restart loss upgrade');
