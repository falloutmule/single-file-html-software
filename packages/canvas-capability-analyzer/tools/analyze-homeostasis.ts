import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";

import { startExactArtifactServer } from "@sfhs/browser-runner";
import { packProject } from "@sfhs/packer";
import { chromium } from "playwright";

import {
  analyzeCanvasProject,
  buildCapabilityReport,
  captureRuntimeCanvasTrace,
  installRuntimeCanvasInstrumentation
} from "../src/index.ts";

const sourceRoot = resolve(process.env.SFHS_HOMEOSTASIS_SOURCE ?? "C:/tmp/sfhs-homeostasis-013a/examples/homeostasis");
const evidenceRoot = resolve(process.env.SFHS_CANVAS_ANALYSIS_EVIDENCE ?? "docs/evidence/sfhs-012a");
const staticAnalysis = await analyzeCanvasProject(join(sourceRoot, "src"));
const packed = await packProject(sourceRoot);
const server = await startExactArtifactServer(packed.bytes);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: "block" });
const page = await context.newPage();
const sceneCoverage: Array<{ readonly scene: string; readonly coverage: "EXECUTED" | "SIMULATED" | "STATIC_ONLY" | "NOT_REACHED"; readonly note: string }> = [];
const requests: string[] = [];
page.on("request", (request) => requests.push(request.url()));
await installRuntimeCanvasInstrumentation(page);

async function mark(scene: string, coverage: "EXECUTED" | "SIMULATED", action: () => Promise<void>): Promise<void> {
  await page.evaluate((label) => (globalThis as unknown as { __SFHS_CANVAS_CAPABILITY__: { setScene(value: string): void } }).__SFHS_CANVAS_CAPABILITY__.setScene(label), scene);
  await action();
  await page.waitForTimeout(120);
  sceneCoverage.push({ scene, coverage, note: "Runtime instrumented in controlled Chromium execution." });
}

