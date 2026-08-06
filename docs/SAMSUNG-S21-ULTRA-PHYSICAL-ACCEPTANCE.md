# Samsung Galaxy S21 Ultra Physical Acceptance

This run is the primary SFHS runtime acceptance gate. Browser emulation, responsive mode, and screenshots from a desktop browser are supporting evidence only.

## Preconditions

- Use the exact packed `dist/index.html` bytes already accepted by static verification and record their SHA-256 and build ID.
- Use a physical Samsung Galaxy S21 Ultra whose exact model identifier begins with `SM-G998`.
- Use stable Android Chrome. Record the Android and four-part Chrome versions shown by the device.
- Do not edit the packed artifact for the device run.

## Required run

In both portrait and landscape, run the adapter-owned product checklist and:

1. Open the exact artifact. Confirm WebGL capability for `pixi-v8`; record
   WebGL as `not-required` for `dom-canvas-fabric`.
2. Exercise the smallest meaningful user-gesture interaction.
3. Confirm the adapter-owned runtime or editor diagnostics reach their ready
   state and that primary touch interactions work.
4. Rotate or resize and confirm the canvas, HUD, and touch controls remain usable without overlap or horizontal overflow.
5. Confirm there is no unexpected runtime network request, page error, or console error.
6. Record `window.innerWidth`, `window.innerHeight`, and `window.devicePixelRatio` and save one semantically reviewable screenshot.

## Evidence record

Create a run-contained JSON record conforming to `packages/contracts/schemas/sfhs.device-acceptance.schema.json`, then call `validatePhysicalDeviceAcceptanceManifest` (or the CLI command added by the CLI phase).

The record must contain:

- exact artifact path, SHA-256, and build ID;
- `physical: true`;
- exact `SM-G998*` model identifier;
- Android and Chrome versions;
- WebGL capability result and renderer string when required; use
  `not-required` for Canvas 2D projects;
- portrait and landscape viewport width, height, DPR, screenshot path, and status;
- one final verdict.

The validator fails emulation with `SFHS_DEVICE_NOT_PHYSICAL`, the wrong model
with `SFHS_DEVICE_MODEL_UNSUPPORTED`, explicitly unsupported WebGL with
`SFHS_DEVICE_WEBGL_UNSUPPORTED`, and any nonpassing orientation/verdict with
`SFHS_DEVICE_ACCEPTANCE_FAILED`. Release preparation additionally requires
`supported` WebGL when the selected adapter is `pixi-v8`.

## Current state

`BLOCKED_ON_PHYSICAL_DEVICE` — no physical-device record is checked in or claimed yet.
