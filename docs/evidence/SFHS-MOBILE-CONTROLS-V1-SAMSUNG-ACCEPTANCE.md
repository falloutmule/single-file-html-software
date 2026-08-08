# SFHS Mobile Controls v1 — physical Samsung acceptance

**Verdict date:** 2026-08-07  
**Evidence source:** user-reported real-device result  
**Target:** frozen SFHS Mobile Controls Lab artifact  
**Status:** PASS

## Accepted result

The user reported that the real-device result completes the missing physical
Samsung Chrome gate and directed the final record to read:

- Automated verification: **PASS**
- Exact single-file artifact: **PASS**
- Samsung emulation: **PASS**
- Physical Samsung Chrome: **PASS**
- Mobile Controls v1 overall acceptance: **PASS**
- Frozen implementation: **ACCEPTED**

## Artifact under acceptance

- Path: `examples/mobile-controls-lab/dist/index.html`
- Bytes: `31,218`
- SHA-256: `d12ed344823610cc636cd01561629443b7b434f8d97b6cff35d39d39457b1e33`
- BUILD_ID: `mobile-controls-lab-9a565838dc8e`
- Implementation commit: `9af795fbf22b19e06724785517b97bb3d98c934a`

## Scope

This evidence closes the physical-feel gate for the accepted Samsung Chrome
device. It does not change package source, lab source, the generated artifact,
or any SNC/Doom file. It is not a cross-device Android certification.

## Final gate

**PASS — SFHS Mobile Controls v1 is accepted.**
