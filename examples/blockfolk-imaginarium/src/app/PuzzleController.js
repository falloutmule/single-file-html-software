/* global clearInterval, clearTimeout, document, requestAnimationFrame, setInterval, setTimeout, window */
import { createPuzzle, elapsedRaceTime, formatRaceTime, isPieceCenterInsideDestination, isPuzzleComplete, PUZZLE_DIFFICULTIES, PUZZLE_HEIGHT, PUZZLE_WIDTH, restartPuzzle, validatePuzzle } from '../model/puzzleModel.js';
import { drawFramedImage, loadLocalImage, readImageFile } from '../model/puzzleImage.js';

export class PuzzleController {
  constructor({ root, storage, controls, showScreen, showHome, listCreations, flattenCreation, announce, toast, cue }) {
    this.root = root; this.storage = storage; this.controls = controls; this.showScreen = showScreen; this.showHome = showHome;
    this.listCreations = listCreations; this.flattenCreation = flattenCreation; this.announce = announce; this.toast = toast; this.cue = cue;
    this.frame = { image: null, dataUrl: '', title: 'My Puzzle', zoom: 1, offsetX: 0, offsetY: 0, pointerId: null, lastX: 0, lastY: 0 };
    this.difficulty = 'fun'; this.puzzle = null; this.pieceElements = new Map(); this.drag = null; this.hintTimer = null; this.raceTicker = null; this.topZ = 100;
  }

  mount() {
    this.sourceScreen = this.root.querySelector('#puzzle-source-screen');
    this.frameScreen = this.root.querySelector('#puzzle-frame-screen');
    this.playScreen = this.root.querySelector('#puzzle-play-screen');
    this.photoInput = this.root.querySelector('#puzzle-photo-input');
    this.creationGrid = this.root.querySelector('#puzzle-creation-grid');
    this.resumeButton = this.root.querySelector('#puzzle-resume');
    this.frameCanvas = this.root.querySelector('#puzzle-frame-canvas');
    this.frameContext = this.frameCanvas.getContext('2d', { alpha: false });
    this.zoomInput = this.root.querySelector('#puzzle-zoom');
    this.workspace = this.root.querySelector('#puzzle-workspace');
    this.board = this.root.querySelector('#puzzle-board');
    this.tray = this.root.querySelector('#puzzle-tray');
    this.progress = this.root.querySelector('#puzzle-progress');
    this.raceTime = this.root.querySelector('#puzzle-race-time');
    this.completion = this.root.querySelector('#puzzle-completion');
    this.hintImage = this.root.querySelector('#puzzle-hint-image');
    this.snapButton = this.root.querySelector('[data-action="puzzle-snap"]');
    this.raceButton = this.root.querySelector('[data-action="puzzle-race"]');
    this.photoInput.addEventListener('change', () => this.openPhoto(this.photoInput.files?.[0]).catch((error) => this.toast(error.message)));
    this.zoomInput.addEventListener('input', () => { this.frame.zoom = Number(this.zoomInput.value); this.renderFrame(); });
    this.frameCanvas.addEventListener('pointerdown', (event) => this.beginFrameDrag(event));
    this.frameCanvas.addEventListener('pointermove', (event) => this.moveFrameDrag(event));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.frameCanvas.addEventListener(type, (event) => this.endFrameDrag(event));
    window.addEventListener('pointerup', (event) => this.endPieceDrag(event), true);
    window.addEventListener('pointercancel', (event) => this.endPieceDrag(event), true);
    window.addEventListener('blur', () => this.cancelPieceDrag());
    window.addEventListener('resize', () => { if (!this.playScreen.hidden && this.puzzle) this.layoutPuzzle(false); }, { passive: true });
  }

