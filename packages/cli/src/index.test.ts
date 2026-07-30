import { afterEach, describe, expect, it } from "vitest";
import { Buffer } from "node:buffer";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import validProject from "../../contracts/fixtures/valid/project.json";
import validDeviceAcceptance from "../../contracts/fixtures/valid/device-acceptance.json";
import { buildProject } from "@sfhs/builder";
import { packProject } from "@sfhs/packer";
import { verifyArtifactFile } from "@sfhs/verifier";
import {
  type CliReleaseBrowserRunner,
  packageIdentity,
  runCli
} from "./index";

const temporaryRoots: string[] = [];
const pixiFixtureRoot = fileURLToPath(new URL("../../../examples/pixi-minimal/", import.meta.url));
const pixiAdapterRoot = fileURLToPath(new URL("../../../adapters/pixi-v8/", import.meta.url));

async function makeTemporaryRoot(): Promise<string> {
  const projectRoot = await mkdtemp(join(tmpdir(), "sfhs-cli-"));
  temporaryRoots.push(projectRoot);
  return projectRoot;
}

async function makeTemporaryProject(manifest: unknown = validProject): Promise<string> {
  const projectRoot = await makeTemporaryRoot();
  await writeFile(join(projectRoot, "sfhs.project.json"), `${JSON.stringify(manifest)}\n`);
  return projectRoot;
}

async function copyPixiFixture(): Promise<string> {
  const projectRoot = await makeTemporaryRoot();
  await cp(pixiFixtureRoot, projectRoot, {
    recursive: true,
    filter: (source) => !["dist", "node_modules"].includes(basename(source))
  });
  const sfhsModules = join(projectRoot, "node_modules", "@sfhs");
  await mkdir(sfhsModules, { recursive: true });
  await symlink(pixiAdapterRoot, join(sfhsModules, "adapter-pixi-v8"), "junction");
  return projectRoot;
}

const fakeReleaseBrowserRunner: CliReleaseBrowserRunner = async (_bytes, _descriptor, evidenceDirectory) => {
  const screenshotDirectory = join(evidenceDirectory, "screenshots");
  const screenshotPath = join(screenshotDirectory, "desktop.png");
  await mkdir(screenshotDirectory, { recursive: true });
  await writeFile(screenshotPath, "fixture screenshot", "utf8");
  return {
    valid: true,
    browserVersion: "fixture-browser-1",
    screenshots: [{ id: "desktop-fixture", path: screenshotPath, width: 1440, height: 900 }]
  };
};

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(async (rootPath) => rm(rootPath, { force: true, recursive: true })));
});

