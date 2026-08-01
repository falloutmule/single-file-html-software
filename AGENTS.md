# SFHS Workspace Guide

This repository is for **SFHS — Single-File HTML Software**.

## Scope

- Build a host-neutral toolchain that authors, packages, tests, and verifies one self-contained HTML artifact.
- Use PixiJS v8 as the first production adapter, without making SFHS Pixi-only.
- Keep readable source as the edit surface; generated artifacts are never hand-edited unless an explicit project contract says otherwise.
- Keep Codex and Hermes as thin callers of the same SFHS CLI.
- For complete bounded game or interactive-app requests, start with `one-shot/START-HERE.md`; it coordinates current SFHS rather than adding a parallel framework.
- For a completed Chat package or legacy source/evidence migration, use the additive Graduation Protocol v1 (`sfhs one-shot graduate inspect`) before source mutation. It does not authorize remote actions or replace core pack/verify/browser evidence.

## Boundaries

- Do not import SNC game source, raycaster behavior, asset identifiers, tests, reports, or release rules into SFHS core.
- Mention SNC only in explicit provenance or the later read-only compatibility audit.
- Do not fork or vendor OpenAI Game Studio. It may be tested as an optional companion only after standalone SFHS plugin acceptance.
- Do not create an MCP server, a Codex app, hooks, or runtime external URLs in v0.1.
- Do not hand-edit a generated one-file release artifact.

## Delivery contract

- The release artifact is exactly one self-contained HTML file.
- Runtime external URLs default to an empty allowlist.
- Simulation state is serializable and renderer-independent.
- Rendering cannot mutate simulation state.
- Validate source, build, pack, verify the exact artifact, and retain proportional evidence before reporting success.
- Target stable Android Chrome on a physical Samsung Galaxy S21 Ultra first; treat desktop Chromium on PC as the secondary target. Require physical-device acceptance in portrait and landscape, and do not substitute emulator evidence or claim other browser support without separate evidence.

## Card discipline

1. Work one SFHS card at a time with explicit allowed files and acceptance commands.
2. Reconcile root, branch, HEAD, status, and remotes before mutation.
3. Preserve unrelated work and stop on unlisted failures.
4. Use a read-only independent checker for release-trust changes; checkers do not repair their own findings.
5. Do not push, publish, merge, tag, deploy, install a marketplace, or modify Hermes profiles without explicit authorization.

## Next card

SFHS implementation and local release-gate cards through `SFHS-010B` are complete. The independent checker returns `BLOCKED_ON_EXTERNAL_DECISION` with no local findings. The remaining gates are physical Samsung Galaxy S21 Ultra acceptance, explicit active-profile plugin-install authorization, a public remote, and Windows/Linux determinism evidence. The optional 008B SNC audit remains deferred and is not v0.1 completion work.

Do not begin `SFHS-010C`, install a marketplace, create or change a remote, push, publish, tag, deploy, or modify Hermes profiles without explicit authorization.
