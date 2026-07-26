# SFHS-008A - Small reusable HTML import proof

Date: 2026-07-20

Status: PASS

## Source and destination

- Source inventory: `docs/evidence/SFHS-008A-IMPORT-INVENTORY.md`
- Imported project: `examples/hermes-minimal-import`
- SFHS adapter: `pixi-v8` 8.19.0, WebGL required, WebGPU disabled
- Original repository changed: no
- Generated release committed: no; `dist/index.html` remains ignored

The import adds a reusable circle-primitive stage to the Pixi adapter. Project
simulation, controls, scoring, and DOM stay in the imported example rather than
moving into the adapter.

## Exact artifact

- Path: `examples/hermes-minimal-import/dist/index.html`
- Bytes: 494,661
- Source SHA-256:
  `efd5f6efe01279bc296513525bb6bf9cc5510c2d69cebc9a52c6d3ca9b575c83`
- Artifact SHA-256:
  `0d8f965cc341a3b91108a9f76b335d8ee257e520365af0bf8cb1a7e8f554a141`
- Build ID: `hermes-minimal-import-efd5f6efe012`
- Consecutive pack hashes identical: yes
- Static/exact-file verification: PASS, no findings

Commands:

```text
pnpm sfhs validate --json --project examples/hermes-minimal-import
pnpm sfhs build --json --project examples/hermes-minimal-import
pnpm sfhs pack --json --project examples/hermes-minimal-import
pnpm sfhs verify --json --project examples/hermes-minimal-import
pnpm --filter @sfhs/example-hermes-minimal-import browser-proof
```

## Browser and interaction proof

The exact packed bytes passed all three profiles with one document request and
no findings:

- desktop Chromium, 1440 by 900;
- Samsung Galaxy S21 Ultra portrait emulation, 384 by 854 at DPR 3;
- Samsung Galaxy S21 Ultra landscape emulation, 854 by 384 at DPR 3.

Each profile reached `running` and passed the imported `window.CR` self-check.
A separate exact-byte interaction run proved keyboard movement, pointer-button
movement, collection, and score HUD update. Visual review confirmed readable
HUD/game separation and reachable controls in both mobile orientations.

The initial landscape proof failed because the pre-start game region intercepted
the start button. The import now hides the inactive region from pointer events
and pins portrait grid rows explicitly. All profiles were rerun after both
layout corrections.

## Behavior comparison

Preserved:

- orange player and yellow star at the original logical positions and radii;
- horizontal A/D and arrow-key movement;
- left/right pointer controls with at least 48 px targets;
- horizontal bounds, one-star collection, score increment, dark HUD/view theme,
  and a `window.CR` self-check surface.

Intentional migration differences:

- rendering changes from Canvas 2D to the approved PixiJS v8 WebGL adapter;
- variable frame delta changes to a deterministic 60 Hz fixed step;
- inactive random star repositioning is removed because the source permanently
  marked the star taken after the first collection;
- input is cleared on blur, pause, and disposal;
- authored HTML/CSS/TypeScript is separate from generated one-file output.

## Honest limitations

- This is behavioral migration proof, not pixel or renderer equivalence.
- Mobile results are emulation evidence; they do not replace physical Samsung
  Galaxy S21 Ultra acceptance.
- The imported browser proof used exact bytes over a local HTTP origin. The
  file-protocol claim was not separately exercised for this example.
- The project intentionally preserves the source fixture's single collectible;
  it does not add respawn, audio, storage, or progression.
