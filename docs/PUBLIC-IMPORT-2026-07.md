# Public development-system import — July 2026

## Canonical source

- Source root: `C:\\Users\\fallo\\Documents\\SFHS`
- Branch: `main`
- Commit: `6df0194815d375c5525292a57729792716d05fd2`
- Import intent: publish the working SFHS development system without claiming a
  stable API or production readiness.

## Included

- project contracts, core discovery, schemas, CLI, and workspace configuration;
- Pixi v8 adapter and generic Pixi runtime/effects infrastructure;
- renderer classifier, Canvas capability analyzer, scaffold generator, and
  bounded Canvas-to-Pixi compatibility packages;
- deterministic builder, one-file packer, verifier, browser runner, evidence
  tools, fixtures, plugins, tests, ADRs, and generic evidence documents.

## Deliberately excluded

- `examples/homeostasis/` — HOMEOSTASIS application code and presentation;
- `docs/evidence/homeostasis-*` and `docs/evidence/SFHS-HOMEOSTASIS*` —
  project-specific evidence, screenshots, and import history;
- `reports/backups/` — historical generated HTML backups;
- ignored `node_modules/`, `.sfhs-*`, browser/cache directories, coverage,
  test results, and `.env*` files — transient or potentially local material.
- `.github/workflows/ci.yml` — preserved in canonical source but excluded from
  this draft because the available GitHub OAuth credential cannot create or
  update workflow files without the separate `workflow` scope. This is a
  publication-permission limitation, not an assessment that CI is unsuitable.

No credentials, tokens, machine secrets, or generated browser profiles were
included.

## Known limitations

- Pixi is the active lane but not the only intended SFHS lane.
- The Canvas-to-Pixi compatibility path is bounded and fail-closed; it is not a
  promise of universal Canvas conversion.
- Physical Samsung Galaxy S21 Ultra acceptance remains distinct from automated
  checks.
- This import preserves working source structure; it does not introduce a new
  plugin framework or stable public contract.
