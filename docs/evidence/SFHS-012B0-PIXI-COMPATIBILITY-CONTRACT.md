# SFHS-012B0 - Pixi compatibility contract and conformance harness

## Goal

Define the bounded Pixi compatibility contract required by the 31 verified HOMEOSTASIS production Canvas2D operations, without creating a Canvas-to-Pixi renderer.

## Allowed files

- `packages/pixi-canvas-compat-contract/**`
- `docs/evidence/SFHS-012B0-PIXI-COMPATIBILITY-CONTRACT.md`
- `docs/evidence/sfhs-012b0/**`
- `pnpm-lock.yaml`

The HOMEOSTASIS source, preserved artifacts, Pages checkout, renderer-classifier, Pixi runtime, SNC, remotes, and publication configuration were forbidden and unchanged.

## What was done

- Added the typed `@sfhs/pixi-canvas-compat-contract` package. It declares the exact 31-operation surface from the authoritative 012A capability matrix, the only approved mapping direction, state/command conformance checks, and an explicit unsupported-operation list.
- Added a fail-closed conformance evaluator. `CONTRACT_ONLY` evidence can only return `CONTRACT_READY`; a future implementation candidate must provide one successful semantic/state/screenshot record for every exact operation and scene-specific measurements for every approximation. Missing, duplicate, unrecognized, or drifting evidence blocks.
- Added a deterministic machine-readable contract at `docs/evidence/sfhs-012b0/compatibility-contract.json`.
- Added unit fixtures that prove exact coverage, contract-only honesty, a synthetic in-tolerance future packet, and fail-closed missing/duplicate/approximation-drift behavior.

## Approximation register

| Canvas operation | Exact Canvas behavior | Proposed Pixi behavior | Expected visual difference | Affected scenes | Required parity tolerance |
| --- | --- | --- | --- | --- | --- |
| `createLinearGradient` | Current-user-space start/end axis and ordered color stops. | Cached, content-addressed gradient texture or approved shader with matching transform and alpha. | Interpolation and stop-edge anti-aliasing can vary. Geometry, stop order, alpha, and axis cannot. | `title` | Mean RGBA delta <= 2; per-channel <= 12; outliers <= 0.5%; stop position <= 0.5 logical px; alpha exact. |
| `createRadialGradient` | Current-user-space two-circle radial interpolation and ordered stops. | Cached radial texture or approved shader with matching circles, transform, clipping, and alpha. | Subpixel circle coverage/interpolation can vary. Center, radii, opacity, and extent cannot. | All 13 verified scenes | Mean RGBA delta <= 3; per-channel <= 16; outliers <= 1%; center/stop position <= 0.5 logical px; alpha exact. |
| `fillText` | Paints the 23-character victory-result string using current transformed origin, fill, alpha, font, and alignment. | Pixi Text with equivalent content, fill, alpha, transform, and baseline. | Hinting, kerning, and anti-aliasing can vary. Meaning, bounds, baseline, and contrast cannot. | `victory-result` | Text-content hash exact; glyph bounds <= 1 logical px; baseline <= 1 logical px; contrast >= 4.5:1. |
| `font` | Applies `700 16px system-ui` to that victory-result path. | Pixi Text style: 700 weight, 16 logical px, SFHS-approved system/packaged fallback only. | Glyph rasterization can vary slightly. Weight, size, bounds, baseline, and contrast cannot. | `victory-result` | Text-content hash exact; glyph bounds <= 1 logical px; baseline <= 1 logical px; contrast >= 4.5:1. |
| `textAlign` | Sets Canvas text alignment to `center` for the victory result. | Pixi Text horizontal anchor 0.5 at the equivalent transformed origin. | No meaningful alignment drift is allowed; only fractional glyph rasterization can differ. | `victory-result` | Center anchor <= 0.5 logical px; alignment must be `center`; controls must remain uncovered. |

The tolerances are reliable automated measurements: deterministic reference/Pixi screenshots for gradients, geometry and alpha-region probes, plus text-content hash, glyph bounds, baseline, contrast, anchor, and hit-test probes for the only text scene. No approximation is accepted by this contract if it changes gameplay readability, visual meaning, or control availability.

## What was verified

- **verified:** the contract contains exactly the 31 `productionObserved` operations from `homeostasis-capabilities.json`: 26 `EXACT` and 5 `APPROXIMATION`.
- **verified:** the five approximation profiles include Canvas behavior, proposed Pixi behavior, expected difference, scene coverage, required parity tolerance, required checks, and the blocking verdict.
- **verified:** exact paths require semantic command order, balanced state stack, and scene screenshot evidence. The observed blend mapping is limited to `multiply`; unobserved Canvas APIs are not silently admitted.
- **verified:** contract-only evidence returns `CONTRACT_READY`, never `CONFORMANCE_PASS`.
- **verified:** a candidate packet missing coverage, duplicating a record, or exceeding the radial-gradient tolerance is blocked.

## What failed

No contract or harness requirement failed. There is intentionally no Pixi renderer conformance result because SFHS-012B1 and later implementation cards are not authorized.

## Current exact state

The contract is ready for review, but has no renderer implementation, no compatibility context, no HOMEOSTASIS presentation, and no release implication.

- Contract status: `CONTRACT_READY`
- Future implementation conformance: `NOT_STARTED`
- HOMEOSTASIS primary presentation: Canvas2D
- Renderer integration: `BLOCKED_ON_ADAPTER_MISMATCH`
- Physical Samsung: `BLOCKED_ON_PHYSICAL_SAMSUNG`
- Final release: `BLOCKED`

## Remaining blockers

- SFHS-012B1 must implement command buffering and state-stack behavior before any exact-operation result can be earned.
- Gradient/text screenshot, geometry, contrast, and hit-test evidence must be collected from a real Pixi implementation; this contract does not pre-approve an unmeasured renderer.
- HOMEOSTASIS migration, physical-device testing, source publication, and release work remain outside this card.

## Next actionable step

Review this contract, then explicitly authorize SFHS-012B1 only if the command-buffer/state-stack implementation scope is acceptable.

## Branch and commit

- Worktree: `C:\tmp\sfhs-012b0-compatibility-contract`
- Branch: `codex/sfhs-012b0-compatibility-contract`
- Base: `b53387a5b95ddb66045febf661e41be45ffd9d1d`

## Commands and results

- `pnpm install --lockfile-only --offline` - PASS
- `pnpm install --frozen-lockfile --offline` - PASS
- `pnpm run typecheck` - PASS
- scoped ESLint - PASS
- `pnpm vitest run packages/pixi-canvas-compat-contract/src/index.test.ts` - PASS, 6 tests
- contract-evidence generator and JSON parse - PASS

## Evidence paths

- [Machine-readable contract](sfhs-012b0/compatibility-contract.json)
- [Authoritative 012A capability matrix](sfhs-012a/homeostasis-capabilities.json)

## Hashes

- Authoritative 012A capability matrix: `dc703c95f7028ec2104f103013de423ae376491e9e026395116bdbb86702d39a`
- Generated 012B0 compatibility contract: `d50338c73f22ceb2f25ddeddf87f71058bb68db7e24aa04cc4d46211f3f03894`

## Verdict

- SFHS-012B0: `AUTOMATED_PASS`
- Contract: `CONTRACT_READY`
- Pixi compatibility implementation: `NOT_STARTED`
- HOMEOSTASIS Pixi presentation: `NOT_STARTED`
- Final release: `BLOCKED`
