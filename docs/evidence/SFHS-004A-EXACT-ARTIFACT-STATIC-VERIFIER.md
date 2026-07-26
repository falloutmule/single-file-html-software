# SFHS-004A - Exact-Artifact Static Verifier

**Date:** 2026-07-20

**Status:** PASS

**Base commit:** `4ddeaa8`

## WHAT WAS DONE

- Added `sfhs.artifact-verification@1` as a deterministic read-only verification report.
- Bound validated `sfhs.artifact@1` descriptors to exact byte count and SHA-256.
- Verified that embedded build ID and source SHA-256 metadata match the descriptor.
- Required exactly one SFHS inline entry marker, no script `src`, exactly one SFHS inline stylesheet marker, and no stylesheet link.
- Incorporated every static scanner finding into the exact-artifact verdict.
- Added contained on-disk verification that requires the release output tree to contain only the declared `index.html`.
- Added stable findings for invalid descriptors, missing artifacts, sidecars, byte/hash mismatch, metadata mismatch, and inline-contract mismatch.

## WHAT WAS VERIFIED

```text
pnpm exec vitest run packages/verifier/src/artifact-verifier.test.ts
pnpm check
pnpm install --frozen-lockfile --offline --reporter=append-only
node --experimental-strip-types --input-type=module -e <pack and verify exact on-disk artifact>
```

- Focused verifier gate passed 1 file and 8 tests.
- Full gate passed ESLint, strict TypeScript, and 16 files with 91 tests.
- Frozen offline install passed for all 11 workspace projects.
- The regenerated on-disk Pixi artifact passed with no findings.
- Verified identity: 572,264 bytes, SHA-256 `a1e12e6161cf35ae7c2947fc74c1e354e7f735d1289f4cbac357693bae03695e`, build ID `pixi-minimal-7bcfc7d301c9`, source SHA-256 `7bcfc7d301c94372daa58d742573f9fef24420725055e8e5ca3b219b2603eb6d`.
- Negative tests independently exercise descriptor schema drift, size, SHA-256, build ID, source identity, inline markers, external references, sidecars, and missing files.

## WHAT FAILED

- The first strict TypeScript pass required the descriptor-mutation test table to use an explicit optional change type. The test data and production verifier behavior were unchanged.

All corrected focused, full, frozen-install, and exact on-disk verification gates pass.

## CURRENT EXACT STATE

```text
input: exact artifact bytes plus sfhs.artifact@1 descriptor
byte binding: size and SHA-256
source binding: build ID and authored-source SHA-256 metadata
inline contract: entry script and stylesheet markers
external reference policy: independent scanner findings included
filesystem contract: declared index.html is the only dist output
output: deterministic sfhs.artifact-verification@1 report
exact Pixi artifact result: PASS, zero findings
```

## REMAINING BLOCKERS

- No browser has executed the exact artifact under a request/console/page-error audit.
- Screenshot semantics, lifecycle scenarios, context loss, and `file://` behavior remain unverified.
- Desktop Chromium and physical Samsung Galaxy S21 Ultra acceptance remain outstanding.
- Cross-platform CI remains implemented but unexecuted because there is no remote.

## NEXT ACTIONABLE STEP

Assign `SFHS-004B - Exact-artifact browser runner` as the next bounded card.

## EVIDENCE

| Failure mode | Guard in this card |
|---|---|
| Source/artifact confusion | Descriptor, embedded source metadata, byte count, and exact artifact SHA-256 must agree. |
| Hidden output | Recursive output inspection rejects every sidecar or alternate file. |
| External dependency leak | Static scanner findings are part of the artifact verdict. |
| Metadata spoofing | Duplicate, missing, or mismatched build/source metadata fails. |
| Proofless success | Focused, full, frozen-install, and exact on-disk results are recorded. |
| AI overreach | No browser, device, plugin, Hermes, remote, or release action occurred. |

## GITHUB PAGES URL

Not applicable. No remote or deployment exists.

## VERDICT

PASS
