import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

import { buildProject } from "@sfhs/builder";
import { packIntermediate } from "@sfhs/packer";

import { runPixiArtifactScenarios } from "../src/pixi-scenarios.ts";

const projectRoot = resolve(process.cwd(), "examples", "pixi-minimal");
const evidenceDirectory = resolve(
  process.cwd(),
  process.env.SFHS_BROWSER_EVIDENCE ?? ".sfhs-browser/scenarios"
);
const artifact = packIntermediate(await buildProject(projectRoot), {
  sourceRevision: process.env.GITHUB_SHA ?? "local"
});
const report = await runPixiArtifactScenarios(artifact.bytes, artifact.descriptor, {
  browserChannel: process.env.SFHS_BROWSER_CHANNEL === "chrome" ? "chrome" : "chromium",
  evidenceDirectory
});
const reportPath = resolve(evidenceDirectory, "report.json");
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.valid) {
  process.exitCode = 1;
}
