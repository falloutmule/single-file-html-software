# SFHS-003B - One-File HTML Packer

**Date:** 2026-07-20

**Status:** PASS
**Base commit:** `a70867f`

## WHAT WAS DONE

- Added the typed `sfhs.artifact@1` descriptor contract.
- Pinned `parse5@8.0.1` and implemented parser-based HTML rewriting.
- Replaced the authored stylesheet link and module entry with canonical inline style and script elements.
- Rewrote emitted asset references in authored HTML, CSS, and JavaScript to media-typed base64 data URLs.
- Added stable build and source identity metadata without placing timestamps in the artifact.
- Wrote only `dist/index.html`, using a temporary file and same-byte handling for repeat builds.
- Kept the artifact descriptor in memory so the release output remains exactly one file.

## WHAT WAS VERIFIED

```text
pnpm exec vitest run packages/builder/src/index.test.ts packages/packer/src/index.test.ts
pnpm check
pnpm install --frozen-lockfile --offline --reporter=append-only
```

- Focused builder and packer gate passed 2 files and 9 tests.
- Full gate passed ESLint, strict TypeScript, and 15 files with 51 tests.
- Frozen offline install passed for all workspace projects.
- Repeated packing produced byte-identical HTML.
- The output directory contained exactly `index.html`.
- The generated Pixi fixture artifact was 572,264 bytes with SHA-256 `a1e12e6161cf35ae7c2947fc74c1e354e7f735d1289f4cbac357693bae03695e`.
- Its build ID was `pixi-minimal-7bcfc7d301c9`, bound to source SHA-256 `7bcfc7d301c94372daa58d742573f9fef24420725055e8e5ca3b219b2603eb6d` and source revision `a70867f`.

## WHAT FAILED

- The initial dependency install was blocked by the managed filesystem sandbox. The approved retry completed normally; this was an execution-environment restriction, not a product failure.
- A final focused command invoked `vitest` from the workspace root where it is not directly linked, and the first full lint gate rejected two unnecessary quote escapes in the new regression. The command was corrected to the repository test script and the lint issue was removed.
- The next focused run found that an older builder test assumed the new packed output could never pre-exist. It now proves the builder preserves both absence and existing bytes, which is the actual read-only boundary.

All focused, full, and frozen-install gates pass after implementation.

## CURRENT EXACT STATE

```text
input: frozen sfhs.intermediate@1 object
HTML rewrite: parse5 document tree
runtime JavaScript: one inline classic script
runtime CSS: one inline style element
assets: base64 data URLs in HTML, CSS, or JavaScript
metadata: build ID and authored-source SHA-256
filesystem output: exactly dist/index.html
descriptor: validated sfhs.artifact@1 object retained in memory
```

## REMAINING BLOCKERS

- The packed artifact has not passed the independent static external-reference scanner.
- Cross-directory and cross-platform determinism have not been proved.
- The exact artifact has not been executed by the browser runner or accepted on the target Samsung Galaxy S21 Ultra.

## NEXT ACTIONABLE STEP

Assign `SFHS-003C - Static external-reference scanner` as the next bounded card.

## EVIDENCE

| Failure mode | Guard in this card |
|---|---|
| Deliverable drift | The writer creates one named HTML artifact and no sidecars. |
| External dependency leak | Bundler-emitted asset references become embedded data URLs. |
| Source/artifact confusion | Build ID, source SHA-256, artifact byte count, and artifact SHA-256 are separate fields. |
| Nondeterministic build | Repeated packing compares exact bytes and excludes timestamps. |
| Proofless success | Focused, full, frozen-install, byte-count, and SHA evidence are recorded. |
| AI overreach | Scanner, browser, plugin, Hermes, SNC, remote, and release scope were not added. |

## GITHUB PAGES URL

Not applicable. No remote or deployment exists.

## VERDICT

PASS
