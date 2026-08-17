import { describe, expect, it } from "vitest";

import { createWebAudioCueTransport } from "./audio.ts";
import type { AudioBufferLike, AudioContextLike, AudioNodeLike, BufferSourceLike, GainNodeLike } from "./types.ts";

class FakeNode implements AudioNodeLike {
  connect(): AudioNodeLike { return this; }
  disconnect(): void {}
}

class FakeBuffer implements AudioBufferLike {
  readonly sampleRate = 48_000;
  readonly data: Float32Array;
  readonly duration: number;
  constructor(duration: number) { this.duration = duration; this.data = new Float32Array(Math.max(1, Math.ceil(duration * this.sampleRate))); }
  getChannelData(): Float32Array { return this.data; }
}

class FakeGain extends FakeNode implements GainNodeLike { readonly gain = { value: 1 }; }

class FakeSource extends FakeNode implements BufferSourceLike {
  buffer: AudioBufferLike | null = null;
  readonly playbackRate = { value: 1 };
  onended: (() => void) | null = null;
  started = false;
  stopped = false;
  start(): void { this.started = true; }
  stop(): void { this.stopped = true; this.onended?.(); }
}

class FakeContext implements AudioContextLike {
  state = "suspended";
  readonly sampleRate = 48_000;
  readonly currentTime = 1;
  readonly destination = new FakeNode();
  readonly sources: FakeSource[] = [];
  decodeDuration = 0.2;
  decodeCount = 0;
  createGain(): FakeGain { return new FakeGain(); }
  createBuffer(_channels: number, length: number, sampleRate: number): FakeBuffer { return new FakeBuffer(length / sampleRate); }
  createBufferSource(): FakeSource { const source = new FakeSource(); this.sources.push(source); return source; }
  async decodeAudioData(): Promise<FakeBuffer> { this.decodeCount += 1; return new FakeBuffer(this.decodeDuration); }
  async resume(): Promise<void> { this.state = "running"; }
}

const trustedGesture = { isTrusted: true } as Event;

