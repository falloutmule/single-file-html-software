import type { ControlFeedbackCueRole } from "@sfhs/control-feedback-runtime";

import type {
  AudioBufferLike,
  AudioContextLike,
  BufferSourceLike,
  CreateWebAudioCueTransportOptions,
  GainNodeLike,
  SymbolicControlCue,
  WebAudioCueConfig,
  WebAudioCueFamily,
  WebAudioCueTransport,
  WebAudioPlayResult
} from "./types.ts";

interface SharedEngine {
  readonly id: number;
  readonly context: AudioContextLike;
  readonly generated: Map<WebAudioCueFamily, AudioBufferLike>;
}

interface Voice {
  readonly id: number;
  readonly source: BufferSourceLike;
  readonly gain: GainNodeLike;
}

const engines = new WeakMap<Window, SharedEngine>();
let nextEngineId = 1;

type AudioContextConstructor = new (options?: AudioContextOptions) => AudioContext;

function audioContextConstructor(windowValue: Window | undefined): AudioContextConstructor | undefined {
  return (windowValue as (Window & { readonly AudioContext?: AudioContextConstructor }) | undefined)?.AudioContext;
}

export const defaultWebAudioCueConfig = Object.freeze({
  masterVolume: 0.8,
  muted: false,
  voiceLimit: 8,
  retriggerPolicy: "stop-oldest",
  pitchVarianceCents: 0,
  seed: 1,
  cueVolumes: Object.freeze({}),
  cueFamilies: Object.freeze({})
} as const satisfies WebAudioCueConfig);

const defaultFamilies: Readonly<Record<ControlFeedbackCueRole, WebAudioCueFamily>> = Object.freeze({
  press: "soft-click",
  activate: "plastic-click",
  cancel: "soft-click",
  "select-on": "toggle-on",
  "select-off": "toggle-off",
  success: "success",
  error: "error"
});

const familyParameters = Object.freeze({
  "soft-click": { duration: 0.045, startHz: 620, endHz: 360, noise: 0.05, gain: 0.42 },
  "plastic-click": { duration: 0.065, startHz: 920, endHz: 270, noise: 0.12, gain: 0.5 },
  "heavy-click": { duration: 0.09, startHz: 230, endHz: 90, noise: 0.08, gain: 0.62 },
  "toggle-on": { duration: 0.1, startHz: 420, endHz: 740, noise: 0.02, gain: 0.44 },
  "toggle-off": { duration: 0.1, startHz: 620, endHz: 320, noise: 0.02, gain: 0.44 },
  success: { duration: 0.18, startHz: 520, endHz: 1040, noise: 0, gain: 0.4 },
  error: { duration: 0.18, startHz: 180, endHz: 110, noise: 0.08, gain: 0.55 }
} as const satisfies Record<WebAudioCueFamily, { duration: number; startHz: number; endHz: number; noise: number; gain: number }>);

