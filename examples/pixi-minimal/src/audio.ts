export type FixtureAudioStatus = "locked" | "unlocking" | "ready" | "failed" | "disposed";

export interface FixtureAudioBufferSource {
  buffer: AudioBuffer | null;
  connect(destination: unknown): unknown;
  start(): void;
}

export interface FixtureAudioContext {
  readonly state: string;
  readonly destination: unknown;
  resume(): Promise<void>;
  decodeAudioData(bytes: ArrayBuffer): Promise<AudioBuffer>;
  createBufferSource(): FixtureAudioBufferSource;
  close(): Promise<void>;
}

export interface FixtureAudioController {
  unlock(): Promise<boolean>;
  getStatus(): FixtureAudioStatus;
  dispose(): Promise<void>;
}

export interface FixtureAudioControllerOptions {
  readonly sourceUrl: string;
  readonly createContext?: () => FixtureAudioContext;
  readonly fetchBytes?: (sourceUrl: string) => Promise<ArrayBuffer>;
}

async function defaultFetchBytes(sourceUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Unable to load the fixture audio asset (${response.status}).`);
  }
  return response.arrayBuffer();
}

function defaultCreateContext(): FixtureAudioContext {
  return new AudioContext() as unknown as FixtureAudioContext;
}

export function createFixtureAudioController(
  options: FixtureAudioControllerOptions
): FixtureAudioController {
  const createContext = options.createContext ?? defaultCreateContext;
  const fetchBytes = options.fetchBytes ?? defaultFetchBytes;
  let status: FixtureAudioStatus = "locked";
  let context: FixtureAudioContext | undefined;
  let buffer: AudioBuffer | undefined;
  let pendingUnlock: Promise<boolean> | undefined;

  function play(): void {
    if (context === undefined || buffer === undefined) {
      return;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start();
  }

  async function performUnlock(): Promise<boolean> {
    if (status === "disposed") {
      return false;
    }

    status = "unlocking";
    try {
      context ??= createContext();
      if (context.state === "suspended") {
        await context.resume();
      }
      buffer ??= await context.decodeAudioData(await fetchBytes(options.sourceUrl));
      status = "ready";
      play();
      return true;
    } catch {
      status = "failed";
      return false;
    } finally {
      pendingUnlock = undefined;
    }
  }

  return {
    unlock(): Promise<boolean> {
      if (status === "ready") {
        play();
        return Promise.resolve(true);
      }
      pendingUnlock ??= performUnlock();
      return pendingUnlock;
    },
    getStatus: () => status,
    async dispose(): Promise<void> {
      if (status === "disposed") {
        return;
      }
      status = "disposed";
      if (context !== undefined && context.state !== "closed") {
        await context.close();
      }
    }
  };
}
