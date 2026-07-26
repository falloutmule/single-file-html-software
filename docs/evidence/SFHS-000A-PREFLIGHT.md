# SFHS-000A — Runtime and Repository Preflight

**Date:** 2026-07-20  
**Mode:** read-only research and planning  
**Project:** SFHS — Single-File HTML Software  
**Result:** preflight complete; writable setup awaits one bundled decision and a separate repository

## Goal

Determine where SFHS should live, how its Codex plugin should be structured and installed, which local tools are available, which Hermes practices are reusable, and what existing work must be preserved before scaffolding.

## Nontechnical summary

SFHS does not exist yet as an implementation. The current workspace cannot safely become the SFHS repository: a workspace-level `AGENTS.md` now explicitly designates it for SNC and points to the nested game repository. OpenAI's Game Studio plugin is useful as a design reference, but its PixiJS and single-file-artifact coverage is insufficient for SFHS. The recommended path is a new standalone SFHS repository containing a small, original `sfhs` plugin alongside a host-neutral CLI. Selected workflow ideas may come from Game Studio and Hermes, while SNC names and runtime behavior stay outside the SFHS core.

No repository, package, plugin, marketplace, Hermes profile, or remote state was changed during this preflight.

## What was inspected

- Current workspace and Git state at `C:/Users/fallo/Documents/Single-File-Html`.
- Workspace-level instructions in `C:/Users/fallo/Documents/Single-File-Html/AGENTS.md` after that file appeared during the research pass.
- Supplied handoff: `C:/Users/fallo/Downloads/SFHS-PIXIJS-CODEX-IMPLEMENTATION-HANDOFF.md`.
- Supplied resource inventory: `C:/Users/fallo/Desktop/HERMES_SFHS_SNC_RESOURCE_REPORT_FOR_CODEX.md`.
- Current upstream OpenAI Game Studio plugin source at `https://github.com/openai/plugins/tree/main/plugins/game-studio`.
- Local Codex plugin-creator and skill-creator specifications.
- Personal and repository Codex marketplace locations.
- Local Codex plugin cache and personal plugin root.
- Windows, Node.js, npm, pnpm, Git, Chrome, Edge, and local Playwright state.
- Existing Hermes skill and profile paths, without reading credentials or private runtime state.
- Generic Hermes practices relevant to single-file software, bounded implementation, release verification, exact-once testing, visual evidence, and independent checking.

## What was verified

### Workspace and Git

- Current planning-workspace Git root: `C:/Users/fallo/Documents/Single-File-Html`.
- Branch: `master`.
- Commits: none.
- Remotes: none.
- Tracked SFHS implementation files: none.
- `.agents/` exists but is empty.
- Repository marketplace file is absent: `.agents/plugins/marketplace.json`.
- At initial inspection, the only workspace content was the untracked directory `solidarity-not-charity-can-run/`.
- During the research pass, untracked `AGENTS.md` and `SNC-TAKEOVER-PLAN.md` appeared. They were not created or modified by this task.
- `AGENTS.md` declares this workspace to be for SNC and names `solidarity-not-charity-can-run/` as the game repository.
- Therefore neither this Git root nor the nested game repository is an acceptable SFHS implementation destination.
- The two SFHS planning documents under `docs/` are temporary handoff artifacts in the approved working directory, not evidence that this is the canonical SFHS repository.

### Local development tools

| Tool | Verified state |
|---|---|
| Operating system | Windows 11 Home, 64-bit, version `10.0.26200`, build `26200` |
| Node.js | `v24.14.0` |
| npm | `11.9.0` through `npm.cmd` |
| pnpm | `11.9.0` |
| Git | `2.54.0.windows.1` |
| Google Chrome | `150.0.7871.125` |
| Microsoft Edge | `150.0.4078.83` |
| Playwright | `1.61.1`, installed only under the unrelated SNC project copy |

