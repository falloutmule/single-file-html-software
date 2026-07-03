/**
 * main.js — Game bootstrap for Single File Shell (Milestone 0)
 *
 * Minimal playable shell:
 *  - Title screen with Start button
 *  - Game loop via requestAnimationFrame
 *  - Blue 20×20 square that moves with arrow keys, WASD, or pointer drag
 */

(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────────
  const titleScreen = document.getElementById('title-screen');
  const gameScreen  = document.getElementById('game-screen');
  const canvas      = document.getElementById('game-canvas');
  const ctx         = canvas.getContext('2d');

  // ── State ───────────────────────────────────────────────────
  let running  = false;
  let frameId  = null;
  let frameCnt = 0;
  let lastTime = 0;

  // Moving square
  const marker = { x: 0, y: 0, size: 20, speed: 300 }; // px/s

  // Input
  const keys = {};
  let pointer = { x: 0, y: 0, down: false, id: -1 };

  // ── Viewport sizing ────────────────────────────────────────
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width  = w;
    canvas.height = h;
  }

  window.addEventListener('resize', resize);
  resize();

  // ── Title Screen ───────────────────────────────────────────
  function showTitleScreen() {
    titleScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
  }

  // ── Start Game ────────────────────────────────────────────
  function startGame() {
    titleScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    resize();

    // Center marker
    marker.x = canvas.width  / 2 - marker.size / 2;
    marker.y = canvas.height / 2 - marker.size / 2;

    running  = true;
    frameCnt = 0;
    lastTime = performance.now();
    loop(lastTime);
  }

  // ── Input: Keyboard ────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  // ── Input: Pointer ─────────────────────────────────────────
  canvas.addEventListener('pointerdown', (e) => {
    if (pointer.id === -1) {
      pointer.id   = e.pointerId;
      pointer.down = true;
      pointer.x    = e.clientX;
      pointer.y    = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === pointer.id) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerId === pointer.id) {
      pointer.down = false;
      pointer.id   = -1;
      canvas.releasePointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointercancel', (e) => {
    if (e.pointerId === pointer.id) {
      pointer.down = false;
      pointer.id   = -1;
    }
  });

  // ── Direction helpers ──────────────────────────────────────
  function getInputDir() {
    let dx = 0, dy = 0;

    // Keyboard: arrows + WASD
    if (keys['ArrowLeft']  || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
    if (keys['ArrowUp']    || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown']  || keys['s'] || keys['S']) dy += 1;

    // Pointer drag overrides keyboard when active
    if (pointer.down) {
      // Move marker toward pointer
      const cx = marker.x + marker.size / 2;
      const cy = marker.y + marker.size / 2;
      const distX = pointer.x - cx;
      const distY = pointer.y - cy;
      const dist  = Math.sqrt(distX * distX + distY * distY);
      if (dist > 2) {
        dx = distX / dist;
        dy = distY / dist;
      }
    }

    // Normalize diagonal
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1) { dx /= len; dy /= len; }

    return { dx, dy };
  }

  // ── Update ─────────────────────────────────────────────────
  function update(dt) {
    const { dx, dy } = getInputDir();
    marker.x += dx * marker.speed * dt;
    marker.y += dy * marker.speed * dt;

    // Clamp to canvas bounds
    marker.x = Math.max(0, Math.min(canvas.width  - marker.size, marker.x));
    marker.y = Math.max(0, Math.min(canvas.height - marker.size, marker.y));
  }

  // ── Draw ───────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Blue moving square
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(marker.x, marker.y, marker.size, marker.size);
  }

  // ── Game Loop ──────────────────────────────────────────────
  function loop(now) {
    if (!running) return;

    const dt = Math.min((now - lastTime) / 1000, 0.1); // cap at 100ms
    lastTime = now;
    frameCnt++;

    update(dt);
    draw();

    frameId = requestAnimationFrame(loop);
  }

  // ── Expose on window ───────────────────────────────────────
  window.SingleFileShell = {
    showTitleScreen,
    startGame,
    getFrameCount: () => frameCnt,
    stop() {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = null;
    },
  };

  // ── Wire Start button ──────────────────────────────────────
  document.getElementById('start-btn').addEventListener('click', startGame);

  // Init: show title screen
  showTitleScreen();
})();
