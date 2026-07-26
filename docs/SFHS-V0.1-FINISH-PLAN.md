# SFHS v0.1 Finish Plan

**Project:** SFHS — Single-File HTML Software  
**Primary adapter:** PixiJS v8  
**Primary development host:** Codex  
**Secondary host:** Hermes through a thin adapter  
**Release artifact:** exactly one self-contained HTML file  
**Primary runtime target:** stable Android Chrome on a physical Samsung Galaxy S21 Ultra  
**Secondary runtime target:** desktop Chromium on PC  
**Plan status:** SFHS-000A through SFHS-010B implementation complete; independent checker is locally clean and returns `BLOCKED_ON_EXTERNAL_DECISION`; SFHS-010C is not authorized

## Executive decision

Build an original plugin named `sfhs`. Do not fork, vendor, or depend on the whole OpenAI Game Studio plugin.

Use each source for a bounded purpose:

| Source | Adopt | Exclude |
|---|---|---|
| OpenAI Game Studio | Router pattern, simulation/render boundary, action-based input, DOM HUD/menu guidance, asset organization, responsive UI, playtest and screenshot heuristics | Phaser-first routing, unrelated 3D stacks, broad game-creation identity, any assumption that a normal web bundle is the release artifact |
| Hermes generic skills | Contract-bounded cards, source/artifact parity, exact artifact identity, contained evidence, fail-closed gates, semantic visual review, physical-device authority, read-only checker | SNC names, raycaster logic, asset IDs, D1 counts, project-specific test sections, one-shot budgets unless a task explicitly declares one |
| SFHS | Project manifest, adapter API, deterministic build, one-file packer, external-reference rejection, exact-artifact browser verification, evidence schemas, CLI, plugin authority, release preparation | Game-specific mechanics and host-specific duplicate implementations |

OpenAI Game Studio remains an optional companion after SFHS is independently functional. If it is later installed, an explicit SFHS request or `adapter.id: "pixi-v8"` must override Game Studio's Phaser default.

## Naming and scope boundary

The project is SFHS, not SNC.

- Use `sfhs`, `@sfhs/*`, `sfhs.project.json`, and `SFHS-*` for core packages, commands, schemas, reports, and work cards.
- Do not use `snc`, `solidarity-not-charity`, raycaster-specific identifiers, or SNC asset names in package names, plugin prompts, core fixtures, schema examples, or default tests.
- SNC may appear only in provenance notes and the later read-only compatibility audit.
- The first production adapter is PixiJS v8. SFHS itself stays renderer-neutral.
- Do not migrate or refactor SNC as part of v0.1.

## Target architecture

```text
Codex sfhs plugin ─┐
                   ├─> SFHS CLI ─> contracts/core ─> adapter registry ─> pixi-v8
Hermes adapter ────┘                    │
                                       ├─> builder/packer
                                       ├─> static verifier
                                       └─> browser runner/evidence

authored source ─> deterministic build ─> dist/index.html ─> exact-artifact verification
```

Dependency rules:

- Hosts call the CLI; hosts do not implement SFHS behavior.
- Core packages never import Codex- or Hermes-specific code.
- The Pixi adapter may add checks but may not weaken core checks.
- Generated HTML is never the authored source of truth.
- Runtime external URLs default to an empty allowlist.
- No MCP server, app, or hook belongs in v0.1.

## Canonical repository layout

Use the handoff layout with one correction required by the current plugin scaffold rules: place the plugin at `plugins/sfhs`, not `plugins/codex`.

