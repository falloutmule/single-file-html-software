---
name: sfhs-import
description: Migrate an existing custom HTML project into SFHS using static-first inventory and authored/generated boundaries. Use when importing or adapting HTML, CSS, JavaScript, or PixiJS source to produce one verified self-contained HTML artifact.
---

# SFHS Import

Perform static inventory before executing unknown project code.

## Workflow

1. Confirm the selected project and mutation scope. Stop if the request would change an unrelated repository.
2. Inventory authored HTML, CSS, JavaScript/TypeScript, assets, build outputs, workers, service workers, imports, source maps, and every external reference.
3. Identify the current entry point, generated boundaries, runtime network dependencies, unsupported asset types, and behavior that cannot be preserved honestly.
4. Create or update `sfhs.project.json` with an empty runtime external URL allowlist.
5. Move only authored source behind SFHS contracts. Keep generated output under `dist/` and never edit it directly.
6. For PixiJS v8, route implementation details to `$sfhs-pixi`. Do not substitute Phaser.
7. Validate, build, pack, and verify through the CLI:

```text
pnpm sfhs validate --json --project <path>
pnpm sfhs build --json --project <path>
pnpm sfhs pack --json --project <path>
pnpm sfhs verify --json --project <path>
```

8. Record behavior comparison, exact artifact identity, limitations, and any rejected external dependency. Keep release output generated.
