# BlockFolk Imaginarium Valley Integration Report

## Outcome

PASS — the user-approved BlockFolk Valley is now the sole built-in world. The exact revised 1280 × 1280 JPEG authority is archived, its deterministic NVIDIA VSR result is retained as a 4096 × 4096 lossless master, and one optimized 4096 × 4096 WebP is embedded in the offline artifact. The former debug world and all alternate-background payloads are absent. No sticker art was produced or imported.

## Repository state

- Repository: `falloutmule/single-file-html-software`
- Worktree: `C:\Users\fallo\Documents\Single-File-Html\.worktrees\blockfolk-imaginarium-001`
- Branch: `feature/blockfolk-imaginarium-001`
- Verified starting HEAD: `0e9e630241761124b6567cd3cea5153dab1d3ebe`
- Resulting integration commit: the focused local commit containing this report; its exact object ID is recorded in the final handoff because a commit cannot contain its own final hash.
- Product: `examples/blockfolk-imaginarium`
- Upstream: none
- Existing delayed-click and distinct press/release-audio repairs were retained.
- No push, PR, merge, deployment, publication, release, tag, Pages, remote, or remote-configuration mutation occurred.

## Revised authority and retained assets

The handoff originally described a 1536 × 1536 file named `01-1000017428.png`, but the attachment actually received in this workspace is a JPEG. The user explicitly superseded the earlier identity and designated the received 1280 × 1280 image below as the revised sole authority.

| Role | Path | Dimensions | Bytes | SHA-256 |
| --- | --- | ---: | ---: | --- |
| Byte-identical authority JPEG | `art/source/blockfolk-valley-authority-1280.jpg` | 1280 × 1280 | 293,332 | `4aa0bb1fb66e3c4101a0e4aa2dad1cf0ebf6adf7a5b484453a9cddd9bb0d7911` |
| Lossless production master PNG | `art/master/blockfolk-valley-4096.png` | 4096 × 4096 | 20,577,460 | `e5ea7c4077ddfac7c343fd7b1b4a903774bfeb59f4dbd9c28bf12cf630ad9933` |
| Shipping WebP, quality 88 | `src/assets/backgrounds/blockfolk-valley.webp` | 4096 × 4096 | 1,424,174 | `25b795d7b9914b56bd2dfb4a444594f63f4146d8490dd0127850b749b4a2c25c` |

The archived JPEG is byte-identical to the received attachment. Its decoded RGB pixel SHA-256 is `d0525c34e834d4cac94557ac00544f7371e2f0e61debee021b42f338f330366d`.

## Deterministic NVIDIA upscale

- ComfyUI: 0.28.3, commit `34d0629452cac83dc20aa3d84e45c9b60d9e36b3`
- Node package: `comfyui_nvidia_rtx_nodes` 0.1.3, commit `892515e3eb9a4920a131a502a047e47adca9eb0d`
- Node type: `RTXVideoSuperResolution`
- Node source SHA-256: `c7e653e5700c80d253fc36830c6e508bf45aab48050154dca1bc4998ef0624bc`
- Engine: NVIDIA RTX Video Super Resolution / VFX SDK 1.2.0.0
- Python package: `nvidia-vfx` 0.1.0.1
- GPU/driver: NVIDIA GeForce RTX 4080 SUPER / 591.86
- Processing: exact 4096 × 4096 target dimensions, ULTRA quality, 3.2× per axis; no prompt, diffusion, denoise, sampler, generative repair, or sharpening.
- Runtime: 2.443 seconds first successful run; 2.24 seconds forced-fresh repeat.
- Peak VRAM was not reported by the node. ComfyUI system statistics showed approximately 39.8 MB less free VRAM after the first run; this is not a peak measurement.

Engine hashes:

- `nvngx_vsr.dll`: `dcd47a599d3ec250ca4f9c70e14cd7475e2fefb7f1c3dc81a0ca6490b32a1458`
- `nvVFXVideoSuperRes.dll`: `f3aa3ae514d2618d70d79c2730f8d1add5d04ab76bdb2b0a43cfdac63d4975c9`
- `NVVideoEffects.dll`: `dcc876d883d7ffdf1bee8492f933d40d3ba2e93eaf9e174e139cd9e6d93c961c`

The retained workflow is `art/workflows/blockfolk-valley-nvidia-vsr-ultra.json` (2,371 bytes; SHA-256 `00692bb906f225d54cbf7d0e1a1d9e5585476bc2c94b879e9c3b3e5a336b486b`). Two fresh executions produced pixel-identical 4096 × 4096 RGB data, decoded pixel SHA-256 `ee83c4f299835bbfdeffa73e74cdc6e3f2b26e62124e859ebd3ef2826799fd8a`; their PNG containers differ only in metadata.

The initial live node import failed because `nvvfx` was missing. With explicit user approval, only `nvidia-vfx` 0.1.0.1 was installed from NVIDIA's package index and the local ComfyUI process restarted. A first attempt through the PyPI source stub failed on `wheel_stub.buildapi`; the package's documented NVIDIA-index wheel path resolved it. No Flux, node pack, pip upgrade, or unrelated model/dependency was installed.

## Comparison and visual acceptance

