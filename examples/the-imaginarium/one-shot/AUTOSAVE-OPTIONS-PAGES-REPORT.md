# Auto-save Options and Pages Guard Report

## WHAT WAS DONE

- Replaced the fixed 550 ms audible background save with three persisted grown-up choices: Quick (1 second), Relaxed (4 seconds), and Only when leaving.
- Made Relaxed the safe default for new and previously unconfigured devices; invalid stored values also recover to Relaxed.
- Routed timed background saves through the existing quiet save path while retaining explicit Done success feedback and quiet navigation/visibility safety saves.
- Integrated the three choices through the shared tactile control layer with native radio semantics, stable hit regions, selected depth, and warm Imaginarium palettes.
- Rebuilt, exact-verified, repeat-built, browser-tested, and published the one-file artifact to the existing GitHub Pages branch.

## WHAT WAS VERIFIED

- Focused source scenarios and offline/static audit: PASS.
- SFHS inspect, validate, proportional check, pack, and exact verify: PASS.
- Repository lint, typecheck, all 315 tests, and One-Shot validation: PASS; 2 unrelated tests remain skipped.
- Determinism: PASS; two isolated Windows builds are byte-identical.
- Local Chromium at 390x844: radio semantics, Relaxed default, selected-depth visuals, persistence across reload, leaving-mode no-timer behavior, one-second Quick cadence, four-second Relaxed cadence, Done/gallery workflow, and zero console warnings/errors.
- Live Pages at 390x844: boot, all three choices, Relaxed default, and zero console warnings/errors.
- Downloaded live artifact: 603,350 bytes and SHA-256 `88ceabc083a0f1016cd8cd84fed98e863d1df0499a2a02fb945b01c0d4040ced`, exactly matching the canonical artifact.

## WHAT FAILED

- The first isolated offline repeat build could not find lockfile-pinned packages in the local pnpm store. The supported retry completed and both builds matched exactly.
- GitHub's unauthenticated Pages-build API returned 404, so deployment completion was established by exact byte/hash verification of the public Pages response.
- Physical Samsung testing remains waived by the user for this deployment; no new physical verdict is claimed.

## CURRENT EXACT STATE

- Build ID: `the-imaginarium-e46b91f7926c`
- Artifact bytes: 603,350
- Artifact SHA-256: `88ceabc083a0f1016cd8cd84fed98e863d1df0499a2a02fb945b01c0d4040ced`
- Source SHA-256: `e46b91f7926cf9af99c34785ccf31999b12ff7a2ce5b56b3420ede7d8c246cd8`
- Pages commit: `0585c326bc7a2f5ac6f34a336be6013a6dfa7427`
- Exact verification: PASS.

## REMAINING BLOCKERS

None for the user-authorized GitHub Pages deployment. Physical Samsung acceptance remains explicitly waived and is not claimed.

## NEXT ACTIONABLE STEP

Use the live build and choose an auto-save cadence in Grown-Up Tools if Relaxed is not preferred.

## EVIDENCE

- `test-results/autosave-options/index.before-autosave-options.html`
- `test-results/autosave-options/determinism.json`
- `test-results/autosave-options/browser-evidence.json`

## GITHUB PAGES URL

`https://falloutmule.github.io/single-file-html-software/?v=0585c32`

## Failure-mode audit

- A Deliverable drift: guarded; Pages serves one `index.html`.
- B External dependency leak: guarded by static audit and exact verifier.
- C Inline handler/eval creep: guarded by static audit.
- D Logic entropy: guarded by focused and full repository tests.
- F Save schema corruption: preference data stays in its existing isolated key; missing/invalid mode values recover safely.
- N Control layout drift: guarded by phone-sized local and live visual inspection.
- P Menu/input trap: Grown-Up Tools entry/exit and editor return workflows pass.
- Q Proofless success: guarded by cadence measurements, deterministic builds, exact hash, and live smoke.
- R Repo-root clutter: generated evidence remains below ignored project `test-results`.
- S Private data leak: Pages contains only the exact verified HTML artifact.
- T AI overreach: changes are limited to auto-save policy, controls, tests, records, and requested Pages publication.
- E, G, H, I, J, K, L, M, O: N/A; no render, harness, viewport, canvas, gesture, pointer-ownership, or custom-layout contract changed.

## RESULT

PASS
