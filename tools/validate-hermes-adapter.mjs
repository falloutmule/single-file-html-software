import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const skillRoot = join(repositoryRoot, "plugins", "hermes", "skills", "sfhs-orchestrator");
const schemaPath = join(skillRoot, "schemas", "sfhs.hermes-task.schema.json");
const templates = ["builder.task.json", "checker.task.json"];

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`SFHS_HERMES_ADAPTER_INVALID: ${message}`);
  }
}

function unresolvedPlaceholders(value) {
  return JSON.stringify(value).match(/\$\{[A-Z0-9_]+\}/gu) ?? [];
}

function validateTemplate(packet, fileName) {
  invariant(packet.schemaVersion === "sfhs.hermes-task@1", `${fileName} has an invalid schema version.`);
  invariant(["builder", "checker"].includes(packet.role), `${fileName} has an invalid role.`);
  invariant(typeof packet.taskId === "string" && packet.taskId.length > 0, `${fileName} has no task ID.`);
  invariant(typeof packet.repository?.root === "string", `${fileName} has no exact root field.`);
  invariant(typeof packet.repository?.base === "string", `${fileName} has no base field.`);
  invariant(typeof packet.repository?.baseCommit === "string", `${fileName} has no base commit field.`);
  invariant(Array.isArray(packet.scope?.allowedFiles), `${fileName} has no allowed-files list.`);
  invariant(Array.isArray(packet.scope?.forbiddenFiles) && packet.scope.forbiddenFiles.length > 0, `${fileName} has no forbidden-files list.`);
  invariant(Array.isArray(packet.commands) && packet.commands.length > 0, `${fileName} has no commands.`);
  invariant(Array.isArray(packet.evidence?.requiredFiles) && packet.evidence.requiredFiles.length > 0, `${fileName} has no evidence contract.`);
  invariant(Array.isArray(packet.acceptanceCriteria) && packet.acceptanceCriteria.length > 0, `${fileName} has no acceptance criteria.`);
  invariant(Array.isArray(packet.stopConditions) && packet.stopConditions.length > 0, `${fileName} has no stop conditions.`);
  invariant(typeof packet.nextAction === "string" && packet.nextAction.length > 0, `${fileName} must have exactly one next action.`);

  for (const command of packet.commands) {
    invariant(Array.isArray(command.argv) && command.argv.length > 0, `${fileName} command argv is invalid.`);
    invariant(!command.argv.some((argument) => /[;&|<>]/u.test(argument)), `${fileName} command contains shell composition.`);
    invariant(["read-only", "generated-output"].includes(command.mutation), `${fileName} command mutation is invalid.`);
  }

  if (packet.role === "checker") {
    invariant(packet.scope.allowedFiles.length === 0, "checker write allowlist must be empty.");
    invariant(packet.commands.every((command) => command.mutation === "read-only"), "checker commands must be read-only.");
  }

  const placeholders = new Set(unresolvedPlaceholders(packet));
  for (const required of ["${TASK_ID}", "${ABSOLUTE_REPOSITORY_ROOT}", "${BASE_BRANCH}", "${BASE_COMMIT}", "${RUN_ID}", "${NODE_EXECUTABLE}", "${PNPM_ENTRY}"]) {
    invariant(placeholders.has(required), `${fileName} is missing required placeholder ${required}.`);
  }
}

const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
invariant(skill.startsWith("---\nname: sfhs-orchestrator\n"), "skill frontmatter name is invalid.");
invariant(skill.includes("pnpm sfhs"), "skill must call the shared SFHS CLI.");
invariant(!/(?:packProject|verifyArtifactBytes|runPixiArtifactScenarios)\s*\(/u.test(skill), "skill duplicates implementation APIs.");
invariant(!/\b(?:Phaser|WebGPU|PWA)\b/u.test(skill), "skill claims unsupported runtime scope.");

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
invariant(schema.$schema === "https://json-schema.org/draft/2020-12/schema", "task schema draft is invalid.");
invariant(schema.additionalProperties === false, "task schema must reject unknown root fields.");
invariant(schema.properties?.nextAction?.type === "string", "task schema must require one next action string.");

for (const fileName of templates) {
  const packet = JSON.parse(await readFile(join(skillRoot, "templates", fileName), "utf8"));
  validateTemplate(packet, fileName);
}

process.stdout.write("SFHS Hermes adapter repository acceptance passed.\n");