- Master reduced to 1280 × 1280 with Lanczos versus the source decode: PSNR 37.9227 dB, MAE 2.35043, maximum absolute channel error 50.
- Shipping WebP versus the lossless master: PSNR 41.8069 dB, MAE 1.52652, maximum absolute channel error 27.
- WebP qualities 88, 90, 92, 94, 96, and 98 were compared; quality 88 was the smallest candidate with no visible degradation at native crop scale.
- The full-image and named-region comparison sheet is `art/evidence/blockfolk-valley-upscale-comparison.png` (2,035,157 bytes; SHA-256 `c62208354c1c5ab5f8c6f217f4cd42a4adb7a487d0a1dfec63ff2733c7978319`).
- The WebP comparison sheet is `art/evidence/blockfolk-valley-webp-comparison.png` (3,941,372 bytes; SHA-256 `24b24b0d998cc652d33af28247f125229b468cb9bffd16a341b290b6b544426c`).
- Visual review found no trail-routing, clearing-area, river-edge, coastline, elevation, or composition drift and no doubled edges, halos, repeated texture, water shimmer, smeared flowers, or invented terrain detail.

## Product integration

- `blockfolk-valley` is the only built-in world and maps 1:1 to the 4096 × 4096 logical coordinate system.
- A small asset registry imports exactly one WebP through the canonical asset manifest and supplies it to the existing camera/editor architecture.
- The generated debug SVG, its labels, and all alternate portrait/landscape backgrounds are absent from the packed artifact.
- Stickers remain in persistent world coordinates; background and stickers remain registered during pan, pinch zoom, resize, orientation change, save/reload, puzzle creation, and current-view PNG export.
- Animals, People, Building, Nature, Magic, and Emoji remain in exact order. Native Unicode emoji, import/trimming, edit/history/layer/copy tools, My Pictures, sound/haptics, focus, and reduced motion remain intact.
- `DESIGN-ART-CONTRACT.md` records this user-supplied, user-approved authority. Approved narrow natural terrain trails are allowed; constructed roads and paths remain forbidden. No license, generation provider, or public-redistribution right is asserted.

### Camera bookmarks

| Bookmark | World X | World Y | Zoom |
| --- | ---: | ---: | ---: |
| Coast | 760 | 1040 | 2.40 |
| Mountain Source | 3030 | 760 | 2.65 |
| Forest River | 2930 | 2460 | 2.40 |
| Plains Bend | 1760 | 2260 | 2.30 |
| World Center | 2048 | 2048 | 1.35 |

Each uses the same world image and generates its preview crop at runtime. Portrait and landscape screenshots confirm the named region remains in bounds with useful placement space and without moving stickers.

## Verification

| Lane | Exact result |
| --- | --- |
| Authority/asset proof | PASS: JPEG signature, dimensions, bytes, source hash, decoded-pixel identity, exact 4096 master/shipping dimensions, retained hashes |
| Repeat NVIDIA execution | PASS: decoded 4096 RGB pixels byte-identical |
| Comparison review | PASS: full image plus coastline, mountain lake/waterfall, mountain trail, central clearing/plains, forest clearing, forest trail, lower trail, and river mouth |
| Product focused scenarios + static audit | PASS |
| Repository lint | PASS |
| Repository TypeScript check | PASS |
| Repository unit suite | PASS: 46 files; 316 passed, 2 skipped |
| SFHS inspect + validate | PASS, zero findings |
| SFHS changed-path check | PASS; one review warning because this sibling path is not in the explicit SFHS path map; lint/typecheck/full unit steps passed |
| SFHS project test | PASS |
| Canonical SFHS pack + verify | PASS, zero findings |
| Packed identity/catalog/network/asset audit | PASS: one non-empty WebP payload, zero JPEG payloads, exact decoded shipping hash, no debug-world marker |
| Packed Chromium scenario | PASS at 400 × 844 and 844 × 400; zero console errors, page errors, or unexpected requests; 336 ms observed boot |
| Editor/camera browser proof | PASS: pan, sticker drag isolation, midpoint pinch, bounds, fit, five bookmarks/previews, rotation continuity, save/reload, emoji/import/puzzle/export |
| Deterministic canonical builds | PASS: two packs byte-identical |
| Original Imaginarium isolation | PASS: Git tree remains `1369fc6e6e76bb204a9cfaf99cb6cb4f3c69d5a7`, no source diff; 11 backgrounds and 114 stickers regression-tested |
| Original Imaginarium build | PASS: Build ID `the-imaginarium-1843671f0e4c`, 10,349,547 bytes, SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b` |
| Ueye | Absent from this branch and untouched |

## Current artifact

- Path: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-a42c57ad95c4`
- Bytes: 2,548,243
- SHA-256: `3aedc45d6574823eb33b62e8b581302479ef55bc4a3cc8ba73dfd594c2a25cb8`

The artifact is a current offline single HTML. Its single decoded WebP payload is byte-identical to the declared shipping asset.

## Remaining uncertainty and phone route

Automated Chromium acceptance is complete. Physical-phone feel, memory/decode performance on the target handset, and that handset's installed native emoji glyph coverage remain physical acceptance items; the background was not silently reduced. The NVIDIA node did not expose peak VRAM.

From the worktree, run `python -m http.server 8000 --bind 0.0.0.0`, keep the PC and phone on the same Wi-Fi, and open `http://<PC-LAN-IP>:8000/examples/blockfolk-imaginarium/dist/index.html`. This serves only the local artifact and does not publish or change Pages.