PowerShell blocks `npm.ps1` under the current execution policy; Windows tasks should call `npm.cmd` or use `pnpm.cmd`. The clean SFHS root currently has no `package.json`, lockfile, `node_modules`, Playwright installation, or browser installation owned by SFHS.

### OpenAI Game Studio

- Upstream manifest version inspected: `0.1.2`.
- License declared by the manifest: MIT.
- The plugin uses a router plus specialist skills.
- Its router explicitly defaults ordinary 2D games to Phaser.
- It includes useful generic guidance for simulation/render separation, action-based input, DOM HUDs and menus, asset organization, responsive UI, browser automation, and screenshot review.
- It has no PixiJS specialist and no SFHS-style deterministic one-file packer, artifact contract, hash/evidence contract, or release-preparation boundary.
- No Game Studio files were found in the current Codex plugin cache or personal plugin root.
- Game Studio skills are not exposed in this task's installed skill catalog. It is therefore reference-only in the current session.

### Codex plugin setup

- Personal marketplace file is absent: `C:/Users/fallo/.agents/plugins/marketplace.json`.
- Personal plugin root is absent: `C:/Users/fallo/plugins`.
- Repository marketplace file is absent in the current SNC-designated workspace.
- `codex plugin list` could not be executed: the packaged `codex.exe` returned Windows `Access is denied`, including outside the workspace sandbox.
- The local plugin-creator specification supports a personal marketplace by default or a repository marketplace when explicitly selected.
- A repository marketplace expects the canonical plugin path `plugins/sfhs`, not the older proposed path `plugins/codex`. Folder name, manifest name, skill name, and marketplace entry must remain internally consistent.

### Hermes

- Hermes root exists at `C:/Users/fallo/AppData/Local/hermes`.
- The profile directory exists and contains builder and checker profiles, including `checker` and `checker-terra`.
- The following relevant skills exist locally:
  - `self-contained-html-games`
  - `browser-game-release-verification`
  - `fail-closed-selfcheck-runner`
  - `artifact-visual-verification`
  - `implementation-contract-verification`
  - `contract-bounded-implementation`
  - `snc-handoff-runtime-integration`
- The generic, reusable practices are bounded file ownership, repository-truth preflight, source/generated separation, exact artifact identity, run-contained evidence, fail-closed gates, semantic screenshot review, physical-device authority, and a read-only independent checker.
- SNC-specific asset IDs, raycaster rules, D1 proof-zone counts, game maps, build IDs, and acceptance fields are not reusable SFHS core behavior.
- `hermes.exe --version` failed because its launcher references a Python executable that could not be created. Hermes integration is therefore a later blocked lane until the launcher/profile runtime is repaired or an alternate supported invocation is verified.

## What was inferred

- A separate standalone repository is the safest SFHS destination because the current workspace is explicitly governed as SNC.
- The current root, its `SNC-TAKEOVER-PLAN.md`, and the nested SNC game repository are out of scope for SFHS implementation.
- A repository-local plugin source and marketplace are the cleanest development arrangement because plugin source, CLI contracts, tests, and clean-install fixtures can be versioned together.
- Installing Game Studio now would add a competing Phaser-first router before SFHS has a working Pixi-first authority. It should remain uninstalled during the first SFHS acceptance cycle.
- The Game Studio compatibility question should be tested after the standalone SFHS plugin passes on its own.
- The Codex plugin should contain workflow instructions and routing only. All packing, validation, browser testing, and evidence behavior should live in the shared CLI.
- Hermes should receive a thin `sfhs-orchestrator` adapter only after CLI commands and JSON envelopes are stable.

## What remains untested

- The intended GitHub owner, repository name, and remote URL.
- The exact approved local path for the new standalone SFHS repository.
- Personal versus repository-local Codex marketplace as an explicit user choice.
- Clean execution of the local Codex plugin CLI.
- A clean SFHS dependency install.
- The exact PixiJS version to pin for v0.1.
- SFHS-owned Playwright and Chromium installation.
- Deterministic artifact bytes across Windows and Linux.
- `file://` behavior for all supported embedded asset types.
- Clean-profile Hermes execution.
- Any implementation, build, pack, browser test, plugin install, or release action.

