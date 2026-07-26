# ADR 0007: Repository-local plugin and marketplace

**Status:** accepted  
**Date:** 2026-07-20

## Decision

Keep the canonical plugin source at `plugins/sfhs` and use a repository-local Codex marketplace at `.agents/plugins/marketplace.json` during SFHS development.

## Alternatives considered

- A personal plugin source under the user profile.
- A plugin folder named `plugins/codex`.
- A remote marketplace before local clean-install acceptance.

## Consequences

- Plugin source, CLI contracts, fixtures, and clean-install tests stay versioned together.
- The marketplace entry and plugin manifest must use the same normalized name: `sfhs`.
- Marketplace creation and plugin installation remain separate explicitly authorized tasks; this ADR does not perform either action.

## Reversal condition

Revisit if local repository marketplace discovery prevents a clean Codex acceptance flow; document and test any personal-marketplace alternative before switching.
