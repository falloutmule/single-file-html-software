import type { ControlFeedbackCueRole } from "@sfhs/control-feedback-runtime";

export type WebAudioCueFamily = "soft-click" | "plastic-click" | "heavy-click" | "toggle-on" | "toggle-off" | "success" | "error";
export type WebAudioRetriggerPolicy = "drop-newest" | "stop-oldest";

export interface SymbolicControlCue {
  readonly role: ControlFeedbackCueRole;
  readonly cueId?: string;
}

export interface WebAudioCueConfig {
  readonly masterVolume: number;
  readonly muted: boolean;
  readonly voiceLimit: number;
  readonly retriggerPolicy: WebAudioRetriggerPolicy;
  readonly pitchVarianceCents: number;
  readonly seed: number;
  readonly cueVolumes: Readonly<Partial<Record<ControlFeedbackCueRole, number>>>;
  readonly cueFamilies: Readonly<Partial<Record<ControlFeedbackCueRole, WebAudioCueFamily>>>;
}

export interface WebAudioPlayResult {
  readonly played: boolean;
  readonly reason?: "unsupported" | "locked" | "muted" | "voice-limit" | "unknown-cue" | "disposed";
  readonly family?: WebAudioCueFamily;
  readonly voiceId?: number;
}

export interface WebAudioCueDiagnostics {
  readonly supported: boolean;
  readonly unlocked: boolean;
  readonly contextState: string;
  readonly engineId?: number;
  readonly activeVoices: number;
  readonly generatedBufferCount: number;
  readonly sampleBufferCount: number;
  readonly totalScheduled: number;
  readonly totalDropped: number;
  readonly muted: boolean;
  readonly masterVolume: number;
}

export interface WebAudioCueTransport {
  readonly supported: boolean;
  unlockFromGesture(event: Event): Promise<boolean>;
  playCue(cue: SymbolicControlCue): WebAudioPlayResult;
  registerSample(cueId: string, encodedBytes: ArrayBuffer): Promise<void>;
  updateConfig(update: Partial<WebAudioCueConfig>): void;
  getConfig(): WebAudioCueConfig;
  getDiagnostics(): WebAudioCueDiagnostics;
  stopAll(): void;
  dispose(): void;
}

export interface AudioParamLike { value: number; }
export interface AudioBufferLike { readonly duration: number; readonly sampleRate: number; getChannelData(channel: number): Float32Array; }
export interface AudioNodeLike { connect(destination: AudioNodeLike): AudioNodeLike; disconnect(): void; }
export interface GainNodeLike extends AudioNodeLike { readonly gain: AudioParamLike; }
export interface BufferSourceLike extends AudioNodeLike {
  buffer: AudioBufferLike | null;
  readonly playbackRate: AudioParamLike;
  onended: (() => void) | null;
  start(when?: number): void;
  stop(when?: number): void;
}
export interface AudioContextLike {
  readonly state: string;
  readonly sampleRate: number;
  readonly currentTime: number;
  readonly destination: AudioNodeLike;
  createGain(): GainNodeLike;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
  createBufferSource(): BufferSourceLike;
  decodeAudioData(bytes: ArrayBuffer): Promise<AudioBufferLike>;
  resume(): Promise<void>;
}

export interface CreateWebAudioCueTransportOptions {
  readonly window?: Window;
  readonly context?: AudioContextLike;
  readonly config?: Partial<WebAudioCueConfig>;
}
