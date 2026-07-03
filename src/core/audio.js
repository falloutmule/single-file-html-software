/**
 * audio.js — Minimal audio bootstrap (Web Audio API)
 *
 * AudioContext is created lazily on the first user gesture to satisfy
 * browser autoplay policies.
 */

let _ctx     = null;
let _muted   = false;
let _started = false;

function ensureContext() {
  if (_ctx) return _ctx;
  try {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('[audio] AudioContext not available:', e);
    return null;
  }
  return _ctx;
}

/**
 * Initialise the audio system. Safe to call multiple times.
 * Does NOT resume the context — must be triggered by a user gesture.
 */
export function initAudio() {
  _started = true;
  ensureContext();
}

/**
 * Play a simple oscillator chirp.
 * @param {number} freq  - Frequency in Hz (default 440)
 * @param {number} dur   - Duration in seconds (default 0.1)
 */
export function playChirp(freq = 440, dur = 0.1) {
  if (_muted) return;
  const ac = ensureContext();
  if (!ac) return;

  // Resume if suspended (required after user gesture)
  if (ac.state === 'suspended') {
    ac.resume();
  }

  const osc  = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ac.currentTime);

  gain.gain.setValueAtTime(0.3, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + dur);
}

/** Mute audio output. */
export function mute() {
  _muted = true;
}

/** Unmute audio output. */
export function unmute() {
  _muted = false;
}
