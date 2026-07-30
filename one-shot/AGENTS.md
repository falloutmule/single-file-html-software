# One-Shot Factory Instructions

This directory coordinates bounded agent work through current SFHS. It does not own rendering, runtime loops, packing, verification, browser automation, evidence storage, or releases.

- Treat `source-pack-manifest.json` as the bounded reading order.
- Project packets belong in `<project>/one-shot/`; this directory remains factory source.
- Never call candidate output canonical. Canonical means the current project passes the real `pnpm sfhs verify` result for its `dist/index.html`.
- A declared adapter is not integration. Intake evidence must prove the meaningful primary presentation rather than hide a redundant canvas.
- Keep issue and decision records live. Use only: `VERIFIED`, `REPORTED`, `INFERRED`, `PROPOSED`, `UNTESTED`, `BLOCKED`, `SUPERSEDED`.