function finiteUnit(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be between 0 and 1.`);
  return value;
}

function validateConfig(config: WebAudioCueConfig): WebAudioCueConfig {
  finiteUnit(config.masterVolume, "masterVolume");
  if (!Number.isInteger(config.voiceLimit) || config.voiceLimit < 1 || config.voiceLimit > 32) throw new RangeError("voiceLimit must be an integer from 1 to 32.");
  if (!Number.isFinite(config.pitchVarianceCents) || config.pitchVarianceCents < 0 || config.pitchVarianceCents > 1200) throw new RangeError("pitchVarianceCents must be from 0 to 1200.");
  if (!Number.isSafeInteger(config.seed)) throw new RangeError("seed must be a safe integer.");
  for (const [role, volume] of Object.entries(config.cueVolumes)) finiteUnit(volume, `cueVolumes.${role}`);
  return Object.freeze({ ...config, cueVolumes: Object.freeze({ ...config.cueVolumes }), cueFamilies: Object.freeze({ ...config.cueFamilies }) });
}

function mergeConfig(current: WebAudioCueConfig, update: Partial<WebAudioCueConfig>): WebAudioCueConfig {
  return validateConfig({
    ...current,
    ...update,
    cueVolumes: { ...current.cueVolumes, ...update.cueVolumes },
    cueFamilies: { ...current.cueFamilies, ...update.cueFamilies }
  });
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return result >>> 0;
}

function generatedBuffer(engine: SharedEngine, family: WebAudioCueFamily): AudioBufferLike {
  const cached = engine.generated.get(family);
  if (cached !== undefined) return cached;
  const parameters = familyParameters[family];
  const length = Math.max(1, Math.ceil(parameters.duration * engine.context.sampleRate));
  const buffer = engine.context.createBuffer(1, length, engine.context.sampleRate);
  const data = buffer.getChannelData(0);
  let noiseState = hash(family) || 1;
  let phase = 0;
  for (let index = 0; index < data.length; index += 1) {
    const progress = index / data.length;
    const frequency = parameters.startHz + ((parameters.endHz - parameters.startHz) * progress);
    phase += (Math.PI * 2 * frequency) / engine.context.sampleRate;
    noiseState = (Math.imul(noiseState, 1664525) + 1013904223) >>> 0;
    const noise = ((noiseState / 0xffffffff) * 2) - 1;
    const envelope = (1 - progress) ** 3;
    data[index] = (Math.sin(phase) + (noise * parameters.noise)) * parameters.gain * envelope;
  }
  engine.generated.set(family, buffer);
  return buffer;
}

function createRealEngine(windowValue: Window): SharedEngine | undefined {
  const existing = engines.get(windowValue);
  if (existing !== undefined) return existing;
  const AudioContextValue = audioContextConstructor(windowValue);
  if (AudioContextValue === undefined) return undefined;
  const context = new AudioContextValue({ latencyHint: "interactive" }) as unknown as AudioContextLike;
  const engine = Object.freeze({ id: nextEngineId, context, generated: new Map<WebAudioCueFamily, AudioBufferLike>() });
  nextEngineId += 1;
  engines.set(windowValue, engine);
  return engine;
}

export function createWebAudioCueTransport(options: CreateWebAudioCueTransportOptions = {}): WebAudioCueTransport {
  const windowValue = options.window ?? (typeof window === "undefined" ? undefined : window);
  const injectedEngine = options.context === undefined ? undefined : { id: nextEngineId++, context: options.context, generated: new Map<WebAudioCueFamily, AudioBufferLike>() };
  let engine: SharedEngine | undefined = injectedEngine;
  let config = mergeConfig(defaultWebAudioCueConfig, options.config ?? {});
  let master: GainNodeLike | undefined;
  let unlocked = false;
  let disposed = false;
  let nextVoiceId = 1;
  let playSequence = 0;
  let totalScheduled = 0;
  let totalDropped = 0;
  const voices: Voice[] = [];
  const samples = new Map<string, AudioBufferLike>();

  const ensureEngine = (): SharedEngine | undefined => {
    engine ??= windowValue === undefined ? undefined : createRealEngine(windowValue);
    if (engine !== undefined && master === undefined) {
      master = engine.context.createGain();
      master.gain.value = config.muted ? 0 : config.masterVolume;
      master.connect(engine.context.destination);
    }
    return engine;
  };

  const removeVoice = (id: number): void => {
    const index = voices.findIndex((voice) => voice.id === id);
    if (index < 0) return;
    const [voice] = voices.splice(index, 1);
    voice?.source.disconnect();
    voice?.gain.disconnect();
  };

  const familyFor = (cue: SymbolicControlCue): WebAudioCueFamily | undefined => {
    if (cue.cueId !== undefined && cue.cueId in familyParameters) return cue.cueId as WebAudioCueFamily;
    return config.cueFamilies[cue.role] ?? defaultFamilies[cue.role];
  };

  const playCue = (cue: SymbolicControlCue): WebAudioPlayResult => {
    if (disposed) return { played: false, reason: "disposed" };
    const activeEngine = ensureEngine();
    if (activeEngine === undefined) return { played: false, reason: "unsupported" };
    if (!unlocked || activeEngine.context.state !== "running") return { played: false, reason: "locked" };
    const family = familyFor(cue);
    const sample = cue.cueId === undefined ? undefined : samples.get(cue.cueId);
    if (family === undefined && sample === undefined) return { played: false, reason: "unknown-cue" };
    if (config.muted || config.masterVolume === 0 || (config.cueVolumes[cue.role] ?? 1) === 0) return { played: false, reason: "muted", ...(family === undefined ? {} : { family }) };
    if (voices.length >= config.voiceLimit) {
      if (config.retriggerPolicy === "drop-newest") {
        totalDropped += 1;
        return { played: false, reason: "voice-limit", ...(family === undefined ? {} : { family }) };
      }
      const oldest = voices[0];
      oldest?.source.stop();
      if (oldest !== undefined) removeVoice(oldest.id);
    }
    const source = activeEngine.context.createBufferSource();
    const voiceGain = activeEngine.context.createGain();
    const selectedFamily = family ?? defaultFamilies[cue.role];
    source.buffer = sample ?? generatedBuffer(activeEngine, selectedFamily);
    playSequence += 1;
    const varianceUnit = ((hash(`${config.seed}:${playSequence}:${cue.role}`) / 0xffffffff) * 2) - 1;
    source.playbackRate.value = 2 ** ((varianceUnit * config.pitchVarianceCents) / 1200);
    voiceGain.gain.value = config.cueVolumes[cue.role] ?? 1;
    source.connect(voiceGain);
    voiceGain.connect(master as GainNodeLike);
    const voice = { id: nextVoiceId, source, gain: voiceGain };
    nextVoiceId += 1;
    voices.push(voice);
    source.onended = () => removeVoice(voice.id);
    source.start(activeEngine.context.currentTime);
    totalScheduled += 1;
    return { played: true, family: selectedFamily, voiceId: voice.id };
  };

  return Object.freeze({
    get supported() { return options.context !== undefined || audioContextConstructor(windowValue) !== undefined; },
    async unlockFromGesture(event: Event): Promise<boolean> {
      if (disposed || !event.isTrusted) return false;
      const activeEngine = ensureEngine();
      if (activeEngine === undefined) return false;
      await activeEngine.context.resume();
      unlocked = activeEngine.context.state === "running";
      return unlocked;
    },
    playCue,
    async registerSample(cueId: string, encodedBytes: ArrayBuffer): Promise<void> {
      if (!/^[a-z0-9][a-z0-9._-]*$/.test(cueId)) throw new Error("Sample cueId is invalid.");
      const activeEngine = ensureEngine();
      if (activeEngine === undefined) throw new Error("Web Audio is unavailable.");
      const decoded = await activeEngine.context.decodeAudioData(encodedBytes.slice(0));
      if (!Number.isFinite(decoded.duration) || decoded.duration <= 0 || decoded.duration > 3) throw new Error("Control feedback samples must be longer than 0 and no longer than 3 seconds.");
      samples.set(cueId, decoded);
    },
    updateConfig(update: Partial<WebAudioCueConfig>): void {
      if (disposed) throw new Error("Web Audio cue transport is disposed.");
      config = mergeConfig(config, update);
      if (master !== undefined) master.gain.value = config.muted ? 0 : config.masterVolume;
      while (voices.length > config.voiceLimit) {
        const oldest = voices[0];
        oldest?.source.stop();
        if (oldest !== undefined) removeVoice(oldest.id);
      }
    },
    getConfig: () => config,
    getDiagnostics: () => Object.freeze({
      supported: options.context !== undefined || audioContextConstructor(windowValue) !== undefined,
      unlocked,
      contextState: engine?.context.state ?? "unavailable",
      ...(engine === undefined ? {} : { engineId: engine.id }),
      activeVoices: voices.length,
      generatedBufferCount: engine?.generated.size ?? 0,
      sampleBufferCount: samples.size,
      totalScheduled,
      totalDropped,
      muted: config.muted,
      masterVolume: config.masterVolume
    }),
    stopAll(): void {
      for (const voice of [...voices]) {
        voice.source.stop();
        removeVoice(voice.id);
      }
    },
    dispose(): void {
      if (disposed) return;
      for (const voice of [...voices]) {
        voice.source.stop();
        removeVoice(voice.id);
      }
      master?.disconnect();
      samples.clear();
      disposed = true;
    }
  });
}
