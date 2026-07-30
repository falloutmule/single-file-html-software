# SFHS One-Shot Factory — Start Here

Point an agent at this file (or the `one-shot/` directory) with:

```text
Use the SFHS One-Shot Factory at <repository>/one-shot/START-HERE.md.
Create this bounded game: <concept>.
```

For an external agent that cannot read the repository, generate and attach a current kit first:

```text
pnpm sfhs one-shot kit --output .sfhs-one-shot/sfhs-one-shot-kit.json --json
```

## Required start sequence

1. Read `source-pack-manifest.json` in its listed order, then inspect the current repository and every applicable `AGENTS.md`.
2. Classify the request: `DISCUSSION`, `PLAN`, `IMPLEMENT`, `REPAIR`, `INTAKE`, or `VERIFY`. Discussion never creates artifacts or edits source.
3. Apply current explicit user authority before all other sources. Use the real SFHS starter and selected lane; do not copy framework code into a game.
4. For authorized implementation, create or update the project packet: brief, scope, decisions, issues, acceptance criteria, intake status, and verification report.
5. Build the highest-risk player interaction or vertical slice first. For mobile games, prove independent simultaneous touch ownership and cancellation paths before polish.
6. Continue through authored source, `pnpm sfhs inspect`, `validate`, proportional `check`, `pack`, exact `verify`, relevant browser evidence, and report. Only the SFHS packer can create canonical `dist/index.html`.
7. Keep fallback output under `candidate/` and label it `UNTESTED` or `BLOCKED`. Physical evidence can supersede automation; preserve replaced evidence as `SUPERSEDED`.

Do not push, publish, merge, tag, deploy, install profiles, or mutate a remote unless explicitly authorized.

Read [authority and boundaries](instructions/authority-and-boundaries.md) next.
