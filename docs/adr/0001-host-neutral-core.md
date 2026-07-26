# ADR 0001: Host-neutral core

**Status:** accepted  
**Date:** 2026-07-20

## Decision

Implement SFHS as host-neutral contracts, core utilities, builder/packer, verifier, browser runner, evidence layer, and CLI. Codex and Hermes invoke the CLI; neither host owns a second implementation.

## Alternatives considered

- Put the workflow entirely in Codex skill prose.
- Give Hermes a separate build and verification implementation.
- Start with an MCP server rather than a CLI.

## Consequences

- The CLI and package APIs become the authoritative automation surface.
- Host plugins remain small and progressively load only routing and workflow guidance.
- The same artifact and evidence behavior can be reproduced outside either host.

## Reversal condition

Revisit only if a shared CLI demonstrably cannot represent a required host capability without duplicating core behavior.
