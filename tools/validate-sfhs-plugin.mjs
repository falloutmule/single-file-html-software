import { readFile, readdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import process from "node:process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const pluginRoot = join(repositoryRoot, "plugins", "sfhs");
const manifestPath = join(pluginRoot, ".codex-plugin", "plugin.json");
const marketplacePath = join(repositoryRoot, ".agents", "plugins", "marketplace.json");
const expectedSkills = Object.freeze(["sfhs", "sfhs-import", "sfhs-pixi", "sfhs-release", "sfhs-verify"]);

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`SFHS_PLUGIN_INVALID: ${message}`);
  }
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
invariant(basename(pluginRoot) === "sfhs" && manifest.name === "sfhs", "folder and manifest names must match.");
invariant(manifest.version === "0.1.0", "plugin version must be 0.1.0 before cachebusting.");
invariant(manifest.skills === "./skills/", "plugin must discover only its skills directory.");
invariant(!("mcpServers" in manifest) && !("apps" in manifest) && !("hooks" in manifest), "MCP, apps, and hooks are forbidden.");
invariant(!JSON.stringify(manifest).includes("[TODO:"), "plugin manifest contains TODO metadata.");

const marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
const entry = marketplace.plugins?.find((candidate) => candidate.name === "sfhs");
invariant(entry !== undefined, "marketplace entry is missing.");
invariant(entry.source?.source === "local" && entry.source?.path === "./plugins/sfhs", "marketplace source is invalid.");
invariant(entry.policy?.installation === "AVAILABLE", "installation policy must be AVAILABLE.");
invariant(entry.policy?.authentication === "ON_INSTALL", "authentication policy must be ON_INSTALL.");
invariant(entry.category === "Developer Tools", "marketplace category is invalid.");

const actualSkills = (await readdir(join(pluginRoot, "skills"), { withFileTypes: true }))
  .filter((entryValue) => entryValue.isDirectory())
  .map((entryValue) => entryValue.name)
  .sort();
invariant(JSON.stringify(actualSkills) === JSON.stringify(expectedSkills), "skill directory set is invalid.");

for (const skillName of expectedSkills) {
  const skillRoot = join(pluginRoot, "skills", skillName);
  const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
  const agent = await readFile(join(skillRoot, "agents", "openai.yaml"), "utf8");
  invariant(skill.startsWith(`---\nname: ${skillName}\n`), `${skillName} frontmatter name is invalid.`);
  invariant(skill.includes("description:") && !skill.includes("[TODO:"), `${skillName} metadata is incomplete.`);
  invariant(skill.includes("pnpm sfhs"), `${skillName} must call the shared CLI.`);
  invariant(!/(?:packProject|verifyArtifactBytes|runPixiArtifactScenarios)\s*\(/u.test(skill), `${skillName} duplicates implementation APIs.`);
  invariant(!/\bsnc\b|solidarity-not-charity/iu.test(skill), `${skillName} contains unrelated project terminology.`);
  invariant(agent.includes(`$${skillName}`), `${skillName} default prompt must name the skill.`);
}

const router = await readFile(join(pluginRoot, "skills", "sfhs", "SKILL.md"), "utf8");
const pixi = await readFile(join(pluginRoot, "skills", "sfhs-pixi", "SKILL.md"), "utf8");
invariant(router.includes("Never route them to Phaser"), "router must keep explicit SFHS/Pixi requests out of Phaser.");
invariant(pixi.includes("Do not use Phaser"), "Pixi specialist must reject Phaser substitution.");

const forbiddenCompanions = [".mcp.json", ".app.json", "hooks.json"];
const pluginEntries = await readdir(pluginRoot);
for (const forbidden of forbiddenCompanions) {
  invariant(!pluginEntries.includes(forbidden), `${forbidden} must not exist.`);
}

process.stdout.write("SFHS plugin repository acceptance passed.\n");