  async handleAction(action, element) {
    const handlers = {
      'make-puzzle': () => this.openSource(), 'puzzle-photo': () => this.photoInput.click(), 'puzzle-show-creations': () => this.showCreations(),
      'puzzle-creation': () => this.openCreation(element?.dataset.pictureId), 'puzzle-resume': () => this.resume(),
      'puzzle-frame-back': () => this.openSource(), 'puzzle-frame-reset': () => this.resetFrame(),
      'puzzle-set-difficulty': () => this.setDifficulty(element?.dataset.puzzleDifficulty), 'puzzle-build': () => this.build(),
      'puzzle-back': () => this.openSource(), 'puzzle-restart': () => this.restart(), 'puzzle-hint': () => this.showHint(), 'puzzle-race': () => this.startRace(), 'puzzle-snap': () => this.snapPiecesIntoPlace(),
      'puzzle-play-again': () => this.restart(), 'puzzle-another': () => this.openSource(), 'puzzle-done': () => this.showHome()
    };
    if (!handlers[action]) return false;
    await handlers[action](); return true;
  }

  async openSource() {
    this.stopRaceTicker();
    const saved = await this.storage.getPuzzle();
    this.resumeButton.hidden = !saved;
    this.creationGrid.hidden = true;
    this.showScreen('puzzle-source-screen');
  }