## What failed

- `codex plugin list` failed with Windows `Access is denied`.
- `hermes.exe --version` failed because its launcher could not create the configured Python process.
- `npm --version` through `npm.ps1` was blocked by PowerShell execution policy; `npm.cmd --version` succeeded and is the supported local invocation.

These failures do not block writing SFHS source. They block claiming live Codex plugin inventory through the CLI and live Hermes adapter acceptance.

## Current exact state

```text
SFHS architecture handoff: available
SFHS finish plan: written in docs/SFHS-V0.1-FINISH-PLAN.md
Canonical SFHS repository: does not exist; standalone path recommended
Repository scaffold: not started
SFHS packages and schemas: not started
PixiJS adapter: not started
Packer and verifier: not started
Codex SFHS plugin: not started
OpenAI Game Studio plugin: reference-only, not found locally
Hermes SFHS adapter: not started
MCP server: deliberately deferred
Remote repository changes: none
Release state: not started
```

## Decisions required

One bundled decision should be accepted before the first writable implementation task:

1. Create or select a standalone SFHS repository, with proposed local path `C:/Users/fallo/Documents/SFHS`.
2. Use a repository-local Codex marketplace and canonical plugin source at `plugins/sfhs` during development.
3. Keep strict `file://` support as a v0.1 goal, recording honest limitations rather than adding runtime URLs.
4. Use the proposed tiny top-down Pixi fixture as the first toolchain proof.
5. Use MIT for SFHS code, `falloutmule` as the initial author name, and omit unknown optional contact/URL fields until real values exist.
6. Keep OpenAI Game Studio uninstalled until SFHS passes standalone clean-install acceptance.
7. Make no SFHS implementation or marketplace changes in `C:/Users/fallo/Documents/Single-File-Html` or its nested SNC game repository. Copy these planning artifacts into the new repository only after its path is approved.

If any item is rejected, update the relevant ADR before scaffolding. No marketplace file should be created until item 2 is explicitly accepted.

## Recommended repository destination

Use a new standalone Git root:

```text
C:/Users/fallo/Documents/SFHS
```

Create it only after explicit path approval. Initialize it on `main`, copy the two accepted planning documents into it, and do not attach a remote until the repository owner/name is known. Do not move, delete, ignore, or otherwise alter files in the current SNC workspace as part of that task.

## Recommended first writable task

Run `SFHS-000B — Standalone repository and decision lock` from the finish plan. It should create the approved standalone repository, copy the accepted planning documents, and create only ADRs plus a terminology boundary. It must not modify the current SNC workspace beyond reading these two handoff artifacts, and it must not install packages or plugins.

## Evidence paths and commands

Primary sources:

- `C:/Users/fallo/Downloads/SFHS-PIXIJS-CODEX-IMPLEMENTATION-HANDOFF.md`
- `C:/Users/fallo/Desktop/HERMES_SFHS_SNC_RESOURCE_REPORT_FOR_CODEX.md`
- `https://github.com/openai/plugins/tree/main/plugins/game-studio`
- `C:/Users/fallo/.codex/skills/.system/plugin-creator/SKILL.md`
- `C:/Users/fallo/.codex/skills/.system/skill-creator/SKILL.md`
- `C:/Users/fallo/.codex/skills/hermes-skill-single-file-html-game/SKILL.md`

Representative read-only commands:

```text
git rev-parse --show-toplevel
git status --short --branch
git remote -v
rg --files
node --version
npm.cmd --version
pnpm --version
git --version
codex plugin list
hermes.exe --version
```

## Next actionable step

Approve or amend the seven defaults under **Decisions required**, then execute `SFHS-000B` only.
