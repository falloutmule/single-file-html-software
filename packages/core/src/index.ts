import { createHash } from "node:crypto";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, posix, relative, resolve, sep, win32 } from "node:path";

export const packageIdentity = "@sfhs/core" as const;

export type CoreErrorCode =
  | "SFHS_PATH_ESCAPES_PROJECT_ROOT"
  | "SFHS_PATH_INVALID"
  | "SFHS_PATH_PROJECT_ROOT_INVALID"
  | "SFHS_PATH_SYMLINK_ESCAPE"
  | "SFHS_PROJECT_MANIFEST_NOT_FOUND"
  | "SFHS_PROJECT_START_INVALID";

export class SfhsCoreError extends Error {
  readonly code: CoreErrorCode;

  constructor(code: CoreErrorCode, message: string) {
    super(message);
    this.name = "SfhsCoreError";
    this.code = code;
  }
}

export interface DiscoveredProject {
  readonly projectRoot: string;
  readonly manifestPath: string;
}

function isMissingPathError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR");
}

function isPathInside(rootPath: string, candidatePath: string): boolean {
  const pathFromRoot = relative(rootPath, candidatePath);
  return pathFromRoot === "" ||
    (pathFromRoot !== ".." && !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot));
}

async function getRealDirectory(pathValue: string, code: CoreErrorCode, message: string): Promise<string> {
  let realPath: string;

  try {
    realPath = await realpath(pathValue);
  } catch {
    throw new SfhsCoreError(code, message);
  }

  if (!(await stat(realPath)).isDirectory()) {
    throw new SfhsCoreError(code, message);
  }

  return realPath;
}

async function getRealStartDirectory(startPath: string): Promise<string> {
  if (startPath.length === 0) {
    throw new SfhsCoreError("SFHS_PROJECT_START_INVALID", "Project discovery requires an existing start path.");
  }

  let resolvedStartPath: string;
  try {
    resolvedStartPath = await realpath(resolve(startPath));
  } catch {
    throw new SfhsCoreError("SFHS_PROJECT_START_INVALID", "Project discovery requires an existing start path.");
  }

  return (await stat(resolvedStartPath)).isDirectory() ? resolvedStartPath : dirname(resolvedStartPath);
}

function normalizedProjectRelativePath(pathValue: string): string {
  const normalized = pathValue.replaceAll("\\", "/");

  if (
    normalized.length === 0 ||
    normalized.includes("\0") ||
    posix.isAbsolute(normalized) ||
    win32.isAbsolute(normalized)
  ) {
    throw new SfhsCoreError("SFHS_PATH_INVALID", "Path must be a non-empty project-relative path.");
  }

  if (normalized.split("/").some((segment) => segment === "..")) {
    throw new SfhsCoreError("SFHS_PATH_ESCAPES_PROJECT_ROOT", "Path traversal outside the project root is forbidden.");
  }

  return normalized;
}

async function realpathOfNearestExistingAncestor(candidatePath: string): Promise<string> {
  let currentPath = candidatePath;

  while (true) {
    try {
      return await realpath(currentPath);
    } catch (error) {
      if (!isMissingPathError(error)) {
        throw error;
      }
    }

    try {
      if ((await lstat(currentPath)).isSymbolicLink()) {
        throw new SfhsCoreError(
          "SFHS_PATH_SYMLINK_ESCAPE",
          "A broken symbolic link cannot be accepted as a project-contained path."
        );
      }
    } catch (error) {
      if (error instanceof SfhsCoreError) {
        throw error;
      }

      if (!isMissingPathError(error)) {
        throw error;
      }
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      throw new SfhsCoreError(
        "SFHS_PATH_PROJECT_ROOT_INVALID",
        "Unable to resolve an existing ancestor inside the project root."
      );
    }

    currentPath = parentPath;
  }
}

export async function discoverProject(startPath: string): Promise<DiscoveredProject> {
  let currentDirectory = await getRealStartDirectory(startPath);

  while (true) {
    const manifestCandidate = join(currentDirectory, "sfhs.project.json");

    try {
      if ((await stat(manifestCandidate)).isFile()) {
        const manifestPath = await realpath(manifestCandidate);
        if (!isPathInside(currentDirectory, manifestPath)) {
          throw new SfhsCoreError(
            "SFHS_PATH_SYMLINK_ESCAPE",
            "The project manifest must not resolve outside its discovered project root."
          );
        }

        return { projectRoot: currentDirectory, manifestPath };
      }
    } catch (error) {
      if (error instanceof SfhsCoreError) {
        throw error;
      }

      if (!isMissingPathError(error)) {
        throw error;
      }
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      throw new SfhsCoreError(
        "SFHS_PROJECT_MANIFEST_NOT_FOUND",
        "No sfhs.project.json was found between the start path and the filesystem root."
      );
    }

    currentDirectory = parentDirectory;
  }
}

export async function resolveProjectPath(projectRoot: string, projectRelativePath: string): Promise<string> {
  const realProjectRoot = await getRealDirectory(
    projectRoot,
    "SFHS_PATH_PROJECT_ROOT_INVALID",
    "Project root must be an existing directory."
  );
  const normalizedRelativePath = normalizedProjectRelativePath(projectRelativePath);
  const candidatePath = resolve(realProjectRoot, normalizedRelativePath);

  if (!isPathInside(realProjectRoot, candidatePath)) {
    throw new SfhsCoreError("SFHS_PATH_ESCAPES_PROJECT_ROOT", "Path escapes the project root.");
  }

  const realAncestorPath = await realpathOfNearestExistingAncestor(candidatePath);
  if (!isPathInside(realProjectRoot, realAncestorPath)) {
    throw new SfhsCoreError(
      "SFHS_PATH_SYMLINK_ESCAPE",
      "Path resolves through a symbolic link outside the project root."
    );
  }

  return candidatePath;
}

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function sha256File(filePath: string): Promise<string> {
  return sha256Bytes(await readFile(filePath));
}
