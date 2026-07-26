import { describe, expect, it, vi } from "vitest";

import {
  createFixtureAudioController,
  type FixtureAudioBufferSource,
  type FixtureAudioContext
} from "./audio.ts";

function fakeAudioContext(): {
  readonly context: FixtureAudioContext;
  readonly resume: ReturnType<typeof vi.fn>;
  readonly start: ReturnType<typeof vi.fn>;
  readonly close: ReturnType<typeof vi.fn>;
} {
  const resume = vi.fn(async () => undefined);
  const start = vi.fn();
  const close = vi.fn(async () => undefined);
  const source: FixtureAudioBufferSource = {
    buffer: null,
    connect: vi.fn(),
    start
  };
  return {
    context: {
      state: "suspended",
      destination: {},
      resume,
      decodeAudioData: vi.fn(async () => ({}) as AudioBuffer),
      createBufferSource: () => source,
      close
    },
    resume,
    start,
    close
  };
}

describe("SFHS Pixi audio unlock", () => {
  it("creates and resumes audio only when unlock is requested", async () => {
    const fake = fakeAudioContext();
    const createContext = vi.fn(() => fake.context);
    const fetchBytes = vi.fn(async () => new ArrayBuffer(8));
    const audio = createFixtureAudioController({ sourceUrl: "./audio-unlock.wav", createContext, fetchBytes });

    expect(audio.getStatus()).toBe("locked");
    expect(createContext).not.toHaveBeenCalled();
    await expect(audio.unlock()).resolves.toBe(true);
    expect(fake.resume).toHaveBeenCalledOnce();
    expect(fetchBytes).toHaveBeenCalledWith("./audio-unlock.wav");
    expect(fake.start).toHaveBeenCalledOnce();
    expect(audio.getStatus()).toBe("ready");

    await audio.unlock();
    expect(fake.start).toHaveBeenCalledTimes(2);
    await audio.dispose();
    expect(fake.close).toHaveBeenCalledOnce();
    expect(audio.getStatus()).toBe("disposed");
  });

  it("reports failure without throwing through the fixture UI boundary", async () => {
    const fake = fakeAudioContext();
    const audio = createFixtureAudioController({
      sourceUrl: "./missing.wav",
      createContext: () => fake.context,
      fetchBytes: async () => {
        throw new Error("missing");
      }
    });

    await expect(audio.unlock()).resolves.toBe(false);
    expect(audio.getStatus()).toBe("failed");
  });
});
