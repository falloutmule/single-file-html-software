import addUrl from "./assets/add.wasm";
import multiplyUrl from "./assets/multiply.wasm";

interface BinaryExports { readonly run: (left: number, right: number) => number; }
interface Snapshot { readonly schema: "sfhs.runtime@1"; readonly phase: "ready" | "running" | "failed"; readonly ticks: number; readonly add: number | null; readonly multiply: number | null; }

const shell = document.querySelector<HTMLElement>("#fixture-shell")!;
const start = document.querySelector<HTMLButtonElement>("#fixture-start")!;
const output = document.querySelector<HTMLOutputElement>("#fixture-result")!;
let snapshot: Snapshot = Object.freeze({ schema: "sfhs.runtime@1", phase: "ready", ticks: 0, add: null, multiply: null });

async function instantiate(url: string): Promise<BinaryExports> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load embedded WASM: ${response.status}`);
  const result = await WebAssembly.instantiate(await response.arrayBuffer());
  return result.instance.exports as unknown as BinaryExports;
}

async function run(): Promise<void> {
  start.disabled = true;
  try {
    const [add, multiply] = await Promise.all([instantiate(addUrl), instantiate(multiplyUrl)]);
    snapshot = Object.freeze({ schema: "sfhs.runtime@1", phase: "running", ticks: 5, add: add.run(20, 22), multiply: multiply.run(6, 7) });
    shell.dataset.phase = "running";
    output.value = `${snapshot.add} / ${snapshot.multiply}`;
  } catch (error) {
    snapshot = Object.freeze({ ...snapshot, phase: "failed" });
    shell.dataset.phase = "failed";
    output.value = error instanceof Error ? error.message : "WASM failed";
  }
}

Object.defineProperty(window, "CR", { configurable: true, value: Object.freeze({
  schema: "sfhs.cr@1",
  getSnapshot: () => snapshot,
  async runFullSelfCheck() { const checks = Object.freeze([{ name: "neutral-add", pass: snapshot.add === 42 }, { name: "neutral-multiply", pass: snapshot.multiply === 42 }]); return Object.freeze({ pass: checks.every((check) => check.pass), checks, snapshot }); }
}) });

start.addEventListener("click", () => { void run(); });