```text
SFHS/
├── .agents/plugins/marketplace.json       # only after repo-marketplace approval
├── .github/workflows/
├── adapters/pixi-v8/
├── packages/
│   ├── contracts/
│   ├── core/
│   ├── builder/
│   ├── packer/
│   ├── verifier/
│   ├── browser-runner/
│   ├── evidence/
│   └── cli/
├── plugins/
│   ├── sfhs/
│   │   ├── .codex-plugin/plugin.json
│   │   ├── assets/
│   │   ├── references/
│   │   └── skills/
│   │       ├── sfhs/
│   │       ├── sfhs-pixi/
│   │       ├── sfhs-import/
│   │       ├── sfhs-verify/
│   │       └── sfhs-release/
│   └── hermes/
│       └── skills/sfhs-orchestrator/
├── examples/pixi-minimal/
├── fixtures/valid/
├── fixtures/invalid/
├── tests/
├── docs/adr/
├── docs/evidence/
├── sfhs.project.json                      # only in projects using SFHS
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

This layout belongs in a new standalone repository, proposed at `C:/Users/fallo/Documents/SFHS`. The current `C:/Users/fallo/Documents/Single-File-Html` workspace and its nested `solidarity-not-charity-can-run/` game repository are SNC-governed and are not part of this layout.

## Operating contract for lower-intelligence execution

Every task after this planning pass must be issued as one card containing:

```text
Card ID and goal
One observable behavior change
Exact repository root, branch, and base commit
Allowed production files
Allowed test/evidence files
Forbidden files and actions
Required commands and exact expected exits
Artifact and evidence outputs
Commit authority
Remote authority
Stop conditions
Handoff headings
```

Rules for every card:

1. Reconcile repository root, branch, HEAD, status, and remotes before mutation.
2. Preserve unrelated dirty or untracked work.
3. Touch only allowlisted paths.
4. Work in authored source, then regenerate the artifact.
5. Run the focused gate named by the card.
6. Record exact commands, exits, hashes, and output paths.
7. Stop on an unlisted failure; do not widen scope or weaken a gate.
8. Use one builder and one later read-only checker. A checker never repairs its own findings.
9. Do not consume an exact-once browser or device budget unless the card explicitly declares it.
10. Do not push, publish, merge, tag, deploy, install a marketplace, or change a Hermes profile without explicit authority.

## Intelligence map

Use the lowest level that safely fits the card:

- **I1 mechanical:** generated scaffold edits, prescribed metadata, exact fixture additions.
- **I2 standard engineering:** focused TypeScript, schemas, tests, plugin prose, CI wiring.
- **I3 advanced engineering:** deterministic packaging, renderer boundaries, browser harnesses, cross-platform artifact identity.
- **I4 architecture/checker:** dependency design, contract changes, release governance, migration decisions, final independent audit.

Turning intelligence down is safe for I1/I2 cards because this plan fixes scope and acceptance. Keep I3/I4 for the packer, browser runner, cross-platform determinism, Hermes decomposition, and final release checker.

## Critical path

```text
000A preflight
→ 000B standalone repository and decision lock
→ 001A workspace scaffold
→ 001B/001C contracts and core utilities
→ 001D read-only CLI envelope
→ 002A Pixi minimal fixture
→ 002B/002C/002D/002E runtime boundaries
→ 003A/003B/003C builder, packer, scanner
→ 003D determinism proof
→ 004A/004B/004C/004D exact-artifact verification
→ 005A/005B/005C complete CLI and evidence
→ 006A/006B/006C/006D Codex plugin
→ 007A/007B/007C Hermes adapter
→ 008A small non-SNC import proof
→ 010A/010B/010C release candidate and authorized release
```

MCP evaluation stays outside the critical path and begins only after v0.1 CLI usage shows a measurable need.

## Phase and card plan

### Gate 0 — Accept the setup defaults

**Intelligence:** I1  
**Mutation:** none

Accept or amend the seven-item decision bundle in `docs/evidence/SFHS-000A-PREFLIGHT.md`.

Exit gate:

- standalone repository path confirmed;
- plugin marketplace choice confirmed;
- strict `file://`, fixture, license/publisher, Game Studio, and nested-directory defaults recorded;
- remote creation remains separately authorized.

### SFHS-000B — Standalone repository and decision lock

