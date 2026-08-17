# BlockFolk Imaginarium Pre-Art Fork Report

## Outcome

PASS — BlockFolk Imaginarium is a separate, buildable sibling product with an isolated runtime identity, seven selectable empty categories, preserved creation/import mechanics, and a deterministic offline single-HTML artifact. No final BlockFolk art or supplied reference sheet was copied, segmented, embedded, or used as a thumbnail.

## Source authority

- Repository: `falloutmule/single-file-html-software`
- Local repository: `C:\Users\fallo\Documents\Single-File-Html\single-file-html-software`
- Git base: `c280510c1576c0bd8db657f587cb4ae544ffd77a`
- Latest accepted artifact anchor: `origin/gh-pages` commit `260829515804fb49dc5ffd56576824d2cd371248` (`Add Imaginarium flip and depth controls`)
- Verified accepted source snapshot: the local editable Imaginarium build produced build ID `the-imaginarium-08caa6e20c38`, 10,349,488 bytes, SHA-256 `7036de95bd8169dd43994eb2c78ea789476ccbd11a170312744b459d0ac4ea2e`, exactly matching the accepted Pages artifact.
- The accepted editable source was uncommitted in its original worktree. It was copied into the isolated worktree without modifying or cleaning that original worktree.

## Isolation

- Branch: `feature/blockfolk-imaginarium-001`
- Worktree: `C:\Users\fallo\Documents\Single-File-Html\.worktrees\blockfolk-imaginarium-001`
- Product: `examples/blockfolk-imaginarium`
- Original Imaginarium: 82 source files compared by relative path and SHA-256; differences: 0.
- Original Imaginarium rebuild: exact accepted build ID, byte size, and SHA-256 above.
- Ueye was not copied into or modified from this worktree.
- No remote, Pages route, deployment, release, tag, push, or PR mutation was performed.

## Product contract

- Runtime global: `window.BlockFolkImaginarium`
- IndexedDB: `blockfolk-imaginarium-library-v1`
- Preferences: `blockfolk-imaginarium.preferences@1`
- Picture schema: `blockfolk-imaginarium.page@1`
- Sticker-pack schema: `blockfolk-imaginarium.sticker-pack@1`
- Puzzle schema: `blockfolk-imaginarium.puzzle@1`
- Export/recovery prefix: `blockfolk-imaginarium-`
- Built-in backgrounds: 0
- Built-in stickers: 0
- Categories: Animals, People, Things, Nature, Silly, Words, Emoji, in that exact order.
- Empty message: `BlockFolk are coming soon`
- Category controls use pinned `@lucide/icons` data at build time. The packed artifact has no runtime icon dependency.

## Verification

| Lane | Result |
| --- | --- |
| BlockFolk focused source scenarios and static audit | PASS |
| SFHS manifest inspection and validation | PASS, zero findings |
| Repository lint | PASS |
| Repository TypeScript check | PASS |
| Repository unit suite | PASS, 91 tests |
| Generic SFHS Chromium smoke | PASS |
| Canonical pack and verifier | PASS, zero findings |
| Packed inherited-content/identity audit | PASS |
| Phone-sized packed Chromium scenario | PASS, zero console errors, page errors, or unexpected network requests |
| Original Imaginarium focused source scenarios | PASS, 11 backgrounds and 114 stickers |
| Original Imaginarium canonical pack and verifier | PASS, exact accepted hash |
| Two isolated deterministic builds | PASS, byte-identical |

The phone-sized scenario covers all seven categories, the empty strip, empty-board save/reload/export, surprise/reset behavior, namespace isolation using live sentinel data in the original product's localStorage and IndexedDB names, local ZIP import, automatic transparent-edge trimming, placement and movement, Flip, one-step Behind/In Front, Undo/Redo, Copy, save/reload, puzzle flattening, and PNG download.

## Packed-content proof

The packed HTML contains none of these inherited markers: original database or preference keys, `window.Imaginarium`, `background-paper`, `background-bedroom`, `background-blockfolk-valley`, `sticker-animals-cat`, `sticker-blockfolk-`, paper-cut sticker/background metadata, the old Blockfolk background filename, or the prohibited third-party game name. It contains no external script or stylesheet reference.

## Deterministic artifact

- Path: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-85ede9f93edc`
- Bytes: 635,768
- SHA-256: `c196a54a0260efa12a5c00811ebc226e34c90ef5afb194d732a11b9971b122ac`
- Determinism proof: `test-results/blockfolk-pre-art/determinism.json`
- Phone screenshot: `test-results/blockfolk-pre-art/blockfolk-pre-art-phone.png`

## Failure-mode audit

| Failure mode | Guard and evidence | Result |
| --- | --- | --- |
| Forking the historical commit instead of the accepted Flip/depth product | Local editable source rebuilt to the exact `origin/gh-pages` accepted artifact hash and retains Flip/depth tests | Prevented |
| Modifying or replacing the original product | Sibling-only edits; 82/82 original source files hash-identical; exact accepted rebuild hash | Prevented |
| Reading, migrating, overwriting, or deleting original saves | Separate localStorage/IndexedDB/schema/global names; browser sentinel remained readable and unchanged after BlockFolk operations | Prevented |
| Empty catalog causing crashes, hidden categories, or broken images | Seven-category loop plus empty-board and Surprise Me browser paths; neutral text-only empty state | Prevented |
| Inherited built-ins surviving in source or packed output | Empty manifest/library, deleted fork-only inherited asset modules, static audit, repeatable packed audit | Prevented |
| Removing import or creator behavior with the catalog | Runtime ZIP fixture was trimmed, installed, placed, moved, transformed, layered, saved, reopened, flattened, and exported | Prevented |
| Runtime internet dependency | SFHS verifier plus a browser route that blocks and records unexpected requests; observed count 0 | Prevented |
| Non-deterministic packed output | Two isolated installs/builds produced the same build ID, byte count, and SHA-256 | Prevented |
| Premature art or visual-design decisions | Only empty catalog entries and temporary Lucide navigation icons added; supplied reference sheets never entered the product tree or artifact | Prevented |

## Remaining uncertainty

Automated verification used desktop Chromium in a 384×854 touch/mobile context. The artifact has not yet received a physical-phone visual/feel verdict. That is the only remaining acceptance step and does not block the pre-art engineering fork.

For local phone testing, serve the worktree root on the same Wi-Fi network and open `/examples/blockfolk-imaginarium/dist/index.html` from the phone. This avoids publishing or changing the repository's Pages route.
