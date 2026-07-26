import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const templateRoot = join(
  repositoryRoot,
  "plugins",
  "hermes",
  "skills",
  "sfhs-orchestrator",
  "templates"
);

function fail(message) {
  process.stderr.write(`SFHS_HERMES_TASK_INVALID: ${message}\n`);
  process.exit(1);
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      fail("Arguments must be --name value pairs.");
    }
    values.set(key.slice(2), value);
  }
  return values;
}

const values = parseArguments(process.argv.slice(2));
const role = values.get("role");
const taskId = values.get("task-id");
const root = values.get("root");
const base = values.get("base");
const baseCommit = values.get("base-commit");
const runId = values.get("run-id");
const output = values.get("out");
const pnpmEntry = process.env.npm_execpath;

if (role !== "builder" && role !== "checker") fail("--role must be builder or checker.");
if (!taskId || !/^[A-Z0-9][A-Z0-9_-]{2,95}$/u.test(taskId)) fail("--task-id is invalid.");
if (!root || !isAbsolute(root)) fail("--root must be absolute.");
if (!base || base.length > 128) fail("--base is invalid.");
if (!baseCommit || !/^[0-9a-f]{40}$/u.test(baseCommit)) fail("--base-commit must be a full lowercase SHA-1.");
if (!runId || !/^[a-z0-9][a-z0-9-]{2,63}$/u.test(runId)) fail("--run-id is invalid.");
if (!output) fail("--out is required.");
if (!pnpmEntry || !isAbsolute(pnpmEntry)) fail("Run this materializer through pnpm so the exact pnpm entrypoint is known.");

const replacements = new Map([
  ["${TASK_ID}", taskId],
  ["${ABSOLUTE_REPOSITORY_ROOT}", resolve(root).replaceAll("\\", "/")],
  ["${BASE_BRANCH}", base],
  ["${BASE_COMMIT}", baseCommit],
  ["${RUN_ID}", runId],
  ["${NODE_EXECUTABLE}", process.execPath.replaceAll("\\", "/")],
  ["${PNPM_ENTRY}", resolve(pnpmEntry).replaceAll("\\", "/")]
]);

let serialized = await readFile(join(templateRoot, `${role}.task.json`), "utf8");
for (const [placeholder, value] of replacements) {
  serialized = serialized.replaceAll(placeholder, value);
}
if (/\$\{[A-Z0-9_]+\}/u.test(serialized)) fail("Task packet contains an unresolved placeholder.");

const packet = JSON.parse(serialized);
if (packet.role !== role || packet.repository.baseCommit !== baseCommit) {
  fail("Resolved task packet does not match requested identity.");
}
if (role === "checker" && (packet.scope.allowedFiles.length !== 0 || packet.commands.some((command) => command.mutation !== "read-only"))) {
  fail("Resolved checker task is not read-only.");
}

const outputPath = resolve(output);
await mkdir(dirname(outputPath), { recursive: true });
const temporaryPath = `${outputPath}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(packet, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
await rename(temporaryPath, outputPath);
process.stdout.write(`${outputPath}\n`);
