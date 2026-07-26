# ADR 0009: Galaxy S21 Ultra Android Chrome is the primary runtime target

**Status:** accepted  
**Date:** 2026-07-20

## Decision

SFHS v0.1 targets stable Chrome on a physical Samsung Galaxy S21 Ultra first. Desktop Chromium on PC is the secondary runtime target.

Android Chrome governs prioritization for touch and pointer behavior, mobile viewport and safe-area work, WebGL capability handling, lifecycle behavior, performance budgets, and physical-device acceptance evidence. Desktop Chromium remains a required secondary regression surface, not the primary design authority.

SFHS makes no Firefox, Safari, iOS, general Android-WebView, Canvas-renderer, or WebGPU support claim unless a later card adds explicit evidence.

## Alternatives considered

- Treat desktop and Android as equal targets from the first fixture.
- Make desktop Chromium the primary target.
- Claim broad cross-browser support before a browser/device verification matrix exists.

## Consequences

- SFHS-002C and later input/viewport cards use Galaxy S21 Ultra Android Chrome touch and layout behavior as their first acceptance target.
- Browser verification later requires a passing Galaxy S21 Ultra result in portrait and landscape before release readiness; desktop Chromium is the secondary baseline.
- Physical evidence records the exact `SM-G998*` model identifier, Android version, Chrome version, viewport and device-pixel ratio, orientation, and WebGL capability result. The regional chipset is recorded through the model identifier rather than locked in advance.
- The fixture retains its current `chromium` and `pixel-7` automation placeholders, but emulator or desktop automation is not a substitute for the Galaxy S21 Ultra physical-device result.
- Compatibility work outside these two targets remains explicitly deferred.

## Reversal condition

Revisit only after the user changes the audience priority or separately verified evidence justifies an expanded browser/device support matrix.
