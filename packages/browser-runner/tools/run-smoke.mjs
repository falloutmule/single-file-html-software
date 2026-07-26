import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

import { buildProject } from "@sfhs/builder";
import { packIntermediate } from "@sfhs/packer";

import { runExactArtifactBrowserSmoke } from "../src/index.ts";

const projectRoot = resolve(process.cwd(), "examples", "pixi-minimal");
const artifact = packIntermediate(await buildProject(projectRoot), {
  sourceRevision: process.env.GITHUB_SHA ?? "local"
});
const report = await runExactArtifactBrowserSmoke(artifact.bytes, artifact.descriptor, {
  browserChannel: process.env.SFHS_BROWSER_CHANNEL === "chrome" ? "chrome" : "chromium",
  ...(process.env.SFHS_BROWSER_SCREENSHOT === undefined
    ? {}
    : { screenshotPath: resolve(process.cwd(), process.env.SFHS_BROWSER_SCREENSHOT) })
});
const reportText = `${JSON.stringify(report, null, 2)}\n`;
if (process.env.SFHS_BROWSER_REPORT !== undefined) {
  const reportPath = resolve(process.cwd(), process.env.SFHS_BROWSER_REPORT);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, reportText, "utf8");
}
process.stdout.write(reportText);
if (!report.valid) {
  process.exitCode = 1;
}
