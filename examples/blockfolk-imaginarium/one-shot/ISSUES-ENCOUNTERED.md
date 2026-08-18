# Issues Encountered

## BFV-001 — NVIDIA node dependency missing

- Phase: preflight
- Status: `RESOLVED`
- Severity: blocking
- Observed: ComfyUI logged `IMPORT FAILED` for `Nvidia_RTX_Nodes_ComfyUI`; `nvvfx` was absent.
- Expected: live `RTXVideoSuperResolution` node.
- Resolution: with explicit user approval, installed only `nvidia-vfx` 0.1.0.1 from NVIDIA's package index and restarted the localhost ComfyUI server.
- Verification: `/object_info/RTXVideoSuperResolution` now reports exact-size and ULTRA-quality inputs.

## BFV-002 — Initial PyPI stub installation failed

- Phase: preflight
- Status: `RESOLVED`
- Severity: blocking
- Observed: the source stub could not import `wheel_stub.buildapi`.
- Resolution: used the node repository's documented prebuilt-wheel route from NVIDIA's index; no pip upgrade or unrelated package was installed.

## BFP-001 — Packed audit expected a constructed full sticker ID literal

- Phase: packed verification
- Status: `RESOLVED`
- Severity: non-product test failure
- Observed: the audit searched for `sticker-blockfolk-wolf`, while the packer retained the prefix and ID token separately.
- Expected: prove the restored catalog and exact PNG payloads are present without depending on bundler string concatenation.
- Resolution: require the BlockFolk ID prefix and representative catalog tokens, then decode all 30 packed PNG payloads and compare their SHA-256 set with the 30 accepted source files.
- Verification: packed audit passes with exactly 30 matching PNGs, one matching WebP, and no JPEG payload.

## BFP-002 — Isolated determinism install lacked one offline tarball

- Phase: determinism
- Status: `RESOLVED`
- Severity: environment-only
- Observed: the first `--offline` run lacked the cached `@eslint/js` tarball; the initial online retry was blocked by the filesystem/network sandbox.
- Expected: two clean isolated builds from the same tracked and untracked source set.
- Resolution: reran the official harness with the approved network boundary and a process-local Git safe-directory setting. No dependency version or lockfile changed.
- Verification: builds A and B are byte-identical at 8,769,364 bytes and SHA-256 `8b830d36cee776cf74512f1e31b624e0615fa2a6cefb3c648ea1a92a40850de3`.

## BFP-003 — Initial Pages read preceded propagation

- Phase: live verification
- Status: `RESOLVED`
- Severity: environment-only
- Observed: the first HTTPS read of the newly added BlockFolk subpath returned 404 immediately after the Pages push.
- Expected: GitHub Pages serves the exact accepted artifact without changing the root route.
- Resolution: allowed normal Pages propagation, then downloaded and exercised the unmodified route.
- Verification: the live response is 8,769,364 bytes with SHA-256 `8b830d36cee776cf74512f1e31b624e0615fa2a6cefb3c648ea1a92a40850de3`; portrait and landscape Chromium pass with zero console errors, page errors, or unexpected requests, and the Pages root remains byte-identical.

## BFC-001 — Construction layer action was not observable enough

- Phase: construction pass
- Status: `RESOLVED`
- Observed: the previous individual-object canvas operation provided no feedback at layer boundaries and could not keep a connected construction contiguous.
- Resolution: reorder selected connected components one adjacent group at a time, preserve their internal ordering, and provide non-blocking movement/boundary feedback. A three-sticker rendered PNG and stored-order scenario proves the result.

## BFC-002 — Map softness required a rendering/asset split diagnosis

- Phase: construction pass
- Status: `RESOLVED FOR RENDERING; ASSET REPLACEMENT NOT AUTHORIZED`
- Observed: the physical phone perceived the accepted Valley as softer than stickers.
- Resolution: inspect the source, shipping asset, high-DPI canvas backing, smoothing, in-app canvas crop, and browser crop. Enforce high-quality Retina canvas rendering and retain a labeled comparison only. No production map byte changed and no ComfyUI dependency was installed.
