# ADR 0003: CLI before MCP

**Status:** accepted  
**Date:** 2026-07-20

## Decision

Build and validate a typed, stable-JSON SFHS CLI before considering an MCP server.

## Alternatives considered

- Expose MCP tools during the initial scaffold.
- Let hosts call arbitrary shell commands.
- Give each adapter its own tool surface.

## Consequences

- Initial commands are `doctor`, `inspect`, `validate`, then `build`, `pack`, `verify`, `test`, `check`, and `release prepare`.
- MCP remains deferred until repeated CLI workflows show a measurable benefit.
- Any future MCP tool must map to identical CLI semantics, use typed results, respect a project-root allowlist, and avoid arbitrary execution.

## Reversal condition

Add a narrow MCP layer only after the CLI has clean-install acceptance and measured workflow evidence supports it.
