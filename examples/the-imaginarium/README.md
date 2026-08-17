# The Imaginarium

The Imaginarium is an offline, mobile-first sticker book for children ages 4-8. Children choose a background, add and move large stickers, save pictures to a private on-device gallery, and download or share a clean PNG.

The product uses the SFHS `dom-canvas-fabric` lane and reuses the proven local-only ZIP safety, transparent-edge trimming, Fabric canvas, history, and export approaches from Ueye. It has independent identity and persistence and does not modify Ueye.

## Build and verify

```powershell
pnpm --filter @sfhs/example-the-imaginarium test:source
pnpm sfhs inspect --json --project examples/the-imaginarium
pnpm sfhs validate --json --project examples/the-imaginarium
pnpm sfhs check --json --project examples/the-imaginarium --changed examples/the-imaginarium
pnpm sfhs pack --json --project examples/the-imaginarium
pnpm sfhs verify --json --project examples/the-imaginarium
```

Editable source is under `src/`. The generated `dist/index.html` must only be created by the SFHS packer.
