---
name: sfhs-verify
description: Perform read-only SFHS source and exact-artifact verification. Use when asked to inspect, audit, check, validate, reproduce, or report on an SFHS project or packed HTML without repairing or publishing it.
---

# SFHS Verify

Remain read-only unless the user separately asks for implementation changes.

## Workflow

1. Reconcile repository identity and working-tree state.
2. Run project validation:

```text
pnpm sfhs validate --json --project <path>
```

3. Require an existing generated artifact, then bind it to current source and its descriptor:

```text
pnpm sfhs verify --json --project <path>
```

4. For requested runtime coverage, run a proportional check with the relevant changed paths:

```text
pnpm sfhs check --json --project <path> --changed <repo-relative-path>
```

5. Report the exact artifact path, bytes, SHA-256, build ID, commands/exits, browser profile, and stable findings.

## Fail closed

- Reject descriptor, size, hash, source hash, inline entry/style, output-set, syntax, external reference, unexpected request, console, page, WebGL, and self-check findings.
- Treat `file://` and context-loss as classified scenarios, not broad support or recovery promises.
- Treat emulator screenshots as supporting evidence, never physical-device evidence.
- Do not edit source, regenerate the artifact, publish, or repair findings during a read-only request.
