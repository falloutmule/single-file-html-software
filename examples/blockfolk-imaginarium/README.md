# BlockFolk Imaginarium

BlockFolk Imaginarium is the isolated pre-art descendant of the accepted Imaginarium. It preserves the offline, phone-first editor, local ZIP import, transparent-edge trimming, My Pictures, puzzle, copy/export, Flip, Behind, In Front, Undo/Redo, clicky controls, sound, haptics, focus, and reduced-motion behavior.

The six built-in category seams are Animals, People, Building, Nature, Magic, and Emoji. The first five are intentionally empty. Emoji accepts one genuine Unicode grapheme from the device keyboard and retains that exact sequence in the saved picture. The temporary category navigation uses bundled Lucide icon data; no production sticker artwork is present.

The editor uses one 4096 × 4096 logical world, one deterministic engineering-only BlockFolk Valley SVG, persistent world-space sticker positions, and a saved camera center/zoom. Empty-space drag pans, sticker drag moves, and two-pointer pinch zooms around its midpoint. Five starting locations are camera bookmarks derived from the one world rather than alternate backgrounds. See `DESIGN-ART-CONTRACT.md` for the future production terrain contract and the single replacement seam.

The product uses its own project ID, document schema, IndexedDB database, preference key, generated build ID, global diagnostics object, control IDs, record-ID prefixes, and export filenames. It does not read, migrate, overwrite, or delete the original product's local data.

## Build and verify

```powershell
pnpm --filter @sfhs/example-blockfolk-imaginarium test:source
pnpm sfhs inspect --json --project examples/blockfolk-imaginarium
pnpm sfhs validate --json --project examples/blockfolk-imaginarium
pnpm sfhs check --json --project examples/blockfolk-imaginarium --changed examples/blockfolk-imaginarium
pnpm sfhs pack --json --project examples/blockfolk-imaginarium
pnpm sfhs verify --json --project examples/blockfolk-imaginarium
pnpm --filter @sfhs/example-blockfolk-imaginarium test:browser
pnpm --filter @sfhs/example-blockfolk-imaginarium test:packed
```

Editable source is under `src/`. The generated `dist/index.html` is created only by the SFHS packer.
