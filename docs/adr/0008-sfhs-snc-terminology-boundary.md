# ADR 0008: SFHS and SNC terminology boundary

**Status:** accepted  
**Date:** 2026-07-20

## Decision

Use SFHS terminology exclusively for the new toolchain. Keep SNC references confined to provenance and a later read-only compatibility audit.

## Alternatives considered

- Bootstrap SFHS by refactoring SNC.
- Share package namespaces, fixtures, or runtime identifiers.
- Treat existing SNC evidence as SFHS release evidence.

## Consequences

- Package names, manifests, fixture names, commands, reports, default prompts, and source symbols use `sfhs` only.
- SNC game source, assets, test harnesses, device evidence, and release policy do not enter SFHS core.
- Generic lessons may be re-expressed in SFHS terms with their limits documented.

## Reversal condition

Revisit only for an explicitly authorized future integration adapter, after the generic SFHS vertical slice has passed independently.
