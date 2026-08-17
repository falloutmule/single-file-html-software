export const PUZZLE_SCHEMA = 'blockfolk-imaginarium.puzzle@1';
export const PUZZLE_WIDTH = 600;
export const PUZZLE_HEIGHT = 800;
export const DEFAULT_DIFFICULTY = 'fun';

export const PUZZLE_DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ id: 'easy', title: 'Easy', rows: 2, columns: 2, pieces: 4 }),
  fun: Object.freeze({ id: 'fun', title: 'Fun', rows: 3, columns: 3, pieces: 9 }),
  tricky: Object.freeze({ id: 'tricky', title: 'Tricky', rows: 4, columns: 4, pieces: 16 })
});

export function normalizeDifficulty(value) {
  return Object.hasOwn(PUZZLE_DIFFICULTIES, value) ? value : DEFAULT_DIFFICULTY;
}

export function buildPuzzleGrid(width, height, difficulty = DEFAULT_DIFFICULTY) {
  const selected = PUZZLE_DIFFICULTIES[normalizeDifficulty(difficulty)];
  const pieces = [];
  for (let row = 0; row < selected.rows; row += 1) {
    const top = Math.round((row * height) / selected.rows);
    const bottom = Math.round(((row + 1) * height) / selected.rows);
    for (let column = 0; column < selected.columns; column += 1) {
      const left = Math.round((column * width) / selected.columns);
      const right = Math.round(((column + 1) * width) / selected.columns);
      pieces.push({
        id: `r${row}c${column}`, row, column,
        crop: { x: left, y: top, width: right - left, height: bottom - top },
        destination: { x: left, y: top }
      });
    }
  }
  return { width, height, rows: selected.rows, columns: selected.columns, pieces };
}

function seededShuffle(values, seed) {
  const shuffled = [...values];
  let state = (Number(seed) >>> 0) || 1;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = ((state * 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  if (shuffled.every((value, index) => value === values[index]) && shuffled.length > 1) shuffled.push(shuffled.shift());
  return shuffled;
}

export function createPuzzle({ sourceDataUrl, sourceTitle = 'My Puzzle', difficulty = DEFAULT_DIFFICULTY, seed = Date.now(), now = new Date().toISOString() }) {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const grid = buildPuzzleGrid(PUZZLE_WIDTH, PUZZLE_HEIGHT, normalizedDifficulty);
  const order = seededShuffle(grid.pieces.map((piece) => piece.id), seed);
  return {
    schema: PUZZLE_SCHEMA,
    id: 'current', sourceDataUrl, sourceTitle, difficulty: normalizedDifficulty,
    width: PUZZLE_WIDTH, height: PUZZLE_HEIGHT, seed: Number(seed) >>> 0,
    pieces: grid.pieces.map((piece) => ({ ...piece, locked: false, position: null, z: order.indexOf(piece.id) + 1 })),
    order, completed: false, raceStartedAt: null, raceElapsedMs: null, updatedAt: now
  };
}

export function restartPuzzle(puzzle, seed = (puzzle.seed + 1) >>> 0, now = new Date().toISOString()) {
  return createPuzzle({ sourceDataUrl: puzzle.sourceDataUrl, sourceTitle: puzzle.sourceTitle, difficulty: puzzle.difficulty, seed, now });
}

export function isPuzzleComplete(puzzle) {
  return puzzle.pieces.length > 0 && puzzle.pieces.every((piece) => piece.locked);
}

export function isPieceCenterInsideDestination({ x, y }, destination, pieceWidth, pieceHeight) {
  const centerX = x + (pieceWidth / 2);
  const centerY = y + (pieceHeight / 2);
  return centerX >= destination.x && centerX <= destination.x + pieceWidth
    && centerY >= destination.y && centerY <= destination.y + pieceHeight;
}

export function elapsedRaceTime(puzzle, nowMs = Date.now()) {
  if (Number.isFinite(puzzle?.raceElapsedMs)) return Math.max(0, puzzle.raceElapsedMs);
  if (Number.isFinite(puzzle?.raceStartedAt)) return Math.max(0, nowMs - puzzle.raceStartedAt);
  return 0;
}

export function formatRaceTime(elapsedMs) {
  const tenthsTotal = Math.floor(Math.max(0, elapsedMs) / 100);
  const minutes = Math.floor(tenthsTotal / 600);
  const seconds = Math.floor((tenthsTotal % 600) / 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenthsTotal % 10}`;
}

export function validatePuzzle(puzzle) {
  if (!puzzle || puzzle.schema !== PUZZLE_SCHEMA || typeof puzzle.sourceDataUrl !== 'string' || !puzzle.sourceDataUrl.startsWith('data:image/')) throw new Error('This puzzle could not be opened.');
  const grid = buildPuzzleGrid(PUZZLE_WIDTH, PUZZLE_HEIGHT, puzzle.difficulty);
  if (!Array.isArray(puzzle.pieces) || puzzle.pieces.length !== grid.pieces.length) throw new Error('This puzzle has the wrong number of pieces.');
  const ids = new Set(puzzle.pieces.map((piece) => piece.id));
  if (ids.size !== grid.pieces.length || grid.pieces.some((piece) => !ids.has(piece.id))) throw new Error('This puzzle has invalid pieces.');
  if (puzzle.raceStartedAt !== undefined && puzzle.raceStartedAt !== null && (!Number.isFinite(puzzle.raceStartedAt) || puzzle.raceStartedAt < 0)) throw new Error('This puzzle has an invalid race start.');
  if (puzzle.raceElapsedMs !== undefined && puzzle.raceElapsedMs !== null && (!Number.isFinite(puzzle.raceElapsedMs) || puzzle.raceElapsedMs < 0)) throw new Error('This puzzle has an invalid race time.');
  if (Number.isFinite(puzzle.raceElapsedMs) && !Number.isFinite(puzzle.raceStartedAt)) throw new Error('This puzzle has a race time without a start.');
  return true;
}
