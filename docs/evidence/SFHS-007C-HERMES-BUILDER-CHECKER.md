# SFHS-007C - Disposable Hermes builder/checker acceptance

Date: 2026-07-20

Status: PASS WITH EXTERNAL DEVICE BLOCKER

## Isolation and identity

- Clean-copy root: `C:/tmp/sfhs-007c-hermes-20260720`
- Branch: `main`
- Exact commit: `0d90dab172b1c84ff66b8e01f037e2d7fc68badc`
- Persistent Hermes profiles modified: none
- Hermes core modified: no
- Disposable discovery home: `C:/tmp/sfhs-007c-hermes-home-20260720`

The disposable Hermes home discovered exactly one enabled local skill:
`sfhs-orchestrator`. This proved clean-profile discovery without installing the
skill into the default, builder, checker, or nonprofit profiles.

## Bounded packets

- Builder packet:
  `.sfhs-evidence/sfhs-007c-hermes-r3/builder.task.json`
  (`1149c939037a3e302aa5aa3875683c767fdfcf549e6a7c5f38410c51d0feabd5`)
- Checker packet:
  `.sfhs-evidence/sfhs-007c-hermes-r3/checker.task.json`
  (`6dd9fd4197f914ccc868e5549dd1fb68797e284d180ad0c25f3d173d12b76ec0`)

Both packets resolved the exact root, base, commit, allowed/forbidden paths,
ordered argv, evidence files, acceptance criteria, stop conditions, and one
next action. The checker packet had an empty write allowlist.

## Builder result

- Profile: `builder-gptterra`
- Hermes session: `20260720_182541_7391a1`
- SFHS evidence run: `sfhs-20260721002652`
- Packet run directory: `.sfhs-evidence/sfhs-007c-hermes-r3`
- Evidence SHA-256:
  `975119a027ec195ef8f9da9f4c4b2c35288593788f7bdea33ec79c0611cee3f3`
- Artifact: `examples/pixi-minimal/dist/index.html` (573,358 bytes)
- Artifact SHA-256:
  `6d2a8e9c3c28d4576e7ad22cb9a1e18bc6e36eb537b3764a9017f3bf3cda8416`
- Build ID: `pixi-minimal-f0f9aa3feaf9`
- Tracked-file status after run: clean

Passed local steps: initial pack, initial verify, lint, typecheck, all unit
tests, isolated determinism, final pack, final verify, and exact-artifact
browser scenarios. Release preparation exited 1 only for
`SFHS_RELEASE_PHYSICAL_DEVICE_REQUIRED`; this is an external release blocker,
not a local builder failure.

## Independent checker result

- Profile: `checker`
- Hermes session: `20260720_182753_bb345a`
- Verdict: `PASS`
- Checks: clean status, exact branch/commit, Hermes adapter validator, SFHS
  exact-artifact verifier, independent SHA-256 recomputation, and required
  evidence-file existence
- Repairs performed: none
- Tracked-file status after check: clean

The checker confirmed the artifact hash and build ID exactly match builder
evidence. It separately reported the physical Samsung acceptance as untested
and still required.

## Fail-closed findings repaired during acceptance

1. The first builder run stopped because its restricted shell did not expose
   `pnpm`. Task materialization now records exact Node and pnpm entrypoints.
2. The second builder run found that the test phase could remove the previously
   packed fixture artifact. Release preparation now performs a final pack and
   final exact verification after all local checks; a regression test requires
   the artifact to remain on disk.

No failed run was relabeled as a pass. The final R3 builder and independent
checker runs were performed after both repairs on the commit recorded above.

## Remaining external gate

Physical portrait and landscape acceptance on a Samsung Galaxy S21 Ultra
`SM-G998*` running stable Android Chrome remains required before user release
approval. Emulator screenshots do not satisfy that gate.
