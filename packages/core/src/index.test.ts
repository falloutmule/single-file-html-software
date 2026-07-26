import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  discoverProject,
  packageIdentity,
  resolveProjectPath,
  sha256Bytes,
  sha256File
} from "./index";

const temporaryRoots: string[] = [];

async function makeTemporaryRoot(): Promise<string> {
  const rootPath = await mkdtemp(join(tmpdir(), "sfhs-core-"));
  temporaryRoots.push(rootPath);
  return rootPath;
}

async function writeProjectManifest(projectRoot: string): Promise<void> {
  await writeFile(join(projectRoot, "sfhs.project.json"), "{\"schema\":\"sfhs.project@1\"}\n");
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(async (rootPath) => rm(rootPath, { force: true, recursive: true })));
});

describe("@sfhs/core", () => {
  it("exposes its workspace boundary", () => {
    expect(packageIdentity).toBe("@sfhs/core");
  });

  it("discovers the nearest project manifest from an authored source file", async () => {
    const sandboxRoot = await makeTemporaryRoot();
    const outerProject = join(sandboxRoot, "outer-project");
    const innerProject = join(outerProject, "example");
    const sourceFile = join(innerProject, "src", "main.ts");
    await mkdir(join(innerProject, "src"), { recursive: true });
    await writeProjectManifest(outerProject);
    await writeProjectManifest(innerProject);
    await writeFile(sourceFile, "export {};\n");

    await expect(discoverProject(sourceFile)).resolves.toEqual({
      projectRoot: await realpath(innerProject),
      manifestPath: await realpath(join(innerProject, "sfhs.project.json"))
    });
  });

  it("reports a stable code when project discovery reaches the filesystem root", async () => {
    await expect(discoverProject(await makeTemporaryRoot())).rejects.toMatchObject({
      code: "SFHS_PROJECT_MANIFEST_NOT_FOUND"
    });
  });

  it("resolves safe project-relative paths and rejects lexical escapes", async () => {
    const projectRoot = await makeTemporaryRoot();
    const expectedPath = join(await realpath(projectRoot), "src", "main.ts");

    await expect(resolveProjectPath(projectRoot, "src\\main.ts")).resolves.toBe(expectedPath);
    await expect(resolveProjectPath(projectRoot, "../outside.txt")).rejects.toMatchObject({
      code: "SFHS_PATH_ESCAPES_PROJECT_ROOT"
    });
    await expect(resolveProjectPath(projectRoot, join(projectRoot, "outside.txt"))).rejects.toMatchObject({
      code: "SFHS_PATH_INVALID"
    });
  });

  it("rejects paths whose existing symbolic-link ancestor resolves outside the project", async () => {
    const sandboxRoot = await makeTemporaryRoot();
    const projectRoot = join(sandboxRoot, "project");
    const outsideRoot = join(sandboxRoot, "outside");
    const linkPath = join(projectRoot, "linked");
    await mkdir(projectRoot);
    await mkdir(outsideRoot);
    await symlink(outsideRoot, linkPath, process.platform === "win32" ? "junction" : "dir");

    await expect(resolveProjectPath(projectRoot, "linked/secret.txt")).rejects.toMatchObject({
      code: "SFHS_PATH_SYMLINK_ESCAPE"
    });
  });

  it("hashes raw bytes and file bytes identically", async () => {
    const bytes = Uint8Array.from([0, 255, 13, 10, 65]);
    const expectedHash = "4259d3f5151edfc7205e3e7c3fde341e237968666aad8946dcbcf6a374502c60";
    const sandboxRoot = await makeTemporaryRoot();
    const filePath = join(sandboxRoot, "binary.dat");
    await writeFile(filePath, bytes);

    expect(sha256Bytes(bytes)).toBe(expectedHash);
    await expect(sha256File(filePath)).resolves.toBe(expectedHash);
  });
});
