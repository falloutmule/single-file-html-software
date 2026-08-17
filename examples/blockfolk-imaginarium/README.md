# BlockFolk Imaginarium

BlockFolk Imaginarium is the isolated pre-art descendant of the accepted Imaginarium. It preserves the offline, phone-first editor, local ZIP import, transparent-edge trimming, My Pictures, puzzle, copy/export, Flip, Behind, In Front, Undo/Redo, clicky controls, sound, haptics, focus, and reduced-motion behavior.

The built-in catalog is intentionally empty. Animals, People, Things, Nature, Silly, Words, and Emoji are stable category seams for the later art phase. The temporary category navigation uses Lucide icons; no final BlockFolk artwork or design-guide decision is present.

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
```

Editable source is under `src/`. The generated `dist/index.html` is created only by the SFHS packer.
