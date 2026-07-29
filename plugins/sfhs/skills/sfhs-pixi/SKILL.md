---
name: sfhs-pixi
description: Author, change, test, and verify PixiJS v8 projects behind SFHS contracts. Use for explicit SFHS Pixi requests or projects whose sfhs.project.json declares the pixi-v8 adapter, especially Android Chrome input, viewport, lifecycle, asset, audio, or WebGL work.
---

# SFHS Pixi

Keep PixiJS behind `adapters/pixi-v8`; keep simulation, evidence, and artifact contracts adapter-neutral.

For a newly authorized bounded game, follow `one-shot/START-HERE.md` and initialize from the current template before applying this specialist workflow.

## Workflow

1. Run `pnpm sfhs validate --json --project <path>` and confirm `adapterId` is `pixi-v8`.
2. Edit authored HTML, CSS, TypeScript, and declared assets only. Never hand-edit `dist/index.html`.
3. Preserve these boundaries:
   - serializable renderer-independent simulation state;
   - rendering cannot mutate simulation;
   - one SFHS-owned fixed-step loop;
   - action-based keyboard and pointer input;
   - explicit user-gesture audio unlock;
   - WebGL-required capability failure without a fake fallback;
   - capped runtime DPR and visual-viewport/safe-area handling.
4. Run a proportional gate with every changed path:

```text
pnpm sfhs check --json --project <path> --changed <repo-relative-path>
```

5. Pack and verify the exact artifact:

```text
pnpm sfhs pack --json --project <path>
pnpm sfhs verify --json --project <path>
```

## Target order

Treat stable Android Chrome on a physical Samsung Galaxy S21 Ultra as primary and desktop Chromium as secondary. Emulated 384x854 and 854x384 profiles are supporting evidence only. Never claim physical acceptance without a valid `sfhs.device-acceptance@1` record for an exact `SM-G998*` device.

Do not use Phaser, add a Canvas fallback, or move Pixi-specific types into SFHS core.