  async showCreations() {
    const pictures = await this.listCreations();
    this.controls.destroyWithin(this.creationGrid);
    if (!pictures.length) {
      const empty = document.createElement('p'); empty.className = 'puzzle-empty'; empty.textContent = 'Make and save a picture first, or choose a photo.';
      this.creationGrid.replaceChildren(empty);
    } else {
      this.creationGrid.replaceChildren(...pictures.map((picture) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'puzzle-creation-choice'; button.dataset.action = 'puzzle-creation'; button.dataset.pictureId = picture.id; button.setAttribute('aria-label', `Make a puzzle from ${picture.title}`);
        const image = document.createElement('img'); image.src = picture.thumbnail; image.alt = '';
        const label = document.createElement('strong'); label.textContent = picture.title; button.append(image, label);
        return this.controls.upgradeButton(button, { family: 'choice', value: `puzzle-${picture.id}`, palette: 'peach' });
      }));
    }
    this.creationGrid.hidden = false;
  }

  async openPhoto(file) {
    if (!file) return;
    const dataUrl = await readImageFile(file);
    this.photoInput.value = '';
    await this.startFraming(dataUrl, file.name.replace(/\.[^.]+$/, '') || 'My Photo Puzzle');
  }

  async openCreation(id) {
    if (!id) return;
    this.toast('Preparing your creation...');
    const result = await this.flattenCreation(id);
    await this.startFraming(result.dataUrl, result.title);
  }

  async startFraming(dataUrl, title) {
    const image = await loadLocalImage(dataUrl);
    this.frame = { image, dataUrl, title, zoom: 1, offsetX: 0, offsetY: 0, pointerId: null, lastX: 0, lastY: 0 };
    this.zoomInput.value = '1'; this.setDifficulty(this.difficulty);
    this.showScreen('puzzle-frame-screen'); this.renderFrame();
    this.announce('Picture ready. Drag it to frame your puzzle.');
  }

  renderFrame() { if (this.frame.image) drawFramedImage(this.frameContext, this.frame.image, this.frame); }
  resetFrame() { this.frame.zoom = 1; this.frame.offsetX = 0; this.frame.offsetY = 0; this.zoomInput.value = '1'; this.renderFrame(); }

  beginFrameDrag(event) {
    event.preventDefault(); this.frameCanvas.setPointerCapture?.(event.pointerId);
    this.frame.pointerId = event.pointerId; this.frame.lastX = event.clientX; this.frame.lastY = event.clientY; this.frameCanvas.classList.add('is-dragging');
  }
  moveFrameDrag(event) {
    if (event.pointerId !== this.frame.pointerId) return;
    event.preventDefault(); const rect = this.frameCanvas.getBoundingClientRect();
    this.frame.offsetX += (event.clientX - this.frame.lastX) * (PUZZLE_WIDTH / rect.width);
    this.frame.offsetY += (event.clientY - this.frame.lastY) * (PUZZLE_HEIGHT / rect.height);
    this.frame.lastX = event.clientX; this.frame.lastY = event.clientY; this.renderFrame();
  }
  endFrameDrag(event) { if (event.pointerId === this.frame.pointerId) { this.frame.pointerId = null; this.frameCanvas.classList.remove('is-dragging'); } }

  setDifficulty(value) {
    this.difficulty = Object.hasOwn(PUZZLE_DIFFICULTIES, value) ? value : 'fun';
    for (const control of this.root.querySelectorAll('[data-puzzle-difficulty]')) this.controls?.setSelected(control, control.dataset.puzzleDifficulty === this.difficulty);
  }

  async build() {
    if (!this.frame.image) return;
    this.renderFrame();
    const sourceDataUrl = this.frameCanvas.toDataURL('image/jpeg', 0.9);
    this.puzzle = createPuzzle({ sourceDataUrl, sourceTitle: this.frame.title, difficulty: this.difficulty });
    await this.storage.putPuzzle(this.puzzle); await this.openPuzzle(this.puzzle, true);
  }

  async resume() {
    const saved = await this.storage.getPuzzle();
    if (!saved) return this.openSource();
    validatePuzzle(saved); await this.openPuzzle(saved, false);
  }

  async openPuzzle(puzzle, initialize) {
    this.puzzle = puzzle;
    const hadLegacySnapState = Object.hasOwn(this.puzzle, 'snapUsed') || Object.hasOwn(this.puzzle, 'snapArmed');
    const hadMissingRaceState = !Object.hasOwn(this.puzzle, 'raceStartedAt') || !Object.hasOwn(this.puzzle, 'raceElapsedMs');
    delete this.puzzle.snapUsed; delete this.puzzle.snapArmed;
    this.puzzle.raceStartedAt = Number.isFinite(this.puzzle.raceStartedAt) ? this.puzzle.raceStartedAt : null;
    this.puzzle.raceElapsedMs = Number.isFinite(this.puzzle.raceElapsedMs) ? this.puzzle.raceElapsedMs : null;
    if (hadLegacySnapState || hadMissingRaceState) await this.storage.putPuzzle(this.puzzle);
    this.showScreen('puzzle-play-screen');
    this.renderPuzzle();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    this.layoutPuzzle(initialize); this.startRaceTicker(); this.announce(`${puzzle.sourceTitle}. ${puzzle.pieces.filter((piece) => piece.locked).length} of ${puzzle.pieces.length} pieces placed.`);
  }

  renderPuzzle() {
    this.pieceElements.clear(); this.workspace.querySelectorAll('.puzzle-piece').forEach((piece) => piece.remove()); this.board.querySelectorAll('.puzzle-slot').forEach((slot) => slot.remove());
    const difficulty = PUZZLE_DIFFICULTIES[this.puzzle.difficulty];
    this.board.style.setProperty('--puzzle-columns', difficulty.columns); this.board.style.setProperty('--puzzle-rows', difficulty.rows);
    this.hintImage.src = this.puzzle.sourceDataUrl;
    for (const model of this.puzzle.pieces) {
      const slot = document.createElement('span'); slot.className = 'puzzle-slot'; slot.style.gridRow = String(model.row + 1); slot.style.gridColumn = String(model.column + 1); slot.setAttribute('aria-hidden', 'true'); this.board.appendChild(slot);
      const piece = document.createElement('button'); piece.type = 'button'; piece.className = 'puzzle-piece'; piece.dataset.pieceId = model.id; piece.setAttribute('aria-label', `Puzzle piece ${model.row + 1}, ${model.column + 1}${model.locked ? ', placed' : ''}`);
      piece.style.backgroundImage = `url(${this.puzzle.sourceDataUrl})`; piece.style.backgroundSize = `${difficulty.columns * 100}% ${difficulty.rows * 100}%`;
      piece.style.backgroundPosition = `${difficulty.columns === 1 ? 0 : (model.column / (difficulty.columns - 1)) * 100}% ${difficulty.rows === 1 ? 0 : (model.row / (difficulty.rows - 1)) * 100}%`;
      piece.style.zIndex = String(model.z || 1); piece.classList.toggle('is-locked', model.locked); piece.disabled = model.locked;
      piece.addEventListener('pointerdown', (event) => this.beginPieceDrag(event, model, piece));
      piece.addEventListener('pointermove', (event) => this.movePieceDrag(event));
      piece.addEventListener('keydown', (event) => this.movePieceWithKeyboard(event, model, piece));
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) piece.addEventListener(type, (event) => this.endPieceDrag(event));
      this.workspace.appendChild(piece); this.pieceElements.set(model.id, piece);
    }
    this.updateProgress();
  }

  layoutPuzzle(initialize) {
    if (!this.puzzle) return;
    const difficulty = PUZZLE_DIFFICULTIES[this.puzzle.difficulty];
    const boardWidth = this.board.clientWidth; const boardHeight = this.board.clientHeight; const boardLeft = this.board.offsetLeft + this.board.clientLeft; const boardTop = this.board.offsetTop + this.board.clientTop;
    if (!boardWidth || !boardHeight) return;
    const pieceWidth = boardWidth / difficulty.columns; const pieceHeight = boardHeight / difficulty.rows;
    const workspaceWidth = this.workspace.clientWidth; const workspaceHeight = this.workspace.clientHeight;
    const layoutAspect = workspaceWidth / workspaceHeight;
    const layoutChanged = !Number.isFinite(this.puzzle.layoutAspect) || Math.abs(Math.log(layoutAspect / this.puzzle.layoutAspect)) > 0.35;
    const loose = this.puzzle.pieces.filter((piece) => !piece.locked); const slotColumns = loose.length <= 4 ? 2 : loose.length <= 9 ? 4 : 6;
    const slotRows = Math.max(1, Math.ceil(loose.length / slotColumns));
    loose.forEach((model) => {
      if (initialize || layoutChanged || !model.position) {
        const shuffledIndex = this.puzzle.order.indexOf(model.id); const column = shuffledIndex % slotColumns; const row = Math.floor(shuffledIndex / slotColumns);
        const x = this.tray.offsetLeft + (column * Math.max(1, (this.tray.clientWidth - pieceWidth) / Math.max(1, slotColumns - 1)));
        const y = this.tray.offsetTop + (row * Math.max(42, (this.tray.clientHeight - pieceHeight) / Math.max(1, slotRows - 1)));
        model.position = { x: x / workspaceWidth, y: y / workspaceHeight };
      }
      this.positionPiece(model, model.position.x * workspaceWidth, model.position.y * workspaceHeight, pieceWidth, pieceHeight);
    });
    for (const model of this.puzzle.pieces.filter((piece) => piece.locked)) this.positionPiece(model, boardLeft + (model.column * pieceWidth), boardTop + (model.row * pieceHeight), pieceWidth, pieceHeight);
    this.puzzle.layoutAspect = layoutAspect;
    if (initialize || layoutChanged) this.persist();
  }

  positionPiece(model, x, y, width, height) {
    const element = this.pieceElements.get(model.id); if (!element) return;
    element.style.width = `${width}px`; element.style.height = `${height}px`; element.style.left = `${x}px`; element.style.top = `${y}px`;
  }

  async movePieceWithKeyboard(event, model, element) {
    if (model.locked) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); return; }
    const movement = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!movement) return;
    event.preventDefault(); const distance = event.shiftKey ? 36 : 12;
    const x = Math.max(0, Math.min(this.workspace.clientWidth - element.offsetWidth, Number.parseFloat(element.style.left) + (movement[0] * distance)));
    const y = Math.max(0, Math.min(this.workspace.clientHeight - element.offsetHeight, Number.parseFloat(element.style.top) + (movement[1] * distance)));
    this.topZ += 1; model.z = this.topZ; element.style.zIndex = String(this.topZ); this.positionPiece(model, x, y, element.offsetWidth, element.offsetHeight);
    await this.rememberLoosePiecePosition(model, element);
  }

  beginPieceDrag(event, model, element) {
    if (model.locked || this.drag) return;
    event.preventDefault(); event.stopPropagation(); element.setPointerCapture?.(event.pointerId);
    const workspaceRect = this.workspace.getBoundingClientRect(); const pieceRect = element.getBoundingClientRect();
    this.topZ += 1; model.z = this.topZ; element.style.zIndex = String(this.topZ); element.classList.add('is-dragging');
    this.drag = { pointerId: event.pointerId, model, element, offsetX: event.clientX - pieceRect.left, offsetY: event.clientY - pieceRect.top, workspaceRect };
    this.cue('pickup');
  }

  movePieceDrag(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault(); const { element, offsetX, offsetY, workspaceRect } = this.drag;
    const x = Math.max(0, Math.min(this.workspace.clientWidth - element.offsetWidth, event.clientX - workspaceRect.left - offsetX));
    const y = Math.max(0, Math.min(this.workspace.clientHeight - element.offsetHeight, event.clientY - workspaceRect.top - offsetY));
    element.style.left = `${x}px`; element.style.top = `${y}px`;
  }

  async endPieceDrag(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    await this.finishActivePieceDrag();
  }

  async finishActivePieceDrag() {
    if (!this.drag) return;
    const { model, element } = this.drag; this.drag = null; element.classList.remove('is-dragging');
    await this.rememberLoosePiecePosition(model, element);
  }

  async rememberLoosePiecePosition(model, element) {
    if (!this.puzzle || model.locked) return;
    const x = Number.parseFloat(element.style.left); const y = Number.parseFloat(element.style.top);
    model.position = { x: x / this.workspace.clientWidth, y: y / this.workspace.clientHeight };
    this.puzzle.updatedAt = new Date().toISOString(); await this.persist();
  }

  lockPiece(model, element, destination, pieceWidth, pieceHeight) {
    model.locked = true; model.position = null; element.classList.add('is-locked'); element.disabled = true; element.setAttribute('aria-label', `Puzzle piece ${model.row + 1}, ${model.column + 1}, placed`);
    this.positionPiece(model, destination.x, destination.y, pieceWidth, pieceHeight);
  }

  async finishPieceMove() {
    this.puzzle.completed = isPuzzleComplete(this.puzzle);
    if (this.puzzle.completed && Number.isFinite(this.puzzle.raceStartedAt) && !Number.isFinite(this.puzzle.raceElapsedMs)) {
      this.puzzle.raceElapsedMs = elapsedRaceTime(this.puzzle); this.stopRaceTicker();
    }
    this.puzzle.updatedAt = new Date().toISOString(); await this.persist(); this.updateProgress();
    if (this.puzzle.completed) this.complete();
  }

  cancelPieceDrag() {
    if (!this.drag) return;
    this.finishActivePieceDrag().catch(() => {});
  }

  updateProgress() {
    const locked = this.puzzle?.pieces.filter((piece) => piece.locked).length || 0; const total = this.puzzle?.pieces.length || 0;
    this.progress.textContent = `${locked} of ${total} pieces`; this.completion.hidden = !this.puzzle?.completed;
    this.board.classList.toggle('is-complete', !!this.puzzle?.completed);
    const snapAvailable = !!this.puzzle && !this.puzzle.completed && locked < total;
    this.controls.setEnabled(this.snapButton, snapAvailable); this.controls.setVisibleLabel(this.snapButton, 'Snap'); this.snapButton.setAttribute('aria-label', 'Snap pieces into place');
    const raceStarted = Number.isFinite(this.puzzle?.raceStartedAt);
    this.controls.setEnabled(this.raceButton, !!this.puzzle && !this.puzzle.completed && !raceStarted); this.controls.setVisibleLabel(this.raceButton, 'Race');
    this.raceButton.setAttribute('aria-label', raceStarted ? Number.isFinite(this.puzzle?.raceElapsedMs) ? `Race finished in ${formatRaceTime(this.puzzle.raceElapsedMs)}` : 'Puzzle race running' : 'Start puzzle race');
    this.updateRaceDisplay();
  }

  updateRaceDisplay() {
    const raceStarted = Number.isFinite(this.puzzle?.raceStartedAt);
    this.raceTime.hidden = !raceStarted;
    if (raceStarted) this.raceTime.textContent = `⏱ ${formatRaceTime(elapsedRaceTime(this.puzzle))}`;
  }

  stopRaceTicker() {
    if (this.raceTicker !== null) clearInterval(this.raceTicker);
    this.raceTicker = null;
  }

  startRaceTicker() {
    this.stopRaceTicker();
    if (!this.puzzle || !Number.isFinite(this.puzzle.raceStartedAt) || Number.isFinite(this.puzzle.raceElapsedMs) || this.puzzle.completed) return;
    this.updateRaceDisplay(); this.raceTicker = setInterval(() => this.updateRaceDisplay(), 100);
  }

  async startRace() {
    if (!this.puzzle || this.puzzle.completed || Number.isFinite(this.puzzle.raceStartedAt)) return;
    this.puzzle.raceStartedAt = Date.now(); this.puzzle.raceElapsedMs = null; this.puzzle.updatedAt = new Date().toISOString();
    await this.persist(); this.updateProgress(); this.startRaceTicker(); this.announce('Race started!');
  }

  async snapPiecesIntoPlace() {
    if (!this.puzzle || this.puzzle.completed) return;
    await this.finishActivePieceDrag();
    const difficulty = PUZZLE_DIFFICULTIES[this.puzzle.difficulty]; const pieceWidth = this.board.clientWidth / difficulty.columns; const pieceHeight = this.board.clientHeight / difficulty.rows;
    const boardLeft = this.board.offsetLeft + this.board.clientLeft; const boardTop = this.board.offsetTop + this.board.clientTop;
    const eligible = [];
    for (const model of this.puzzle.pieces.filter((piece) => !piece.locked)) {
      const element = this.pieceElements.get(model.id); if (!element) continue;
      const position = { x: Number.parseFloat(element.style.left), y: Number.parseFloat(element.style.top) };
      const destination = { x: boardLeft + (model.column * pieceWidth), y: boardTop + (model.row * pieceHeight) };
      if (isPieceCenterInsideDestination(position, destination, pieceWidth, pieceHeight)) eligible.push({ model, element, destination });
    }
    if (!eligible.length) { this.announce('No pieces are over their matching spots yet.'); return; }
    for (const { model, element, destination } of eligible) this.lockPiece(model, element, destination, pieceWidth, pieceHeight);
    await this.finishPieceMove();
    if (!this.puzzle.completed) this.announce(`${eligible.length} ${eligible.length === 1 ? 'piece' : 'pieces'} snapped into place.`);
  }

  async persist() { if (this.puzzle) await this.storage.putPuzzle(this.puzzle); }

  async restart() {
    if (!this.puzzle) return;
    this.stopRaceTicker();
    this.puzzle = restartPuzzle(this.puzzle); await this.storage.putPuzzle(this.puzzle); await this.openPuzzle(this.puzzle, true); this.announce('Puzzle shuffled.');
  }

  showHint() {
    clearTimeout(this.hintTimer); this.board.classList.add('show-hint'); this.hintTimer = setTimeout(() => this.board.classList.remove('show-hint'), 1400);
  }

  complete() {
    this.updateProgress(); this.cue('complete'); this.announce('Puzzle complete! You did it!');
  }

  diagnostics() { return this.puzzle ? { difficulty: this.puzzle.difficulty, pieces: this.puzzle.pieces.length, locked: this.puzzle.pieces.filter((piece) => piece.locked).length, completed: this.puzzle.completed, race: Number.isFinite(this.puzzle.raceElapsedMs) ? 'finished' : Number.isFinite(this.puzzle.raceStartedAt) ? 'running' : 'idle', raceElapsedMs: Number.isFinite(this.puzzle.raceStartedAt) ? elapsedRaceTime(this.puzzle) : null } : null; }
}
