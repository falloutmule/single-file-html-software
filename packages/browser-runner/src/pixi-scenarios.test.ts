import { fileURLToPath } from "node:url";

import { buildProject } from "@sfhs/builder";
import { packIntermediate } from "@sfhs/packer";
import { describe, expect, it } from "vitest";

import {
  runPixiArtifactScenarios,
  samsungGalaxyS21UltraProfiles
} from "./pixi-scenarios.ts";

const fixtureRoot = fileURLToPath(new URL("../../../examples/pixi-minimal/", import.meta.url));

describe("Pixi exact-artifact browser scenarios", () => {
  it("defines supporting Samsung Galaxy S21 Ultra profiles without claiming physical-device identity", () => {
    expect(samsungGalaxyS21UltraProfiles).toEqual({
      portrait: {
        id: "samsung-galaxy-s21-ultra-portrait-emulation",
        width: 384,
        height: 854,
        deviceScaleFactor: 3.75,
        isMobile: true,
        hasTouch: true
      },
      landscape: {
        id: "samsung-galaxy-s21-ultra-landscape-emulation",
        width: 854,
        height: 384,
        deviceScaleFactor: 3.75,
        isMobile: true,
        hasTouch: true
      }
    });
  });

  it.skipIf(process.env.SFHS_RUN_BROWSER_TESTS !== "1")(
    "passes the complete Pixi scenario matrix against exact bytes",
    async () => {
      const artifact = packIntermediate(await buildProject(fixtureRoot));
      const report = await runPixiArtifactScenarios(artifact.bytes, artifact.descriptor, {
        browserChannel: process.env.SFHS_BROWSER_CHANNEL === "chrome" ? "chrome" : "chromium",
        evidenceDirectory: ".sfhs-browser/test-scenarios"
      });

      expect(report.valid, JSON.stringify({
        scenarios: report.scenarios,
        requests: report.unexpectedRequests,
        errors: report.pageErrors,
        smoke: report.smoke.findings
      })).toBe(true);
      expect(report.scenarios).toHaveLength(9);
      expect(report.screenshots).toHaveLength(3);
    },
    60_000
  );
});
