# SFHS-004D - Negative Fixtures and Physical-Device Contract

**Date:** 2026-07-20

**Implementation status:** PASS

**Release-device status:** BLOCKED_ON_PHYSICAL_DEVICE

**Base commit:** `8912e49`

## WHAT WAS DONE

- Added seven checked-in invalid HTML artifacts with a versioned expectation manifest.
- Added a verifier test that constructs a descriptor bound to each fixture's exact bytes and requires the named stable finding code.
- Added `sfhs.device-acceptance@1`, a strict physical Samsung Galaxy S21 Ultra acceptance schema and TypeScript contract.
- Added semantic validation that rejects emulation, non-`SM-G998*` devices, unsupported WebGL, a failed portrait/landscape run, or a nonpass verdict with stable codes.
- Added clearly labeled valid-contract and invalid-emulation fixtures. Contract fixtures are test data, not device evidence.
- Added an operator procedure describing the exact artifact, device metadata, two orientations, input/audio/layout checks, screenshots, and audit fields required from the physical run.

## NEGATIVE ARTIFACT MATRIX

| Fixture | Required finding |
|---|---|
| `external-image.html` | `SFHS_SCAN_EXTERNAL_REFERENCE` |
| `runtime-fetch.html` | `SFHS_SCAN_RUNTIME_FETCH` |
| `dynamic-import.html` | `SFHS_SCAN_RUNTIME_IMPORT` |
| `service-worker.html` | `SFHS_SCAN_SERVICE_WORKER` |
| `source-map.html` | `SFHS_SCAN_SOURCE_MAP` |
| `missing-inline-entry.html` | `SFHS_VERIFY_INLINE_ENTRY_INVALID` |
| `missing-inline-styles.html` | `SFHS_VERIFY_INLINE_STYLES_INVALID` |

## PHYSICAL-DEVICE BOUNDARY

The contract requires the exact `SM-G998*` model identifier, Android version, four-part Chrome version, exact artifact SHA-256/build ID, WebGL result, and portrait/landscape viewport, DPR, screenshot, and status. `physical: false` is structurally recordable but semantically rejected, preventing an emulation report from becoming a passing physical-device result.

No physical Samsung Galaxy S21 Ultra was available to this local implementation run. No physical result, release readiness, or alternate-device equivalence is claimed.

## NEXT ACTIONABLE STEP

Proceed with `SFHS-005A - Complete CLI command parity`. The physical-device gate remains mandatory before release approval and can be satisfied later without changing the host-neutral build or verification contracts.

## VERDICT

PASS for SFHS-004D implementation. `BLOCKED_ON_PHYSICAL_DEVICE` for the external hardware acceptance gate.
