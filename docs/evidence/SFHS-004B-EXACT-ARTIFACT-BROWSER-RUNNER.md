# SFHS-004B - Exact-Artifact Browser Runner

**Date:** 2026-07-20

**Status:** PASS

**Base commit:** `6114b21`

## WHAT WAS DONE

- Pinned Playwright 1.61.1 and installed its matching Chromium runtime.
- Added a localhost-only server that serves the exact verified bytes at one path and returns 404 for every sidecar path.
- Added `sfhs.browser-smoke@1` with artifact identity, browser/runtime profile, requests, console records, snapshot, and stable findings.
- Refused browser launch unless exact static verification passes first.
- Bound the browser response body back to the artifact SHA-256.
- Blocked and failed unexpected HTTP, WebSocket, service-worker, and other runtime requests.
- Audited console errors, unexpected warnings, page errors, responses, dialogs, WebGL capability, running phase, audio unlock, ticks, and runtime self-check.
- Added an explicit `pnpm browser-smoke` entrypoint and CI Chromium installation/smoke step.
- Cached the Pixi WebGL capability probe to prevent repeated probe contexts.
- Made HUD phase changes bypass tick throttling so visible state agrees with runtime state immediately.
- Extended source/build identity with deterministic intermediate JavaScript and CSS so adapter/dependency changes cannot retain a stale build ID.

## WHAT WAS VERIFIED

```text
SFHS_RUN_BROWSER_TESTS=1 pnpm exec vitest run adapters/pixi-v8/src/index.test.ts packages/browser-runner/src/index.test.ts
SFHS_BROWSER_REPORT=.sfhs-browser/004B/report.json SFHS_BROWSER_SCREENSHOT=.sfhs-browser/004B/running.png pnpm browser-smoke
pnpm check
pnpm install --frozen-lockfile --offline --reporter=append-only
```

- Focused adapter/browser gate passed 2 files and 7 tests with the real browser test enabled.
- Full gate passed ESLint, strict TypeScript, and 16 files with 93 tests; the separately executed browser integration appears as one intentional skip in the ordinary unit run.
- Frozen offline install passed for all 11 workspace projects.
- Playwright Chromium 149.0.7827.55 entered `running`, advanced ticks, unlocked embedded audio to `ready`, and passed the complete runtime self-check.
- The request audit contained exactly one GET document request and no runtime external request.
- The browser response matched the exact 572,432-byte artifact with SHA-256 `5a2a0e5eaabe230f8c69480ad90e5b469262397d92c138e3ea6d1099cd280724`.
- The effective source SHA-256 is `509825091c27ec1d1c4cc5758d04a2363c316cd28e1fb202c81e661a9d4fbb25`; build ID is `pixi-minimal-509825091c27`.
- Desktop smoke profile: 1440x900, DPR 1, landscape, headless Chromium on Windows x64.
- Visible in-app browser inspection after rebuilding and reloading confirmed `running`, tick `1`, audio `ready`, and a rendered Pixi canvas.
- The retained screenshot shows the rendered player, target, HUD, controls, and updated running phase.

## WHAT FAILED

- The first strict browser run treated known headless Chromium WebGL readback messages and controlled teardown warnings as application failures. Driver messages remain in the console evidence, while controlled teardown occurs outside the audit window.
- A temporary attempt to reuse the WebGL probe canvas for Pixi ownership stalled initialization and was reverted. Pixi retains sole renderer-canvas ownership.
- Visible review found a transient stale HUD (`ready / 0`) after runtime startup. Phase transitions now update immediately, and the corrected screenshot shows `running / 1`.
- Artifact SHA changed while the old source/build ID remained constant, revealing that local adapter/dependency output was absent from source identity. Deterministic intermediate JS/CSS now participates in that identity.

All corrected focused, full, frozen-install, exact-browser, request-audit, self-check, and visible-state gates pass.

## CURRENT EXACT STATE

```text
browser runner: Playwright 1.61.1
browser: Chromium 149.0.7827.55
artifact serving: exact bytes, localhost only, one allowed path
request audit: one document request, zero unexpected requests
runtime: running, ticks advancing, audio ready
self-check: PASS
console findings: zero unexpected; known headless WebGL driver messages retained as records
page/dialog/response findings: zero
screenshot: .sfhs-browser/004B/running.png (ignored run-contained evidence)
```

## REMAINING BLOCKERS

- Keyboard, pointer, resize/orientation, visibility lifecycle, context-loss, and `file://` scenarios are not yet in the browser matrix.
- Screenshot semantic review is not yet automated across desktop, emulated Samsung portrait, and emulated Samsung landscape profiles.
- Physical Samsung Galaxy S21 Ultra acceptance remains outstanding; emulation cannot replace it.
- Cross-platform CI remains implemented but unexecuted because there is no remote.

## NEXT ACTIONABLE STEP

Assign `SFHS-004C - Pixi browser scenarios and screenshots` as the next bounded card.

## EVIDENCE

| Failure mode | Guard in this card |
|---|---|
| Source/artifact confusion | Static verification precedes launch and browser response bytes are SHA-bound. |
| External dependency leak | Route interception blocks and reports every unexpected request or connection. |
| False browser success | WebGL, running phase, advancing ticks, audio, and runtime self-check must all pass. |
| Visual/runtime disagreement | Visible browser reload and screenshot review caught and corrected stale HUD phase. |
| Stale build identity | Effective intermediate JS/CSS now participates in source SHA-256 and build ID. |
| Proofless success | Focused real-browser, full, frozen-install, JSON report, exact hash, and screenshot evidence are recorded. |
| AI overreach | No physical-device claim, remote, plugin, Hermes, SNC, publication, or release action occurred. |

## GITHUB PAGES URL

Not applicable. No remote or deployment exists.

## VERDICT

PASS
