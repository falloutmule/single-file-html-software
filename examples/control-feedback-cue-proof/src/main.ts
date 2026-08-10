import { createWebAudioCueTransport, type WebAudioPlayResult } from "@sfhs/control-feedback-audio-web";
import { p0ControlPresets } from "@sfhs/control-feedback-contract";
import { mountDomControl } from "@sfhs/control-feedback-dom";
import { createWebHapticTransport, type WebHapticResult } from "@sfhs/control-feedback-haptics-web";

const preset = p0ControlPresets.find((candidate) => candidate.id === "uv-plastic-inset-press");
if (preset === undefined) throw new Error("Missing control preset.");
const mount = document.getElementById("control");
const unlock = document.getElementById("unlock");
const mute = document.getElementById("mute");
const diagnostic = document.getElementById("diagnostic");
if (!(mount instanceof HTMLElement) || !(unlock instanceof HTMLButtonElement) || !(mute instanceof HTMLButtonElement)) throw new Error("Cue proof markup is incomplete.");

const audio = createWebAudioCueTransport({ window, config: { voiceLimit: 3, retriggerPolicy: "drop-newest", pitchVarianceCents: 18, seed: 20260809 } });
const sharedAudio = createWebAudioCueTransport({ window });
const haptics = createWebHapticTransport({ navigator });
const audioResults: WebAudioPlayResult[] = [];
const hapticResults: WebHapticResult[] = [];
let activationCount = 0;

function renderDiagnostic(): void {
  const state = audio.getDiagnostics();
  if (diagnostic !== null) diagnostic.textContent = `${state.contextState} / ${state.totalScheduled} audio / ${hapticResults.length} haptic`;
}

const control = mountDomControl({
  container: mount,
  controlId: "cue-control",
  preset,
  label: "Tactile press",
  onActivate() { activationCount += 1; },
  onCue(cue) {
    audioResults.push(audio.playCue(cue));
    hapticResults.push(haptics.playCue(cue));
    renderDiagnostic();
  }
});

unlock.addEventListener("click", async (event) => {
  const [first, second] = await Promise.all([audio.unlockFromGesture(event), sharedAudio.unlockFromGesture(event)]);
  unlock.textContent = first && second ? "Sound ready" : "Sound unavailable";
  renderDiagnostic();
});

mute.addEventListener("click", () => {
  const next = !audio.getConfig().muted;
  audio.updateConfig({ muted: next });
  mute.setAttribute("aria-pressed", String(next));
  mute.textContent = next ? "Unmute" : "Mute";
  renderDiagnostic();
});

const proofApi = Object.freeze({
  audioResults,
  hapticResults,
  control,
  get activationCount() { return activationCount; },
  diagnostics: () => Object.freeze({ primary: audio.getDiagnostics(), shared: sharedAudio.getDiagnostics(), hapticSupported: haptics.supported }),
  playBurst(count: number) {
    const results: WebAudioPlayResult[] = [];
    for (let index = 0; index < count; index += 1) results.push(audio.playCue({ role: "activate" }));
    audioResults.push(...results);
    renderDiagnostic();
    return results;
  },
  selfCheck() {
    return Object.freeze({
      pass: control.interactive instanceof HTMLButtonElement
        && document.querySelectorAll("script[src^='http'],link[href^='http'],img[src^='http']").length === 0,
      audioSupported: audio.supported,
      hapticSupported: haptics.supported
    });
  }
});

Object.assign(window, { CFCUE: proofApi });
document.body.dataset.phase = "ready";

declare global { interface Window { CFCUE: typeof proofApi; } }