**Intelligence:** I4 for content, I1 for file creation  
**Allowed scope:** the newly approved SFHS root only

Create the new local Git repository on `main`, copy the accepted preflight and finish-plan documents into it, then create ADRs for:

- host-neutral core;
- PixiJS v8 first adapter;
- CLI before MCP;
- split authored source and one-file release;
- WebGL-required capability page;
- original SFHS plugin with optional Game Studio compatibility;
- repository-local plugin source and marketplace;
- SFHS/SNC terminology boundary.

Exit gate:

- each ADR records decision, alternatives, consequences, and reversal condition;
- the new repository contains no SNC game source, SNC workspace files, or copied private runtime state;
- the current SNC-designated workspace and nested game repository remain unchanged;
- no package or plugin install occurs.

### SFHS-001A — Minimal workspace scaffold

**Intelligence:** I2  
**Depends on:** 000B

Create the pnpm workspace, TypeScript base, package boundaries, test runner, minimal CI, and placeholder tests. Pin tool versions deliberately; do not copy dependency versions from the unrelated SNC package.

Exit gate:

- clean `pnpm install` using the committed lockfile;
- workspace typecheck and test commands exit 0;
- no Pixi runtime, plugin install, or MCP surface yet;
- clean Git scope.

### SFHS-001B/001C — Contracts and safe core

**Intelligence:** I3  
**Safe parallelism:** schemas and path/hash utilities may proceed in separate packages

Implement:

- `sfhs.project@1`, `sfhs.artifact@1`, and `sfhs.evidence@1`;
- canonical JSON;
- deterministic project discovery;
- root-contained path handling and symlink-escape rejection;
- byte-accurate SHA-256 helpers;
- stable finding codes and valid/invalid fixtures.

Exit gate:

- valid fixtures pass;
- traversal, symlink escape, malformed schema, unknown adapter, and forbidden URL fixtures fail for exact codes;
- repeated canonical serialization is byte-identical.

### SFHS-001D — Read-only CLI envelope

**Intelligence:** I2  
**Depends on:** 001B/001C

Implement only `doctor`, `inspect`, and `validate`, with human and stable JSON output.

Exit gate:

- stable exit-code table;
- no command reports success on a contract failure;
- no command writes outside the selected evidence directory;
- JSON envelopes validate against fixtures.

### SFHS-002A–002E — PixiJS vertical slice

**Intelligence:** I3 for loop/input/viewport/assets; I2 for fixture shell

Build a tiny top-down fixture with:

- async PixiJS v8 initialization;
- explicit WebGL requirement and honest unsupported page;
- serializable simulation state outside Pixi objects;
- SFHS-owned fixed-step loop;
- DOM start/menu/HUD layer;
- explicit action map for keyboard and pointer;
- fixed logical resolution, safe areas, portrait/landscape handling;
- embedded PNG, SVG/UI, atlas, and audio-unlock proof paths;
- read-only runtime diagnostics.

Exit gate:

- deterministic simulation and state hash;
- render cannot mutate simulation;
- long-delta, pause/resume, pointer capture/cancel, multi-pointer, coordinate mapping, resize, and asset tests pass;
- localhost proof is green;
- `file://` behavior is recorded honestly;
- zero unexpected external requests.

### SFHS-003A–003D — Builder, packer, scanner, determinism

**Intelligence:** I3

Implement intermediate bundling, parser-based HTML/resource rewriting, one-file packing, and static external-reference discovery.

Exit gate:

- all required JS, CSS, Pixi code, and assets are inlined;
- no dynamic chunk or runtime CDN;
- unsupported resource types fail explicitly;
- scanner covers scripts, styles, images, fonts, workers, imports, SVG, media, manifests, service workers, and hidden runtime requests where statically discoverable;
- two clean builds on the same verified environment produce byte-identical HTML and SHA-256;
- no timestamp enters canonical artifact bytes.

### SFHS-004A–004D — Exact-artifact verification

**Intelligence:** I3

