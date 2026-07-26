# SFHS-007A/007B - Thin Hermes adapter and bounded task contract

Date: 2026-07-20

Status: PASS

## Environment discovery

- Hermes launcher: `C:/Users/fallo/AppData/Local/hermes/hermes-agent/venv/Scripts/hermes.exe`
- Hermes version: `0.18.2 (2026.7.7.2)`, upstream `fb0ed839`
- Builder profile alias: `builder-gptterra`
- Independent checker profile alias: `checker`
- Persistent profile changes: none
- Hermes core changes: none

The launcher and both profile invocations were verified with read-only `hermes
profile list` and `hermes profile show` commands. The active/default and
`nonprofit` profiles were not changed.

## Repository implementation

`plugins/hermes/skills/sfhs-orchestrator` contains only:

- a thin Hermes skill that routes work to `pnpm sfhs`;
- a bounded JSON task-packet schema;
- separate builder and read-only checker templates;
- concise task-packet policy.

The adapter does not copy packer, verifier, browser-runner, Pixi runtime, or
Codex plugin implementation. The checker template has an empty write allowlist
and every checker command is marked read-only.

## Verification

```text
pnpm exec eslint tools/validate-hermes-adapter.mjs
pnpm hermes-adapter-validate
```

Result: PASS. The repository validator checks skill metadata, shared CLI use,
unsupported-scope claims, schema identity, required bounded fields, shell-free
argument arrays, required run placeholders, and checker immutability.

## Remaining 007C gate

A disposable clean-copy builder/checker run must still record exact resolved
packets, Hermes session/run identifiers, commit, artifact identity, and evidence
paths. Installing or enabling this skill in any persistent Hermes profile
remains outside current authority.
