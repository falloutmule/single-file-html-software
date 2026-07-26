# SFHS-003C - Static External-Reference Scanner

**Date:** 2026-07-20

**Status:** PASS

**Base commit:** `9fc59d2`

## WHAT WAS DONE

- Added a read-only `sfhs.static-scan@1` report with stable finding codes, deterministic sorting, and an empty default runtime URL allowlist.
- Pinned and used `parse5@8.0.1`, `postcss@8.5.20`, and `acorn@8.17.0` for HTML, CSS, and JavaScript syntax-aware inspection.
- Scanned HTML resource attributes, `srcset`, inline styles, SVG references, media, manifests, object data, iframe `srcdoc`, meta refresh, and embedded scripts and styles.
- Scanned CSS imports, declaration URLs, fonts, SVG paint URLs, and source-map comments.
- Scanned static and dynamic imports, literal fetches and connections, workers, service workers, media/request constructors, resource property assignments, runtime attributes, inserted markup, and source-map comments.
- Allowed data URLs, blob URLs, same-document fragments, `about:blank`, and XML namespace declarations without treating inert library strings as requests.
- Added fatal invalid-UTF-8 handling and parser-error findings.

## WHAT WAS VERIFIED

```text
pnpm exec vitest run packages/verifier/src/index.test.ts
pnpm check
pnpm install --frozen-lockfile --offline --reporter=append-only
node --experimental-strip-types --input-type=module -e <pack-and-scan exact artifact>
```

- Focused scanner gate passed 1 file and 32 tests.
- Full gate passed ESLint, strict TypeScript, and 15 files with 82 tests.
- Frozen offline install passed for all workspace projects.
- The scanner accepted the exact generated Pixi artifact with zero findings.
- Accepted artifact identity: 572,264 bytes, SHA-256 `a1e12e6161cf35ae7c2947fc74c1e354e7f735d1289f4cbac357693bae03695e`, build ID `pixi-minimal-7bcfc7d301c9`.
- The scanner rejected negative fixtures for external/relative scripts, images, styles, fonts, SVG, media, manifests, iframe content, object data, workers, service workers, imports, fetches, runtime DOM resource insertion, source maps, parser failures, and invalid UTF-8.

## WHAT FAILED

- The first run treated an empty Pixi media-source reset, an unrelated object property named `action`, and an `innerHTML` fragment as external resources. The scanner now allows empty runtime resets, limits property rules to resource-bearing names, and parses injected markup as fragments.
- The first SVG paint test passed a CSS value where a declaration list was expected. SVG presentation attributes are now wrapped with their actual property before PostCSS parsing.

All corrected focused, full, frozen-install, and exact-artifact scan gates pass.

## CURRENT EXACT STATE

```text
input: UTF-8 one-file HTML bytes or text
HTML parser: parse5
CSS parser: PostCSS plus URL token extraction
JavaScript parser: Acorn AST
default runtime URL allowlist: empty
output: deterministic sfhs.static-scan@1 report
filesystem mutation: none
exact Pixi artifact result: PASS, zero findings
```

## REMAINING BLOCKERS

- Two isolated clean builds have not yet been compared byte-for-byte.
- Cross-platform Windows/Ubuntu artifact identity has not yet been exercised in CI.
- Static inspection cannot prove runtime-generated URLs whose values are not statically discoverable; exact-artifact network auditing remains required.
- Browser and Samsung Galaxy S21 Ultra acceptance remain unimplemented.

## NEXT ACTIONABLE STEP

Assign `SFHS-003D - Clean-build determinism proof` as the next bounded card.

## EVIDENCE

| Failure mode | Guard in this card |
|---|---|
| External dependency leak | Syntax-aware HTML, CSS, and JavaScript reference discovery fails closed. |
| Scanner false positive | Inert strings, XML namespaces, data/blob URLs, fragments, and embedded blob workers have positive regressions. |
| Hidden runtime request | Workers, imports, service workers, inserted markup, resource assignments, and source maps have negative regressions. |
| Nondeterministic report | Findings are sorted by stable location, code, and reference. |
| Proofless success | Focused, full, frozen-install, and exact-artifact evidence are recorded. |
| AI overreach | No browser, plugin, Hermes, SNC, remote, or release action was added. |

## GITHUB PAGES URL

Not applicable. No remote or deployment exists.

## VERDICT

PASS
