import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "./index.ts";

const fixturePath = fileURLToPath(new URL("../../../fixtures/html-artifact/producer-neutral.html", import.meta.url));
const temporaryRoots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sfhs-html-artifact-cli-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(async (root) => rm(root, { recursive: true, force: true })));
});

describe("artifact-first CLI", () => {
  it("verifies the producer-neutral fixture without project discovery", async () => {
    const cwd = await temporaryRoot();
    const result = await runCli(["artifact", "verify", "--input", fixturePath, "--json"], { cwd });

    expect(result.exitCode).toBe(0);
    expect(result.envelope).toMatchObject({
      schema: "sfhs.cli@1",
      command: "artifact verify",
      ok: true,
      findings: [],
      htmlArtifact: {
        path: fixturePath,
        allowedRuntimeUrls: [],
        bytes: expect.any(Number),
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u)
      }
    });
    expect(result.envelope.project).toBeUndefined();
  });

  it("smokes the producer-neutral fixture and emits stable bounded JSON", async () => {
    const arguments_ = [
      "artifact", "smoke", "--input", fixturePath,
      "--ready-selector", "#artifact-ready", "--json"
    ];
    const first = await runCli(arguments_);
    const second = await runCli(arguments_);

    expect(first.exitCode).toBe(0);
    expect(first.stdout).toBe(second.stdout);
    expect(first.envelope).toMatchObject({
      command: "artifact smoke",
      ok: true,
      browser: {
        channel: "chromium",
        version: expect.any(String),
        readyState: "complete",
        readySelectorRequested: "#artifact-ready",
        readySelectorMatched: true
      }
    });
  }, 15_000);

  it("keeps verification JSON deterministic", async () => {
    const arguments_ = ["artifact", "verify", "--input", fixturePath, "--json"];
    const first = await runCli(arguments_);
    const second = await runCli(arguments_);
    expect(first.stdout).toBe(second.stdout);
  });

  it("prints a readable human verdict with path, bytes, and SHA", async () => {
    const result = await runCli(["artifact", "verify", "--input", fixturePath]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("PASS artifact verify");
    expect(result.stdout).toContain(`html-artifact: ${fixturePath}`);
    expect(result.stdout).toMatch(/html-artifact-bytes: \d+/u);
    expect(result.stdout).toMatch(/html-artifact-sha256: [a-f0-9]{64}/u);
  });

  it.each([
    ["missing input", ["artifact", "verify"]],
    ["duplicate input", ["artifact", "verify", "--input", fixturePath, "--input", fixturePath]],
    ["project-only flag", ["artifact", "verify", "--input", fixturePath, "--project", "."]],
    ["ready selector on verify", ["artifact", "verify", "--input", fixturePath, "--ready-selector", "#ready"]],
    ["artifact flag on project command", ["verify", "--input", fixturePath]]
  ])("returns exit 2 for invalid arguments: %s", async (_name, arguments_) => {
    const result = await runCli(arguments_);
    expect(result.exitCode).toBe(2);
    expect(result.envelope.findings).toEqual([
      expect.objectContaining({ code: "SFHS_CLI_ARGUMENT_INVALID" })
    ]);
  });

  it("returns exit 1 with scanner findings for an invalid artifact", async () => {
    const root = await temporaryRoot();
    const path = join(root, "invalid-html");
    await writeFile(path, '<!doctype html><script src="https://undeclared.example/app.js"></script>');

    const result = await runCli(["artifact", "verify", "--input", path, "--json"], { cwd: root });
    expect(result.exitCode).toBe(1);
    expect(result.envelope.findings).toContainEqual(expect.objectContaining({
      code: "SFHS_SCAN_EXTERNAL_REFERENCE"
    }));
  });

  it("normalizes repeated allowed URL values deterministically", async () => {
    const firstUrl = "https://a.example/runtime.js";
    const secondUrl = "https://z.example/runtime.js";
    const result = await runCli([
      "artifact", "verify", "--input", fixturePath,
      "--allow-runtime-url", secondUrl,
      "--allow-runtime-url", firstUrl,
      "--allow-runtime-url", secondUrl,
      "--json"
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.envelope.htmlArtifact?.allowedRuntimeUrls).toEqual([firstUrl, secondUrl]);
  });

  it("returns a stable finding for missing inputs and directories", async () => {
    const root = await temporaryRoot();
    for (const input of [join(root, "missing"), root]) {
      const result = await runCli(["artifact", "verify", "--input", input, "--json"], { cwd: root });
      expect(result.exitCode).toBe(1);
      expect(result.envelope.findings).toEqual([
        expect.objectContaining({ code: "SFHS_HTML_ARTIFACT_INPUT_UNREADABLE" })
      ]);
    }
  });

  it("does not require a file extension and does not create or modify files", async () => {
    const root = await temporaryRoot();
    const input = join(root, "artifact");
    await writeFile(input, "<!doctype html><title>extensionless</title>");
    const beforeEntries = await readdir(root);
    const beforeBytes = await readFile(input);
    const beforeStat = await stat(input);

    const result = await runCli(["artifact", "verify", "--input", "artifact", "--json"], { cwd: root });

    const afterEntries = await readdir(root);
    const afterBytes = await readFile(input);
    const afterStat = await stat(input);
    expect(result.exitCode).toBe(0);
    expect(afterEntries).toEqual(beforeEntries);
    expect(afterBytes).toEqual(beforeBytes);
    expect(afterStat.size).toBe(beforeStat.size);
    expect(afterStat.mtimeMs).toBe(beforeStat.mtimeMs);
  });
});
