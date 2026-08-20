# BlockFolk Snapping Overhaul — Phase 2 Report

Status: **PASS — calibration only; not production-enabled**

## Commits and boundary

- Starting feature HEAD: `ec6daa51e5258603c78c3c0edb869ff5a6a9b1b5`
- Phase 2 implementation: `b2788d8a0476ba41f3f0a8da7982c1c1e1e04411`
- Production runtime: unchanged page@3 compatibility engine
- Typed Brick/Log profiles: `productionEnabled: false`
- Pages: not changed; the accepted Phase 1 artifact remains live

## Calibration result

- Canonical world extent: `420 / 1.1^10 = 161.928181560403` world units.
- Brick: 273 × 325; alpha `(25,25)–(247,300)`; origin `(136.5,163)`; scale `161.928181560403 / 325`.
- Log: 274 × 326; alpha `(24,24)–(249,301)`; origin `(136.5,163)`; scale `161.928181560403 / 326`.
- Reviewed candidate column vector: `(55.6,32.1)` world units.
- Reviewed candidate tier vector: `(0,-73.1)` world units.
- Supported scope: one frontal isometric wall axis plus vertical tiers; Flip maps `wall-iso-a` to `wall-iso-b`; free rotation is unsupported in v1 construction.
- Per-block ports: `cellMount`, `wallLeft`, `wallRight`, `stackTop`, `stackBase`, and capacity-one `wallFace`.
- Window receivers and door structural receivers are separate: windows target `wallFace`; doors target `cellMount`.

The first `(54.3,36.4)` column candidate was rejected during rendered review because it was steeper than the accepted art's approximately 111–112.5 × 64–65 source-pixel top-diamond basis. This proves the harness is not merely approving its initial constants.

The narrow light edge visible between constructed cells is baked into the accepted transparent sticker artwork. It is not a coordinate seam or a modified asset.

## Asset identity

- Brick PNG SHA-256: `78e300db4efd5efe04e602a7c130f92425b24af168647e988a21d8223140f2f2`
- Log PNG SHA-256: `0f6952ca91637e812e7066f59ec0e153d368c6d80500cdad577f66e27e331d43`
- No image, background, category, catalog, controller, persistence, or production runtime file changed.

## Evidence

- `art/evidence/snapping-calibration-phase2/brick-block-calibration-portrait.png` — `cd317075fe8d3d56688e26667bc890f4092adbab8cda7a2ba105d15902ca1bda`
- `art/evidence/snapping-calibration-phase2/brick-block-calibration-landscape.png` — `0f08b2392aebd5312a9dd6d79e256b9f8e1f4603b2c5aa2d1da293678220bd82`
- `art/evidence/snapping-calibration-phase2/log-block-calibration-portrait.png` — `7d390023bff7a7f04c95caa96bc667d6fddede69d5e7ac7f0e5b04f3d8f06af`
- `art/evidence/snapping-calibration-phase2/log-block-calibration-landscape.png` — `006f8274cfdd7a693e96d31ae77b05bc469aa9d24a00b8c1a3253e0aca46bd7b`

All four were visually inspected. Both PNG alpha measurements match their independent fixtures, adjacent cells follow one isometric diamond, tiers remain vertical, wall-face receivers remain distinct, and Flip changes planes without changing asset pixels.

## Verification

- `test:snap-core`: PASS; 14 renderer-neutral profiles, 2 calibrated candidate assets, 6 ports each, zero production-enabled profiles.
- `test:snap-calibration`: PASS at 400 × 844 and 844 × 400; four screenshots, zero page errors, zero console errors, zero unexpected external requests.
- Focused BlockFolk source/static tests: PASS.
- Lint: PASS.
- Typecheck: PASS.
- Repository tests: PASS — 46 files, 316 passed, 2 documented skips.
- One-Shot validation: PASS.

## Integrity and remaining gate

Original Imaginarium, Ueye, both Valley backgrounds, all 30 stickers, native emoji, existing BlockFolk saves, page@3 connections, and the permanent `snap-context` controller remain unchanged. The next pilot must still prove actual production insertion, one-edge transactions, component editing, and physical Samsung behavior before the typed engine can be considered accepted.