Implement the static verifier, Playwright runner, Pixi scenarios, screenshots, and negative artifact fixtures.

Required browser scenarios:

- boot and capability result;
- fixed-step/lifecycle;
- keyboard/pointer input;
- resize/orientation/safe-area;
- embedded assets and audio unlock;
- context-loss classification;
- `file://` classification.

Physical-device acceptance uses the Samsung Galaxy S21 Ultra in both portrait and landscape. Evidence must record the exact `SM-G998*` model identifier, Android version, Chrome version, viewport and device-pixel ratio, orientation, and WebGL capability result. The automated `pixel-7` viewport remains supporting coverage and is not a substitute for this physical-device result.

Exit gate:

- the browser runner serves and tests the exact packed bytes;
- artifact SHA-256 appears in every browser report;
- console, page, resource, and external-network audits are green;
- screenshots are semantically reviewable, not merely nonblank;
- release readiness includes a passing Samsung Galaxy S21 Ultra result, with desktop Chromium retained as the secondary regression baseline;
- every negative fixture fails for its intended stable code.

### SFHS-005A–005C — Complete CLI and proportional evidence

**Intelligence:** I3 for command parity/test selection; I2 for report generation

Add `build`, `pack`, `verify`, `test`, `check`, and `release prepare`. Add a path-to-test map and a run-contained evidence collector.

Exit gate:

- direct package calls and CLI calls produce equivalent results;
- unknown runtime paths select static/build checks plus one browser smoke and a review warning;
- ordinary changes run a proportional gate, while release mode runs the full matrix;
- evidence contains commands, exits, exact hashes, versions, screenshots when visual, and one verdict;
- evidence excludes secrets, raw prompts, and unrelated history.

### SFHS-006A–006D — Original Codex plugin

**Intelligence:** I2 for scaffold, I3 for routing and clean-install acceptance

Create `plugins/sfhs` with the current plugin-creator scaffold and validate it. The plugin contains one router and four specialists:

- `sfhs` — inspect and route authoring/import/verification/release work;
- `sfhs-pixi` — Pixi adapter guidance and CLI selection;
- `sfhs-import` — static-first existing-project intake;
- `sfhs-verify` — read-only exact-artifact QA;
- `sfhs-release` — preparation only, never implicit publication.

Exit gate:

- `.codex-plugin/plugin.json` and every skill validate;
- no TODO metadata or missing asset paths;
- no MCP/app/hook declaration;
- skill prose calls the CLI and does not reimplement it;
- explicit Pixi requests cannot route to Phaser;
- a clean Codex environment discovers the plugin and completes one inspect/change/build/verify flow without hidden checkout dependencies;
- standalone acceptance passes before optional Game Studio co-install testing.

After standalone PASS, optionally install Game Studio in a separate compatibility task and prove that:

- general design requests may use Game Studio;
- SFHS manifests and explicit SFHS/Pixi requests route to SFHS;
- neither plugin silently changes the other's artifact or release contract.

### SFHS-007A–007C — Thin Hermes adapter

**Intelligence:** I4 for decomposition, I3 for clean-profile acceptance  
**Blocked until:** Hermes launcher/profile invocation is verified

Create `sfhs-orchestrator` as policy and task templates only. It must call the same SFHS CLI and must not copy the packer, verifier, Pixi runtime, or plugin prose.

Exit gate:

- installs without patching Hermes core;
- one bounded task contains exact root, base, allowed files, commands, evidence, and stop conditions;
- a builder produces an artifact and evidence;
- one separate read-only checker returns PASS or bounded failure;
- profile, run IDs, commit, artifact hash, and evidence paths are recorded;
- no nonprofit profile changes unless separately requested.

### SFHS-008A — Small non-SNC import proof

**Intelligence:** I3

Choose a small existing custom HTML project that is not SNC. Perform static inventory before execution, identify authored/generated boundaries and external references, then migrate behind the SFHS contracts.

