# BlockFolk Classic Valley 001

## Outcome

- Added **Classic BlockFolk Valley** to World & Locations as a second selectable canvas.
- It is the exact pre-existing original Imaginarium file, copied byte-for-byte to the isolated BlockFolk product: PNG, `1448 × 1086`, `2,614,001` bytes, SHA-256 `72cc98a59b8d4e123f720a84aa1782a3e7928d0697c54f28244562f5683088eb`.
- The canvas is contained, not scaled non-uniformly or cropped, within the existing `4096 × 4096` logical space. Neutral top and bottom letterbox space is deliberate; all stickers and the camera retain their world coordinates when switching worlds.
- The existing large production Valley remains byte-identical: WebP SHA-256 `25b795d7b9914b56bd2dfb4a444594f63f4146d8490dd0127850b749b4a2c25c`.

## Sharpening assessment

- The existing production master was already made with the recorded deterministic NVIDIA RTX Video Super Resolution ULTRA workflow (ComfyUI `0.28.3`, `comfyui_nvidia_rtx_nodes` `0.1.3`, `RTXVideoSuperResolution`, VFX SDK `1.2`, RTX 4080 Super). It is a non-generative exact 4096 output from the approved 1280 source.
- The browser pipeline has a `2×` backing canvas on the tested phone viewport and high-quality image smoothing; the focused render diagnosis confirms it draws the native `4096 × 4096` background rather than enlarging a low-resolution intermediate canvas.
- No active local ComfyUI/NVIDIA installation or model cache was available to run a new candidate, and no new tools, nodes, or models were installed. Re-running super-resolution over an already-upscaled image is not expected to recover source detail and risks introducing artifacts. Therefore the accepted large map has not been sharpened, recompressed, replaced, or otherwise changed.

## Verification

- Focused source and static audit: PASS.
- Background render-resolution diagnosis: PASS (`760 × 1084` backing canvas for `380 × 542` CSS viewport, native production image `4096 × 4096`, high-quality smoothing).
- Packed audit: PASS; the file contains the isolated production WebP, the exact Classic PNG, the 30 accepted PNG stickers, six categories, and no external runtime resources.
- Chromium 400 × 844 and 844 × 400: PASS; both worlds are selectable, Classic has natural dimensions `1448 × 1086` and is positioned at world `0, 512`, camera/stickers are preserved, and there were zero console errors, page errors, or unexpected network requests.
- SFHS inspect, validate, test, pack, and verify: PASS.
- Two clean packs are byte-identical.
- Original Imaginarium tracked files and Ueye: unchanged.

## Current local artifact

- Path: `dist/index.html`
- Build ID: `blockfolk-imaginarium-37afc3a3abe4`
- Size: `12,271,251` bytes
- SHA-256: `9a7eaf22ef0f69e6f925d39181e5bc956c1c4d081c6584be6cde3c155f98682b`

## GitHub Pages publication

- Feature commit: `e674996c4ea2ef73c2d5a642f449de3a4998f125` on `feature/blockfolk-imaginarium-001`.
- Dedicated Pages commit: `71b7c6dbf4c6492c6eb5db74330eb64a66ff22e9`, changing only `blockfolk-imaginarium/index.html`.
- Live cache-busted URL: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=71b7c6d`
- Live Chromium proof at `400 × 844` and `844 × 400`: PASS, zero console errors, page errors, or unexpected network requests. The HTTPS download is exactly `12,271,251` bytes with SHA-256 `9a7eaf22ef0f69e6f925d39181e5bc956c1c4d081c6584be6cde3c155f98682b`.

## Remaining acceptance

Physical-phone acceptance is still needed for visual preference and for any decision to pursue a new NVIDIA sharpening candidate after a local ComfyUI installation is made available. The approved remote publication changed only the BlockFolk feature branch and its dedicated Pages subpath.
