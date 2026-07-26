# SFHS-002A - Pixi Minimal Fixture

**Date:** 2026-07-20  
**Status:** PASS (authored-fixture scope)  
**Autonomy used:** bounded local adapter, example, test, dependency-lock, and documentation changes

## WHAT WAS DONE

- Pinned `pixi.js@8.19.0` in `@sfhs/adapter-pixi-v8` and added the first adapter descriptor: `pixi-v8`, WebGL required, WebGPU disabled.
- Added `examples/pixi-minimal` as an SFHS workspace package with a complete `sfhs.project@1` manifest.
- Added readable authored HTML, CSS, TypeScript, and an empty asset manifest. The HTML provides a DOM start/status shell; no inline handlers are used.
- The adapter performs a WebGL context preflight before asynchronous Pixi `Application.init({ preference: "webgl" })`; failure presents an honest capability message instead of accepting Canvas or WebGPU fallback.
- Added a serializable initial fixture state and a pure state-to-presentation selector. The only Pixi visual is a procedural marker; no external asset, network URL, or game content exists.

## WHAT WAS VERIFIED

```text
pnpm.cmd exec vitest run adapters/pixi-v8/src/index.test.ts examples/pixi-minimal/src/fixture.test.ts
pnpm.cmd check
pnpm.cmd sfhs validate --json --project examples/pixi-minimal
pnpm.cmd install --frozen-lockfile --offline --reporter=append-only
```

- Focused adapter/fixture gate: 2 test files and 6 tests passed.
- Full workspace gate: ESLint, strict TypeScript, and all 10 workspace test files passed (29 tests total).
- The real read-only CLI returned exit `0` and no findings for the fixture manifest.
- Frozen offline install passed across all 11 workspace packages.
- Static fixture scan checks source for runtime `http(s)` URLs, `eval`, and inline event handlers; all checks passed.

## WHAT FAILED

Nothing in this card's authored-source acceptance failed.

Browser boot, screenshots, `file://` behavior, input, resize, context loss, and release-artifact proof were intentionally not run. The current HTML references authored TypeScript and a bare workspace import; it requires the future builder/packer before it can be served as a standalone release artifact.

## CURRENT EXACT STATE

```text
fixture: examples/pixi-minimal
adapter: pixi-v8 / pixi.js 8.19.0
renderer contract: WebGL required; WebGPU disabled; no Canvas fallback accepted
runtime external URL allowlist: empty
assets: procedural marker only; src/assets/manifest.json has no bundles
generated artifact: none
browser verification: not yet implemented
```

## REMAINING BLOCKERS

- SFHS does not yet have a builder, one-file packer, static artifact scanner, or browser runner.
- The fixture has no fixed-step loop, lifecycle teardown, input map, viewport policy, embedded asset proof, or runtime diagnostics yet. Those are later vertical-slice cards.
- Therefore this card makes no claim that PixiJS booted in a browser or that an HTML artifact is self-contained.

## NEXT ACTIONABLE STEP

Assign `SFHS-002B - Pixi simulation, render, and lifecycle boundary` as one bounded card. It should retain serializable state outside Pixi objects and prove that render code cannot mutate it.

## EVIDENCE

Relevant failure modes from the single-file-game skill:

| Mode | Guard in this card |
|---|---|
| A - deliverable drift | Fixture remains authored source; no generated `dist/` artifact is claimed or hand-edited. |
| B - external dependency leak | Empty manifest allowlist; local package dependency only; static URL scan. |
| C - inline handler/eval creep | `addEventListener` only; static scan rejects inline handler attributes and `eval`. |
| E - render mutates simulation | Initial state is serializable and the presentation selector is pure; runtime loop/render boundary remains pending 002B. |
| Q - proofless success | Focused tests, complete workspace gate, CLI manifest validation, frozen install, and this bounded report. |
| T - AI overreach | No builder, packer, browser test, runtime asset, plugin, Hermes, or SNC work was added. |

## GITHUB PAGES URL

Not applicable. The fixture is local authored source only; no remote, deployment, or release artifact exists.

## Scope held

- No SNC source, names, assets, runtime behavior, or tests were read or changed.
- No external runtime URL, CDN, WebGPU path, Canvas fallback path, asset file, browser runner, builder, packer, verifier, Codex plugin, Hermes adapter, marketplace, remote, or release action was added.
- No commit, push, pull request, release, or plugin installation occurred.
