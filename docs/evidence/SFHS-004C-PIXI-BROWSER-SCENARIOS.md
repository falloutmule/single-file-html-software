# SFHS-004C - Pixi Browser Scenarios and Screenshots

**Date:** 2026-07-20

**Status:** PASS (automated and emulated coverage only)

**Base commit:** `dd35c66`

## WHAT WAS DONE

- Added a Playwright scenario matrix that begins with the exact-artifact static and browser smoke gates.
- Covered embedded boot assets and audio, fixed-step visibility lifecycle, keyboard input, pointer input, target activation, portrait resize, landscape resize, `file://`, and classified WebGL context loss.
- Added desktop Chromium and Samsung Galaxy S21 Ultra portrait/landscape emulation screenshots.
- Recorded viewport size, device-pixel ratio, and capped Pixi runtime resolution for every screenshot profile.
- Kept emulation labels explicit. These captures do not claim a physical Samsung device result.
- Fixed a lifecycle defect found by the scenarios: the runtime now passes its action source into each fixed simulation step.
- Added a focused regression proving lifecycle-owned action sampling.
- Added a compact running-state landscape layout so the live canvas, complete HUD, and all touch controls fit at 854x384 without overlap or clipping.
- Added a CI scenario entrypoint and run-contained screenshot/report upload.

## WHAT WAS VERIFIED

```text
SFHS_BROWSER_EVIDENCE=.sfhs-browser/004C pnpm browser-scenarios
SFHS_RUN_BROWSER_TESTS=1 pnpm exec vitest run examples/pixi-minimal/src/runtime.test.ts packages/browser-runner/src/pixi-scenarios.test.ts packages/browser-runner/src/index.test.ts
pnpm check
pnpm install --frozen-lockfile --offline
pnpm determinism
git diff --check
```

- All nine browser scenarios passed in Playwright Chromium 149.0.7827.55.
- Focused real-browser and lifecycle coverage passed 3 files and 11 tests.
- The full ordinary gate passed ESLint, strict TypeScript, and 17 files with 95 passing tests and 2 intentional browser skips.
- Frozen offline install passed for all 11 workspace projects.
- Two isolated clean builds were byte-identical and produced identical source, build, and artifact hashes.
- The exact browser smoke requested only the document under test. Unexpected requests and page errors were empty.
- `file://` reached the running phase with embedded audio ready and no external request.
- Visibility pause/resume did not accumulate hidden catch-up work.
- Real keyboard and pointer actions moved the simulation, and pointer target activation incremented the activation counter.
- A supported `WEBGL_lose_context` event was observed and classified without making a recovery claim.
- Portrait emulation used 384x854 at DPR 3.75; landscape emulation used 854x384 at DPR 3.75. Pixi runtime resolution was capped at 2 in both.
- Semantic review confirmed the portrait UI has safe padding and no horizontal overflow. The corrected landscape UI contains the live canvas, six HUD fields, and four touch controls without overlap or clipping.

## CURRENT EXACT ARTIFACT

```text
artifact: examples/pixi-minimal/dist/index.html
bytes: 573358
sha256: 6d2a8e9c3c28d4576e7ad22cb9a1e18bc6e36eb537b3764a9017f3bf3cda8416
source sha256: f0f9aa3feaf95e288bb2b227630fa2a37fa30172a82c4503da73faf4853452b7
build ID: pixi-minimal-f0f9aa3feaf9
unexpected requests: 0
page errors: 0
```

Run-contained ignored evidence:

```text
.sfhs-browser/004C/report.json
.sfhs-browser/004C/desktop-running.png
.sfhs-browser/004C/samsung-s21-ultra-portrait.png
.sfhs-browser/004C/samsung-s21-ultra-landscape.png
```

## WHAT FAILED AND WAS CORRECTED

- The first input scenarios timed out even though ticks advanced. The lifecycle owned an action source but did not pass it into the fixed-step transition. The source is now sampled by the lifecycle and protected by a regression test.
- The first 854x384 screenshot had touch controls overlapping the HUD and clipped lower content. The running-state compact landscape grid now removes nonessential prose and gives the canvas, HUD, and controls non-overlapping regions.
- Known headless Chromium WebGL context-probe and readback driver warnings remain retained console records. They are not application findings; no unexpected console finding passed silently.

## REMAINING BLOCKERS

- Physical-device acceptance is still required on a Samsung Galaxy S21 Ultra in portrait and landscape. It must record the exact `SM-G998*` model, Android version, Chrome version, viewport, DPR, orientation, and WebGL capability result.
- Emulation is supporting evidence only and cannot satisfy or waive the physical-device gate.
- Cross-platform CI is implemented but cannot be claimed as executed while this standalone repository has no remote.

## NEXT ACTIONABLE STEP

Assign `SFHS-004D - Negative artifact fixtures and physical-device evidence contract` as the next bounded card.

## EVIDENCE

| Failure mode | Guard in this card |
|---|---|
| Browser tests drift from release bytes | Every scenario begins from statically verified exact packed bytes and reports their SHA-256. |
| Input facade exists but is disconnected | Real keyboard/pointer scenarios and a lifecycle action-source regression prove simulation movement. |
| Mobile screenshot is merely nonblank | Portrait and landscape captures received semantic layout review; the first defective landscape layout failed review and was fixed. |
| Emulation is misrepresented as hardware | Profile IDs and this verdict explicitly say emulation; physical acceptance remains blocked. |
| Hidden runtime dependency | Network interception, request audit, `file://`, and page-error audit fail closed. |
| False context-loss promise | The suite classifies event delivery only and does not claim renderer recovery. |
| AI overreach | No physical-device claim, remote, plugin, Hermes, SNC, publication, or release action occurred. |

## VERDICT

PASS for SFHS-004C automated browser and emulated visual scope. Physical Samsung Galaxy S21 Ultra acceptance remains outstanding.
