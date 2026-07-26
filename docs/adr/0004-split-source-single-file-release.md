# ADR 0004: Split source and one-file release

**Status:** accepted  
**Date:** 2026-07-20

## Decision

Develop from readable, split source files and deterministically generate exactly one self-contained HTML runtime artifact.

## Alternatives considered

- Author only a monolithic HTML file.
- Ship a normal multi-file web bundle.
- Hand-edit generated HTML after packing.

## Consequences

- The packer must inline runtime JavaScript, CSS, Pixi dependencies, and approved assets.
- Dynamic chunks and unintended runtime external references fail validation.
- Build metadata, hashes, and evidence bind to the exact packed file.
- Canonical artifact bytes have LF line endings and no build timestamp.

## Reversal condition

Revisit only if an explicitly requested deliverable authorizes a different artifact type; that requires a versioned contract change rather than silent drift.
