# SFHS-003A - Deterministic Builder

**Date:** 2026-07-20  
**Status:** PASS  
**Base commit:** `658872b`

## WHAT WAS DONE

- Added the public typed `SfhsProjectManifest` contract.
- Added `sfhs.build-plan@1` and `sfhs.intermediate@1` in-memory interfaces.
- Implemented validated project discovery and contained resolution for HTML, entry, styles, public directory, asset manifest, and output path.
- Pinned direct `esbuild@0.28.1` builder ownership and updated the lockfile.
- Bundled browser TypeScript, PixiJS, JSON, and imported local assets with one IIFE JavaScript output, no splitting, no sourcemap, no legal-comment timestamp, and no runtime module import.
- Transformed declared CSS, collected and size-checked local assets, retained emitted asset bytes, and calculated a canonical authored-source SHA-256.
- Replaced runtime `new URL(..., import.meta.url)` asset discovery with explicit typed asset imports so the builder owns every emitted file.
- Kept the entire operation read-only: no `dist/` or intermediate directory is written.

## WHAT WAS VERIFIED

```text
pnpm install --offline --reporter=append-only
pnpm exec vitest run packages/builder/src/index.test.ts examples/pixi-minimal/src/fixture.test.ts
pnpm check
pnpm install --frozen-lockfile --offline --reporter=append-only
```

- Focused builder gate: 4 tests passed; the combined focused run passed 2 files and 8 tests.
- Full gate: ESLint, strict TypeScript, and 15 test files with 47 tests passed.
- Frozen offline install passed for all 11 workspace projects.
- Two independent in-memory builds produced identical JavaScript, stylesheet, source hash, emitted filenames, and emitted asset hashes.
- Tests prove one JS bundle, bundled Pixi code, three emitted binary/text assets, four declared assets, stable invalid-project failure, and zero output-directory mutation.

## WHAT FAILED

- The first focused run exposed an invalid TypeScript `readonly Array` form; it was corrected to `ReadonlyArray`.
- The first successful bundle classified esbuild file-loader references as runtime imports. The gate now permits only esbuild `file-loader` output edges while still rejecting retained module imports.
- Path comparison initially retained a URL-derived trailing separator; the test now compares resolved paths.
- The first full gate found a type-only import and then an unsupported Vitest matcher type argument. Both static test issues were corrected.

All corrected focused, full, and frozen-install gates pass.

## CURRENT EXACT STATE

```text
input: validated sfhs.project@1
plan: frozen sfhs.build-plan@1
output: frozen sfhs.intermediate@1 in memory
JavaScript: one bundled browser IIFE
CSS: transformed and normalized
assets: declared and emitted bytes with media type and SHA-256
source identity: canonical authored-source SHA-256
filesystem output: none
```

## REMAINING BLOCKERS

- No HTML parser or packer inlines the intermediate JS, CSS, or emitted asset URLs.
- No `dist/index.html` or `sfhs.artifact@1` descriptor exists.
- External-reference scanning, determinism across clean directories, browser testing, and release evidence remain unimplemented.

## NEXT ACTIONABLE STEP

Assign `SFHS-003B - One-file HTML packer` as the next bounded card.

## EVIDENCE

Failure-mode audit:

| Mode | Guard in this card |
|---|---|
| A - deliverable drift | Builder returns an intermediate object and cannot claim or write the release artifact. |
| B - external dependency leak | The bundle rejects retained runtime imports; assets are explicit file-loader outputs. |
| G - source/artifact confusion | Authored source hash and intermediate outputs are separate fields. |
| N - nondeterministic build | Repeated builds compare JS, CSS, source hash, names, and asset hashes. |
| Q - proofless success | Focused, full, and frozen-install gates are recorded. |
| T - AI overreach | Packer, verifier, browser, plugin, Hermes, SNC, remote, and release scope were not added. |

## GITHUB PAGES URL

Not applicable. No remote, deployment, or generated release artifact exists.

## VERDICT

PASS
