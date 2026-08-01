---
name: sfhs-orchestrator
description: Decompose and verify bounded SFHS work through the shared SFHS CLI. Use for Hermes builder/checker task packets in an SFHS repository; never reimplement build, packing, verification, Pixi runtime, or release logic.
version: 0.1.0
author: SFHS
license: MIT
metadata:
  hermes:
    tags: [sfhs, orchestration, single-file-html, verification]
---

# SFHS Orchestrator

Use this skill as a thin policy adapter. The repository's `pnpm sfhs` CLI and
versioned manifests are the implementation authority.

## Before dispatch

1. Read the bounded task packet and reject it unless it validates against
   `schemas/sfhs.hermes-task.schema.json`.
2. Reconcile the exact repository root, branch, base commit, HEAD, and status.
3. Refuse writes outside `scope.allowedFiles` and refuse every path in
   `scope.forbiddenFiles`.
4. Run only the packet's ordered `commands`; never invent replacement build,
   pack, scanner, browser, or evidence logic.
5. Stop at the first stop condition and report its stable code.

## Role boundary

- A `builder` may change only explicitly allowed authored paths and generated
  output/evidence paths. It must report the exact commit, artifact SHA-256,
  build ID, evidence paths, commands, and run/session ID.
- A `checker` is read-only. It recomputes repository and artifact truth, reads
  builder evidence, and returns `PASS`, `FAIL - REPAIRABLE`, or
  `BLOCKED - external evidence required`. It never repairs the work it checks.

## SFHS commands

Prefer the packet's exact commands. Valid work normally routes through:

```text
pnpm sfhs inspect --json --project <path>
pnpm sfhs validate --json --project <path>
pnpm sfhs build --json --project <path>
pnpm sfhs pack --json --project <path>
pnpm sfhs verify --json --project <path>
pnpm sfhs release prepare --json --project <path> --evidence <path>
```

Do not edit generated `dist/index.html`. Do not push, publish, merge, tag,
deploy, install plugins, alter Hermes core, or change a persistent Hermes
profile unless the task packet and the user explicitly authorize that action.

For a durable Chat-to-Codex migration, use the Graduation Protocol v1 after a
packet is complete: inspect safely, resolve source authority, plan before
mutation, import transactionally, and materialize into an ignored disposable
workspace copy. Graduation does not automatically rewrite source or manage a
remote repository.

See `references/task-packet.md` for dispatch and result rules.
