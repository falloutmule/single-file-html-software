namespace SkylineDrop {
  export interface AudioController {
    unlock(): Promise<void>;
    play(kind: "place" | "error" | "toggle" | "win" | "click"): void;
    dispose(): void;
  }

  export function createAudioController(): AudioController {
    let context: AudioContext | null = null;
    let master: GainNode | null = null;

    const unlock = async (): Promise<void> => {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = 0.14;
        master.connect(context.destination);
      }
      if (context.state === "suspended") await context.resume();
    };

    const play = (kind: "place" | "error" | "toggle" | "win" | "click"): void => {
      if (!context || !master || context.state !== "running") return;
      const now = context.currentTime;
      const notes: Readonly<Record<typeof kind, readonly number[]>> = {
        place: [120, 76],
        error: [155, 110],
        toggle: [330],
        win: [392, 523, 659],
        click: [260]
      };
      const frequencies = notes[kind];
      frequencies.forEach((frequency, index) => {
        if (!context || !master) return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = now + index * 0.07;
        const duration = kind === "win" ? 0.18 : 0.08;
        oscillator.type = kind === "place" ? "triangle" : "square";
        oscillator.frequency.setValueAtTime(frequency, start);
        if (kind === "place") oscillator.frequency.exponentialRampToValueAtTime(Math.max(50, frequency * 0.62), start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.8, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
        oscillator.addEventListener("ended", () => { oscillator.disconnect(); gain.disconnect(); }, { once: true });
      });
    };

    return Object.freeze({
      unlock,
      play,
      dispose(): void { if (context) void context.close(); context = null; master = null; }
    });
  }
}