Exit gate:

- imported project builds to one file;
- exact artifact is verified;
- behavior comparison and limitations are recorded;
- generated release remains generated.

### SFHS-008B — SNC read-only compatibility audit

**Intelligence:** I4  
**Mutation:** none in SNC

Only after the generic SFHS contracts are stable, identify which generic contracts SNC already satisfies and what future adapter seam might be useful. Do not migrate the renderer, import SNC identifiers, or treat this audit as v0.1 completion work.

### SFHS-010A–010C — Release candidate and release gate

**Intelligence:** I3 reproduction, I4 independent checker, I2 authorized operator

From a clean checkout, run:

```text
install → validate → focused contracts → build → pack
→ static verify → exact-artifact browser verify → evidence
```

Independent checker requirements:

- host-neutral dependency direction;
- no duplicate Hermes implementation;
- valid plugin structure;
- Pixi adapter boundaries;
- one exact artifact with no unexpected runtime dependency;
- clean-checkout reproduction;
- honest `file://`, context-loss, device, and visual limitations;
- no unsupported WebGPU, Canvas-fallback, PWA, or publication claims.

The checker returns exactly one of:

```text
READY_FOR_USER_RELEASE_APPROVAL
NOT_READY
BLOCKED_ON_EXTERNAL_DECISION
```

Push, PR, merge, tag, plugin publication, and deployment occur only in `SFHS-010C` after explicit authorization. Verify the exact remote/public artifact after release.

Current outcome: 010A clean-copy reproduction and 010B independent checking are complete. The read-only checker reports no local findings and returns `BLOCKED_ON_EXTERNAL_DECISION` for physical S21 Ultra acceptance, active-profile plugin-install authorization, public-remote configuration, and Windows/Linux CI evidence. 010C remains unstarted and requires explicit authorization after the checker returns `READY_FOR_USER_RELEASE_APPROVAL`.

## Proportional gates

Ordinary Pixi runtime change:

```text
type/static check
+ adapter contract test
+ one focused regression
+ build and pack
+ static artifact verify
+ one exact-artifact browser smoke
+ screenshot only when visual
+ physical-device test only when the requested outcome lives there
```

Release candidate:

```text
clean install
+ all contract/unit/negative tests
+ two-build determinism proof
+ full approved browser matrix
+ semantic screenshot review
+ clean Codex plugin acceptance
+ clean Hermes profile acceptance or explicit external blocker
+ independent read-only checker
```

## Definition of done

SFHS v0.1 is done only when:

- host-neutral contracts and CLI are implemented with stable JSON and exit codes;
- the PixiJS v8 adapter has tested simulation/render, viewport, input, asset, and capability boundaries;
- readable source deterministically emits exactly one self-contained HTML runtime;
- two identical clean builds are byte-identical in the verified environment;
- static and browser verifiers bind evidence to exact artifact bytes and SHA-256;
- unintended runtime external references fail closed;
- required screenshots are human-reviewable;
- the original `sfhs` Codex plugin is clean-installed and functionally exercised;
- the Hermes adapter invokes the same CLI and is clean-profile tested, or release is explicitly blocked on the broken external Hermes runtime;
- one independent checker returns `READY_FOR_USER_RELEASE_APPROVAL`;
- no release claim is made until authorized remote/public verification passes.

## Immediate next action

Resolve the four recorded external gates: physical portrait/landscape acceptance on Samsung Galaxy S21 Ultra `SM-G998*`, explicit active-profile plugin-install authorization, explicit public-remote authorization/configuration, and Windows/Linux determinism evidence. Then rerun the independent read-only checker. Keep the optional 008B compatibility audit deferred; it is not v0.1 completion work.

Do not install OpenAI Game Studio, begin 010C, create or change a remote, push, publish, tag, or deploy without explicit authorization. Do not scaffold in `C:/Users/fallo/Documents/Single-File-Html` or inside `solidarity-not-charity-can-run/`.
