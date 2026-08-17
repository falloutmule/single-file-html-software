# BlockFolk Imaginarium World Foundation Report

## Outcome

PASS — the isolated BlockFolk sibling now has the six-category contract, native typed Unicode emoji stickers, the BlockFolk Workshop CSS shell, and one saved 4096 × 4096 world with camera pan/pinch/bookmarks. Only a deterministic, prominently labeled engineering SVG is present; no production background, sticker art, or supplied reference-sheet image entered the product.

## Repository state

- Repository: `falloutmule/single-file-html-software`
- Worktree: `C:\Users\fallo\Documents\Single-File-Html\.worktrees\blockfolk-imaginarium-001`
- Branch: `feature/blockfolk-imaginarium-001`
- Verified starting HEAD: `f6daec9cbbc563449b8bb835aef35fba2ad82f7c`
- World-foundation commit: `e10dc04456fb2bcb77b6c210155869c21fc119b6`.
- Delayed-click deduplication follow-up: the local commit containing the shared adapter repair and regression guard; its exact SHA is recorded in the final handoff because a commit cannot contain its own final object ID.
- Product: `examples/blockfolk-imaginarium`
- Upstream: none
- Remote mutation: none; no push, PR, merge, deployment, release, tag, Pages change, or remote/config change was performed.

## Implemented contract

- Categories, in exact order: Animals (`animals`), People (`people`), Building (`building`), Nature (`nature`), Magic (`magic`), Emoji (`emoji`). The first five built-in sticker lists remain empty.
- Safe selection migration: `things` → `building`, `silly` → `magic`, `words` → `emoji`, unknown → `animals`. The legacy aliases exist only in migration code, not as packed category definitions; no user data is deleted.
- Picture schema: `blockfolk-imaginarium.page@2`. Legacy `page@1` pictures are migrated from the 1080 × 1440 page into the square world while retaining content.
- Emoji input accepts exactly one Unicode grapheme, rejects ordinary words, and stores the unnormalized source sequence in both the embedded asset and sticker state. Tested examples: `🙂`, `❤️`, `👍🏽`, `👩🏽‍🚀`, `🇺🇸`, and `👨‍👩‍👧‍👦`.
- Emoji uses the browser/device native color-emoji font path. It supports movement, size, rotation, Flip, Behind/In Front, Copy, Undo/Redo, deletion, save/reload, puzzle flattening, and PNG export. Rendering is intentionally platform-dependent; unsupported glyph availability remains an operating-system/font limitation.
- World: one built-in `blockfolk-valley` asset, square/full-bleed, deterministic SVG, explicitly marked `DEBUG WORLD • NOT PRODUCTION`.
- World coordinates: 4096 × 4096. Stickers and camera center/zoom persist independently of viewport orientation.
- Camera: empty-space one-finger pan, sticker one-finger drag, two-pointer midpoint pinch/pan, clamped navigation, zoom in/out, fit complete world, and Coast/Mountain Source/Forest River/Plains Bend/World Center bookmarks. Bookmark previews are runtime crops of the one world.
- Presentation: grass, wood, stone, water, and gold CSS treatment with existing clicky lower-lip/press behavior, touch targets, focus visibility, and reduced-motion support.
- Production replacement seam and approved terrain/forbidden-content contract: `DESIGN-ART-CONTRACT.md`.

## Verification

| Lane | Exact result |
| --- | --- |
| Product focused source scenarios + static audit | PASS: six categories, migrations, representative graphemes, world/camera math, storage/import/editor regressions |
| Repository lint | PASS |
| Repository TypeScript check | PASS |
| Repository unit suite | PASS: 46 files; 316 passed, 2 skipped |
| SFHS inspect + validate | PASS, zero findings |
| SFHS changed-path check | PASS; one review warning because the product path is not in the explicit SFHS path map; lint/typecheck/full unit steps all passed |
| SFHS project test | PASS |
| Canonical SFHS pack + verify | PASS, zero findings |
| Packed identity/catalog/network audit | PASS |
| Packed Chromium world-foundation scenario | PASS at 400 × 844 and 844 × 400; zero console errors, page errors, or unexpected requests |
| Delayed compatibility-click regression | PASS: pointer activation + a click delayed 40 ms produces one activation; a genuine detail-0 assistive click remains available |
| Determinism | PASS: two clean packs byte-identical |
| Original Imaginarium source | PASS: 81 tracked files, 0 blob mismatches; Git tree `1369fc6e6e76bb204a9cfaf99cb6cb4f3c69d5a7` |
| Original Imaginarium regression/build | PASS: 11 backgrounds, 114 stickers; canonical artifact unchanged at SHA-256 `7036de95bd8169dd43994eb2c78ea789476ccbd11a170312744b459d0ac4ea2e` |
| Ueye | Absent from this branch; no Ueye path change |

The Chromium scenario covers old-save migration, original-namespace sentinels, all six categories, word rejection, exact emoji round-trip, visible native color pixels, current-view PNG output, sticker drag without camera pan, empty-space pan without sticker movement, midpoint pinch, pointer cancellation, bounds, fit, all five bookmarks, runtime previews, edit/history/stack/copy/delete behavior, local ZIP import and transparent-edge trimming, save/reload, puzzle flattening, portrait/landscape registration, and download naming.

A physical-test follow-up found that delayed mobile compatibility clicks could outlive the adapter’s former zero-delay suppression and activate a control twice. The reusable defect was isolated in `packages/control-feedback-dom`: pointer-origin compatibility clicks are now suppressed for 800 ms, keyboard compatibility clicks use a separate short guard, and detail-0 assistive activation remains available. No Imaginarium product source was modified for this repair.

The packed audit rejects obsolete `things`, `silly`, and `words` category definitions and controls, inherited Imaginarium IDs/storage keys/art markers, external scripts/styles, and external runtime URLs. `src/assets/manifest.json` remains empty. No JPG/reference-sheet or production art file exists under the product.

## Artifact

- Path: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-18b807662450`
- Bytes: 651,351
- SHA-256: `50fe901870c65bdb2262e9b1e10179cb0d39de0558a36729f31be2bacf844710`
- Portrait evidence: `test-results/world-foundation/portrait-400x844.png`
- Landscape evidence: `test-results/world-foundation/landscape-844x400.png`

## Remaining uncertainty and phone route

Automated Chromium evidence is complete, but physical-phone feel and the target phone’s installed emoji glyph coverage are not automated acceptance. From the worktree, run `python -m http.server 8000 --bind 0.0.0.0`, keep the PC and phone on the same Wi-Fi, and open `http://<PC-LAN-IP>:8000/examples/blockfolk-imaginarium/dist/index.html` on the phone. This serves only the local artifact and does not publish or change Pages.
