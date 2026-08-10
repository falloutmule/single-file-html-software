export const packageIdentity = "@sfhs/control-feedback-audio-web" as const;
export { createWebAudioCueTransport, defaultWebAudioCueConfig } from "./audio.ts";
export type {
  AudioBufferLike,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  BufferSourceLike,
  CreateWebAudioCueTransportOptions,
  GainNodeLike,
  SymbolicControlCue,
  WebAudioCueConfig,
  WebAudioCueDiagnostics,
  WebAudioCueFamily,
  WebAudioCueTransport,
  WebAudioPlayResult,
  WebAudioRetriggerPolicy
} from "./types.ts";
