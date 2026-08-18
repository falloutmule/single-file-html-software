# BlockFolk Snap Command 001

## WHAT WAS DONE

- Changed construction Snap from an armed, automatic magnetic mode into an explicit toolbar command.
- Dragging always leaves every sticker or existing assembly exactly where the finger releases it. It never moves, previews, or connects a construction piece.
- Pressing **Snap** on a selected construction piece or assembly searches the nearby compatible painted anchors, moves that selection to the proposed landing position, creates the connection, and reports `Snapped together`.
- When nothing compatible is close enough, Snap leaves the selection unchanged and reports `Move closer to snap`.
- Existing `snapEnabled` preference values are harmlessly ignored; no user picture data is deleted or rewritten.

## WHAT WAS VERIFIED

- Focused source and static audit: PASS.
- Packed audit: PASS.
- SFHS validate, verify, and two deterministic packs: PASS.
- Local Chromium at `400 × 844` and `844 × 400`: PASS, zero console errors, page errors, or unexpected requests.
- The browser regression deliberately places two compatible pieces at a real `60–75` CSS-pixel painted-anchor distance. A drag and release produces zero connections and its exact normal drag displacement. A subsequent Snap press creates one persistent assembly.
- The same no-auto-snap then explicit-command proof covers a Door joining a Log Block's painted face.

## WHAT FAILED

The previous control was implemented as a toggle. That contradicted the requested interaction because it could make stickers snap merely by dragging while the toggle was armed.

## CURRENT EXACT STATE

- Local artifact: `dist/index.html`
- Build ID: `blockfolk-imaginarium-4c614d55882e`
- Bytes: `12,269,531`
- SHA-256: `d206cbc15976943901c46983c40189f09717ce9fc7a68c728d60a1e2f257d0fb`

## REMAINING BLOCKERS

None for automated proof. A real-phone interaction pass remains useful for subjective finger feel.

## NEXT ACTIONABLE STEP

On a phone, place compatible construction pieces near one another, drag them into the desired free position, then press **Snap**. No connection should occur before that press.

## EVIDENCE

Ignored backup: `test-results/snap-command-001/ImaginariumApp.before-snap-command.js`.

**PASS — Snap is an explicit command, not automatic drag behavior.**

## GITHUB PAGES URL

- Feature repair commit: `d2b9683102d464ed0f614f4f2f1488e30ee82d46` on `feature/blockfolk-imaginarium-001`.
- Dedicated Pages commit: `496dc46f41add679a69acfecc60f5b93dae9fb18`, changing only `blockfolk-imaginarium/index.html`.
- Live cache-busted URL: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=496dc46`
- Live Chromium at `400 × 844` and `844 × 400`: PASS with zero console errors, page errors, or unexpected network requests.
- Live artifact: `12,269,531` bytes, SHA-256 `d206cbc15976943901c46983c40189f09717ce9fc7a68c728d60a1e2f257d0fb`.