describe("web audio cue transport", () => {
  it("requires a trusted gesture, schedules built-in cues, and caches generated buffers", async () => {
    const context = new FakeContext();
    const transport = createWebAudioCueTransport({ context });
    await expect(transport.unlockFromGesture({ isTrusted: false } as Event)).resolves.toBe(false);
    expect(transport.playCue({ role: "activate" })).toEqual({ played: false, reason: "locked" });
    await expect(transport.unlockFromGesture(trustedGesture)).resolves.toBe(true);
    expect(transport.playCue({ role: "activate" }).played).toBe(true);
    expect(transport.playCue({ role: "activate" }).played).toBe(true);
    expect(transport.getDiagnostics()).toMatchObject({ unlocked: true, totalScheduled: 2, generatedBufferCount: 1 });
  });

  it("shares one interactive AudioContext between transports for the same window", async () => {
    let constructions = 0;
    class WindowContext extends FakeContext { constructor(options: AudioContextOptions) { super(); constructions += 1; expect(options.latencyHint).toBe("interactive"); } }
    const windowValue = { AudioContext: WindowContext } as unknown as Window;
    const first = createWebAudioCueTransport({ window: windowValue });
    const second = createWebAudioCueTransport({ window: windowValue });
    await first.unlockFromGesture(trustedGesture);
    await second.unlockFromGesture(trustedGesture);
    expect(constructions).toBe(1);
    expect(first.getDiagnostics().engineId).toBe(second.getDiagnostics().engineId);
  });

  it("applies mute, master volume, and per-cue volume without changing cue semantics", async () => {
    const context = new FakeContext();
    const transport = createWebAudioCueTransport({ context });
    await transport.unlockFromGesture(trustedGesture);
    transport.updateConfig({ muted: true });
    expect(transport.playCue({ role: "press" }).reason).toBe("muted");
    transport.updateConfig({ muted: false, masterVolume: 0.3, cueVolumes: { press: 0 } });
    expect(transport.playCue({ role: "press" }).reason).toBe("muted");
    transport.updateConfig({ cueVolumes: { press: 0.5 } });
    expect(transport.playCue({ role: "press" }).played).toBe(true);
    expect(transport.getDiagnostics()).toMatchObject({ masterVolume: 0.3, muted: false });
  });

  it("uses deterministic seeded pitch variance", async () => {
    const one = new FakeContext();
    const two = new FakeContext();
    const first = createWebAudioCueTransport({ context: one, config: { seed: 42, pitchVarianceCents: 120 } });
    const second = createWebAudioCueTransport({ context: two, config: { seed: 42, pitchVarianceCents: 120 } });
    await first.unlockFromGesture(trustedGesture);
    await second.unlockFromGesture(trustedGesture);
    first.playCue({ role: "activate" });
    second.playCue({ role: "activate" });
    expect(one.sources[0]?.playbackRate.value).toBe(two.sources[0]?.playbackRate.value);
    expect(one.sources[0]?.playbackRate.value).not.toBe(1);
  });

  it("bounds concurrent voices under both retrigger policies", async () => {
    const dropContext = new FakeContext();
    const drop = createWebAudioCueTransport({ context: dropContext, config: { voiceLimit: 1, retriggerPolicy: "drop-newest" } });
    await drop.unlockFromGesture(trustedGesture);
    expect(drop.playCue({ role: "activate" }).played).toBe(true);
    expect(drop.playCue({ role: "activate" })).toMatchObject({ played: false, reason: "voice-limit" });
    expect(drop.getDiagnostics()).toMatchObject({ activeVoices: 1, totalDropped: 1 });

    const stopContext = new FakeContext();
    const stop = createWebAudioCueTransport({ context: stopContext, config: { voiceLimit: 1, retriggerPolicy: "stop-oldest" } });
    await stop.unlockFromGesture(trustedGesture);
    stop.playCue({ role: "activate" });
    stop.playCue({ role: "activate" });
    expect(stopContext.sources[0]?.stopped).toBe(true);
    expect(stop.getDiagnostics().activeVoices).toBe(1);
  });

  it("decodes and caches short imported samples and rejects invalid or oversized samples", async () => {
    const context = new FakeContext();
    const transport = createWebAudioCueTransport({ context });
    await transport.registerSample("custom.tap", new ArrayBuffer(4));
    await transport.unlockFromGesture(trustedGesture);
    expect(transport.playCue({ role: "activate", cueId: "custom.tap" }).played).toBe(true);
    expect(transport.getDiagnostics().sampleBufferCount).toBe(1);
    await expect(transport.registerSample("bad id", new ArrayBuffer(1))).rejects.toThrow("invalid");
    context.decodeDuration = 3.1;
    await expect(transport.registerSample("too-long", new ArrayBuffer(1))).rejects.toThrow("no longer than 3 seconds");
  });

  it("fails closed for invalid configuration", () => {
    expect(() => createWebAudioCueTransport({ context: new FakeContext(), config: { voiceLimit: 0 } })).toThrow("voiceLimit");
    expect(() => createWebAudioCueTransport({ context: new FakeContext(), config: { masterVolume: 2 } })).toThrow("masterVolume");
    expect(() => createWebAudioCueTransport({ context: new FakeContext(), config: { pitchVarianceCents: -1 } })).toThrow("pitchVarianceCents");
  });

  it("stops active sources and refuses playback after disposal", async () => {
    const context = new FakeContext();
    const transport = createWebAudioCueTransport({ context });
    await transport.unlockFromGesture(trustedGesture);
    transport.playCue({ role: "activate" });
    transport.dispose();
    expect(context.sources[0]?.stopped).toBe(true);
    expect(transport.playCue({ role: "activate" })).toEqual({ played: false, reason: "disposed" });
  });
});