describe("@sfhs/cli", () => {
  it("exposes its workspace boundary", () => {
    expect(packageIdentity).toBe("@sfhs/cli");
  });

  it("returns deterministic JSON for a valid project without writing to it", async () => {
    const projectRoot = await makeTemporaryProject();
    const before = await readdir(projectRoot);
    const first = await runCli(["validate", "--json"], { cwd: projectRoot });
    const second = await runCli(["validate", "--json"], { cwd: projectRoot });

    expect(first.exitCode).toBe(0);
    expect(first.stderr).toBe("");
    expect(first.stdout).toBe(second.stdout);
    expect(JSON.parse(first.stdout)).toMatchObject({
      schema: "sfhs.cli@1",
      command: "validate",
      ok: true,
      exitCode: 0,
      findings: [],
      project: { id: "pixi-minimal" }
    });
    await expect(readdir(projectRoot)).resolves.toEqual(before);
  });

  it("builds a versioned One-Shot external-agent kit without a project", async () => {
    const root = await makeTemporaryRoot();
    const output = join(root, "sfhs-one-shot-kit.json");
    const result = await runCli(["one-shot", "kit", "--json", "--output", output], {
      cwd: root,
      sourceRevision: "0123456789abcdef0123456789abcdef01234567"
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({
      schema: "sfhs.one-shot-kit@1",
      repository: { revision: "0123456789abcdef0123456789abcdef01234567" },
      sourcePack: { authorityOrder: expect.any(Array), sources: expect.any(Array) },
      files: expect.arrayContaining([
        expect.objectContaining({ path: "one-shot/START-HERE.md", sha256: expect.any(String) }),
        expect.objectContaining({ path: "one-shot/project-files/AUTHORIZED-SCOPE.template.md" }),
        expect.objectContaining({ path: "one-shot/project-files/ACCEPTANCE-CRITERIA.template.md" }),
        expect.objectContaining({ path: "one-shot/project-files/INTAKE-STATUS.template.md" }),
        expect.objectContaining({ path: "one-shot/schemas/one-shot-report.schema.json" })
      ])
    });
  });

  it("never reports success when the project contract has an error", async () => {
    const invalidProject = {
      ...validProject,
      assets: {
        ...validProject.assets,
        runtimeExternalUrls: ["https://example.test/runtime.js"]
      }
    };
    const result = await runCli(["inspect", "--json"], {
      cwd: await makeTemporaryProject(invalidProject)
    });

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      command: "inspect",
      ok: false,
      findings: [
        expect.objectContaining({
          code: "SFHS_RUNTIME_EXTERNAL_URL_FORBIDDEN",
          severity: "error",
          path: "/assets/runtimeExternalUrls"
        })
      ]
    });
  });

  it("uses a stable usage exit code and JSON envelope for invalid arguments", async () => {
    const result = await runCli(["validate", "--json", "--unexpected"]);

    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stdout)).toEqual(expect.objectContaining({
      command: "unknown",
      ok: false,
      exitCode: 2,
      findings: [
        expect.objectContaining({ code: "SFHS_CLI_ARGUMENT_INVALID", severity: "error" })
      ]
    }));
  });

  it("matches direct build, pack, and static verification package results", async () => {
    const projectRoot = await copyPixiFixture();
    const directBuild = await buildProject(projectRoot);
    const cliBuild = await runCli(["build", "--json"], { cwd: projectRoot, sourceRevision: "cli-test" });
    expect(cliBuild.exitCode).toBe(0);
    expect(cliBuild.envelope.build?.sourceSha256).toBe(directBuild.sourceSha256);

    const directPack = await packProject(projectRoot, { sourceRevision: "cli-test" });
    const cliPack = await runCli(["pack", "--json"], { cwd: projectRoot, sourceRevision: "cli-test" });
    expect(cliPack.exitCode).toBe(0);
    expect(cliPack.envelope.artifact).toMatchObject({
      bytes: directPack.descriptor.artifact.bytes,
      sha256: directPack.descriptor.artifact.sha256,
      buildId: directPack.descriptor.artifact.buildId,
      sourceSha256: directPack.descriptor.source.sha256
    });

    const directVerification = await verifyArtifactFile(projectRoot, directPack.descriptor);
    const cliVerify = await runCli(["verify", "--json"], { cwd: projectRoot, sourceRevision: "cli-test" });
    expect(directVerification.valid).toBe(true);
    expect(cliVerify.exitCode).toBe(0);
    expect(cliVerify.envelope.artifact?.sha256).toBe(directVerification.artifact.sha256);
  });

  it("reports a missing manifest and unsupported doctor runtime with stable codes", async () => {
    const missingManifest = await runCli(["inspect", "--json"], { cwd: await makeTemporaryRoot() });
    const oldRuntime = await runCli(["doctor", "--json"], {
      cwd: await makeTemporaryProject(),
      nodeVersion: "v20.0.0"
    });

    expect(JSON.parse(missingManifest.stdout).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SFHS_PROJECT_MANIFEST_NOT_FOUND", severity: "error" })
    ]));
    expect(JSON.parse(oldRuntime.stdout).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SFHS_NODE_VERSION_UNSUPPORTED", severity: "error" })
    ]));
  });

  it("executes a proportional check plan and reports stable step results", async () => {
    const projectRoot = await makeTemporaryProject();
    const executed: string[] = [];
    const result = await runCli([
      "check", "--json", "--changed", "new-runtime/widget.ts"
    ], {
      cwd: projectRoot,
      workspaceRoot: projectRoot,
      commandExecutor: async (step) => {
        executed.push(step.id);
        return { exitCode: 0 };
      }
    });

    expect(result.exitCode).toBe(0);
    expect(executed).toEqual(["lint", "typecheck", "build-pack-verify", "unit-all", "browser-smoke"]);
    expect(result.envelope.testPlan).toMatchObject({
      mode: "check",
      reviewRequired: true,
      steps: expect.arrayContaining([expect.objectContaining({ status: "passed", exitCode: 0 })])
    });
    expect(result.envelope.findings).toEqual([
      expect.objectContaining({ code: "SFHS_TEST_SELECTION_REVIEW_REQUIRED", severity: "warning" })
    ]);
  });

  it("stops a failed check plan and never reports success", async () => {
    const projectRoot = await makeTemporaryProject();
    const result = await runCli(["check", "--json"], {
      cwd: projectRoot,
      commandExecutor: async (step) => ({ exitCode: step.id === "typecheck" ? 7 : 0 })
    });

    expect(result.exitCode).toBe(1);
    expect(result.envelope.findings).toEqual([
      expect.objectContaining({ code: "SFHS_TEST_STEP_FAILED", severity: "error" })
    ]);
    expect(result.envelope.testPlan?.steps.map((step) => step.status)).toEqual([
      "passed", "failed", "skipped", "skipped"
    ]);
  });

  it("writes blocked run-contained release evidence when physical device proof is absent", async () => {
    const projectRoot = await copyPixiFixture();
    const result = await runCli([
      "release", "prepare", "--json", "--evidence", ".sfhs-evidence/blocked"
    ], {
      cwd: projectRoot,
      workspaceRoot: projectRoot,
      runId: "release-blocked-test",
      now: () => new Date("2026-07-20T22:00:00Z"),
      commandExecutor: async () => ({ exitCode: 0 }),
      releaseBrowserRunner: fakeReleaseBrowserRunner
    });

    expect(result.exitCode).toBe(1);
    expect(result.envelope.release).toMatchObject({
      status: "blocked",
      blockers: ["SFHS_RELEASE_PHYSICAL_DEVICE_REQUIRED"]
    });
    const evidencePath = result.envelope.release?.evidenceManifestPath;
    expect(evidencePath).toBeDefined();
    if (evidencePath !== undefined) {
      expect(JSON.parse(await readFile(evidencePath, "utf8"))).toMatchObject({
        run: { id: "release-blocked-test" },
        screenshots: [expect.objectContaining({ semanticReview: "pending" })],
        verdict: "blocked"
      });
    }
    await expect(readFile(join(projectRoot, "dist", "index.html"))).resolves.toBeInstanceOf(Buffer);
  });

  it("prepares but never publishes when exact physical-device evidence is supplied", async () => {
    const projectRoot = await copyPixiFixture();
    const artifact = await packProject(projectRoot, { sourceRevision: "release-test" });
    await writeFile(join(projectRoot, "device.json"), `${JSON.stringify({
      ...validDeviceAcceptance,
      artifact: {
        path: artifact.descriptor.artifact.path,
        sha256: artifact.descriptor.artifact.sha256,
        buildId: artifact.descriptor.artifact.buildId
      }
    })}\n`, "utf8");

    const result = await runCli([
      "release", "prepare", "--json",
      "--evidence", ".sfhs-evidence/prepared",
      "--device-evidence", "device.json"
    ], {
      cwd: projectRoot,
      workspaceRoot: projectRoot,
      sourceRevision: "release-test",
      runId: "release-prepared-test",
      now: () => new Date("2026-07-20T22:00:00Z"),
      commandExecutor: async () => ({ exitCode: 0 }),
      releaseBrowserRunner: fakeReleaseBrowserRunner
    });

    expect(result.exitCode).toBe(0);
    expect(result.envelope.release).toMatchObject({ status: "prepared", blockers: [] });
    expect(result.envelope.findings).toEqual([]);
    const evidencePath = result.envelope.release?.evidenceManifestPath;
    expect(evidencePath).toBeDefined();
    if (evidencePath !== undefined) {
      expect(JSON.parse(await readFile(evidencePath, "utf8"))).toMatchObject({ verdict: "pass" });
    }
  });
});
