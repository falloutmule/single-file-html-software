import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const oneShot = join(root, "one-shot");
const required = [
  "START-HERE.md", "AGENTS.md", "README.md", "DECISIONS.md", "ISSUES-ENCOUNTERED.md",
  "instructions/authority-and-boundaries.md", "instructions/execution-workflow.md", "instructions/pixi-game-authoring.md",
  "instructions/mobile-touch-first.md", "instructions/visual-acceptance.md", "instructions/issue-tracking.md",
  "instructions/verification-and-recovery.md", "instructions/lane-routing.md",
  "prompts/discuss-game.md", "prompts/create-one-shot.md", "prompts/continue-interrupted-run.md",
  "prompts/repair-player-visible-problem.md", "prompts/intake-existing-project.md", "prompts/verify-project.md",
  "project-files/ONE-SHOT-BRIEF.template.md", "project-files/AUTHORIZED-SCOPE.template.md",
  "project-files/DECISIONS.template.md", "project-files/ISSUES-ENCOUNTERED.template.md",
  "project-files/ACCEPTANCE-CRITERIA.template.md", "project-files/INTAKE-STATUS.template.md",
  "project-files/VERIFICATION-REPORT.template.md", "examples/cat-air-hockey-case-study/README.md"
];
const evaluations = ["discussion-boundary", "controls-first", "physics-game", "mobile-layout", "visual-repair", "candidate-vs-canonical", "interrupted-run-recovery", "existing-game-intake"];
function invariant(value, message) { if (!value) throw new Error(`SFHS_ONE_SHOT_INVALID: ${message}`); }
for (const relative of required) await stat(join(oneShot, relative));
const manifest = JSON.parse(await readFile(join(oneShot, "source-pack-manifest.json"), "utf8"));
invariant(manifest.schema === "sfhs.one-shot-source-pack@1", "source-pack schema is invalid.");
invariant(Array.isArray(manifest.authorityOrder) && manifest.authorityOrder.length === 7, "authority precedence must be explicit.");
invariant(Array.isArray(manifest.sources) && manifest.sources.length > 0, "source pack must have sources.");
const paths = new Set();
for (const [index, entry] of manifest.sources.entries()) {
  invariant(entry.priority === index + 1, "source priorities must be contiguous.");
  invariant(typeof entry.path === "string" && !entry.path.includes("..") && !paths.has(entry.path), "source paths must be unique and contained.");
  paths.add(entry.path); await stat(join(root, entry.path));
}
for (const name of evaluations) {
  const fixture = JSON.parse(await readFile(join(oneShot, "evaluations", name, "assertions.json"), "utf8"));
  invariant(fixture.scenario === name && Array.isArray(fixture.expect) && Array.isArray(fixture.forbid), `evaluation ${name} is incomplete.`);
}
for (const name of ["one-shot-brief", "issue-log", "decision-log", "one-shot-report"]) {
  const schema = JSON.parse(await readFile(join(oneShot, "schemas", `${name}.schema.json`), "utf8"));
  invariant(schema.$schema?.includes("2020-12") && typeof schema.$id === "string", `schema ${name} is invalid.`);
}
process.stdout.write("SFHS One-Shot source validation passed.\n");