try {
  await page.goto(server.url, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean((globalThis as unknown as { __HOMEOSTASIS_TEST__?: unknown }).__HOMEOSTASIS_TEST__));
  await page.waitForTimeout(120);
  sceneCoverage.push({ scene: "title", coverage: "EXECUTED", note: "Boot and generated-texture drawing executed before the start action." });

  await mark("normal-engage", "EXECUTED", () => page.evaluate(() => (globalThis as unknown as { __HOMEOSTASIS_TEST__: { start(seed: string): void; stepFrames(count: number): void } }).__HOMEOSTASIS_TEST__.start("CANVAS-ANALYSIS")));
  await mark("bacterial-cluster", "SIMULATED", () => page.evaluate(() => { const test = (globalThis as unknown as { __HOMEOSTASIS_TEST__: { spawnBacteria(count: number): void; stepFrames(count: number): void } }).__HOMEOSTASIS_TEST__; test.spawnBacteria(32); test.stepFrames(30); }));
  await mark("storm-engage", "SIMULATED", () => page.evaluate(() => { const test = (globalThis as unknown as { __HOMEOSTASIS_TEST__: { setInflammation(value: number): void; stepFrames(count: number): void } }).__HOMEOSTASIS_TEST__; test.setInflammation(0.97); test.stepFrames(60); }));
  await mark("resolve-activation", "SIMULATED", () => page.evaluate(() => { const test = (globalThis as unknown as { __HOMEOSTASIS_TEST__: { toggleMode(): void; stepFrames(count: number): void } }).__HOMEOSTASIS_TEST__; test.toggleMode(); test.stepFrames(6); }));
  await mark("damaged-tissue", "SIMULATED", () => page.evaluate(() => { const test = (globalThis as unknown as { __HOMEOSTASIS_TEST__: { damageTissue(): void; stepFrames(count: number): void } }).__HOMEOSTASIS_TEST__; test.damageTissue(); test.stepFrames(3); }));
  await mark("resolve-stabilization", "SIMULATED", () => page.evaluate(() => (globalThis as unknown as { __HOMEOSTASIS_TEST__: { stepFrames(count: number): void } }).__HOMEOSTASIS_TEST__.stepFrames(90)));
  await mark("repairing-tissue", "SIMULATED", () => page.evaluate(() => (globalThis as unknown as { __HOMEOSTASIS_TEST__: { stepFrames(count: number): void } }).__HOMEOSTASIS_TEST__.stepFrames(90)));
  await mark("biofilm-nidus", "SIMULATED", async () => { await page.keyboard.down("KeyD"); await page.evaluate(() => (globalThis as unknown as { __HOMEOSTASIS_TEST__: { stepFrames(count: number): void } }).__HOMEOSTASIS_TEST__.stepFrames(330)); await page.keyboard.up("KeyD"); });
  await mark("upgrade-selection", "SIMULATED", () => page.evaluate(() => (globalThis as unknown as { __HOMEOSTASIS_TEST__: { grantXp(amount: number): void } }).__HOMEOSTASIS_TEST__.grantXp(999)));
  await mark("pause", "EXECUTED", () => page.keyboard.press("Escape"));
  await mark("victory-result", "SIMULATED", () => page.evaluate(() => { const test = (globalThis as unknown as { __HOMEOSTASIS_TEST__: { start(seed: string): void; forceVictoryWindow(): void; stepFrames(count: number): void } }).__HOMEOSTASIS_TEST__; test.start("VICTORY"); test.forceVictoryWindow(); test.stepFrames(12); }));
  await mark("failure-result", "SIMULATED", () => page.evaluate(() => { const test = (globalThis as unknown as { __HOMEOSTASIS_TEST__: { start(seed: string): void; damageTissue(x: number, y: number, radius: number, amount: number, source: string): void; stepFrames(count: number): void } }).__HOMEOSTASIS_TEST__; test.start("FAILURE"); test.damageTissue(900, 600, 2200, 5000, "analysis"); test.stepFrames(12); }));
} finally {
  const trace = await captureRuntimeCanvasTrace(page);
  const diagnosticOnlyOperations = new Set(["getImageData"]);
  const capabilities = buildCapabilityReport(staticAnalysis, trace, { nonProductionOperations: diagnosticOnlyOperations });
  const allScenes = ["title", "normal-engage", "storm-engage", "resolve-activation", "resolve-stabilization", "damaged-tissue", "repairing-tissue", "bacterial-cluster", "biofilm-nidus", "upgrade-selection", "pause", "victory-result", "failure-result"];
  for (const scene of allScenes) if (!sceneCoverage.some((entry) => entry.scene === scene)) sceneCoverage.push({ scene, coverage: "NOT_REACHED", note: "Scenario did not complete in the controlled run." });
  const highestFrequency = [...capabilities.operations].filter((operation) => operation.runtime.totalCalls > 0).sort((left, right) => right.runtime.totalCalls - left.runtime.totalCalls).slice(0, 20).map((operation) => ({ operation: operation.operation, totalCalls: operation.runtime.totalCalls, maximumCallsPerFrame: operation.runtime.maximumCallsPerFrame }));
  const areaRecommendations = [
    ["background and grid", "native Pixi preferred", "Per-frame gradient, grid paths, and full-surface fill."],
    ["tissue", "native Pixi preferred", "Generated texture drawImage plus dynamic rings."],
    ["player", "native Pixi preferred", "Dynamic paths, gradients, Resolve field, and attack effects."],
    ["bacteria", "native Pixi preferred", "Generated texture drawImage with transform state."],
    ["boss", "native Pixi preferred", "High-complexity paths, gradients, text, and health indicators."],
    ["immune effectors", "compatibility suitable", "Arcs, ellipses, lines, fills, and strokes only."],
    ["projectiles", "compatibility suitable", "Line/path primitives and transformed marks."],
    ["particles", "native Pixi preferred", "High-frequency pooled circles and rings."],
    ["Resolve field", "native Pixi preferred", "Radial gradient with animated geometry."],
    ["storm overlay", "compatibility suitable", "Radial or solid overlay fill."],
    ["camera trauma/shake", "native Pixi required", "Presentation transform must be separate from simulation state."],
    ["world indicators", "compatibility suitable", "Stroke arcs and simple fills."],
    ["HUD", "native Pixi preferred", "DOM HUD is outside Canvas; Canvas text is limited to world labels."],
    ["upgrade screen", "native Pixi preferred", "DOM overlay; no Canvas conversion requirement observed."],
    ["pause screen", "native Pixi preferred", "DOM overlay; no Canvas conversion requirement observed."],
    ["result screen", "native Pixi preferred", "DOM overlay; no Canvas conversion requirement observed."]
  ].map(([area, recommendation, reason]) => ({ area, recommendation, reason }));
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(join(evidenceRoot, "analyzer.json"), `${JSON.stringify({ schema: "sfhs.canvas-analyzer-evidence@1", task: "SFHS-012A", sourceRoot, staticAnalysis, artifact: { bytes: packed.bytes.byteLength, buildId: packed.descriptor.artifact.buildId, sourceSha256: packed.descriptor.source.sha256 }, diagnosticOnlyOperations: [{ operation: "getImageData", source: "src/renderer.ts:readCenterPixel", reason: "Existing test façade/render proof diagnostic; excluded from production-presentation capability verdict but retained in the raw trace." }], requests }, null, 2)}\n`);
  await writeFile(join(evidenceRoot, "runtime-trace-summary.json"), `${JSON.stringify({ ...trace, highestFrequency, requests }, null, 2)}\n`);
  await writeFile(join(evidenceRoot, "scene-coverage.json"), `${JSON.stringify({ schema: "sfhs.canvas-scene-coverage@1", scenes: sceneCoverage.sort((left, right) => left.scene.localeCompare(right.scene)) }, null, 2)}\n`);
  await writeFile(join(evidenceRoot, "homeostasis-capabilities.json"), `${JSON.stringify({ ...capabilities, highestFrequency, areaRecommendations }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ verdict: capabilities.verdict, highestFrequency, scenes: sceneCoverage, requests }, null, 2)}\n`);
  if (capabilities.verdict !== "ANALYSIS_PASS") process.exitCode = 1;
  await page.close(); await context.close(); await browser.close(); await server.close();
}
