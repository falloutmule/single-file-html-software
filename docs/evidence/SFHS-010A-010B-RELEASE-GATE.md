# SFHS-010A/010B - Clean-checkout release gate

Date: 2026-07-20

Status: `BLOCKED_ON_EXTERNAL_DECISION`

## Reproduction identity

- Standalone repository: `C:/Users/fallo/Documents/SFHS`
- Clean-copy root: `C:/tmp/sfhs-010a-release-20260720`
- Branch: `main`
- Release-candidate source commit: `2fff83926aef69bde209860c31bd9dfa2f7d8146`
- Independent-checker commit: `4f06ba19a3e4300de43038fab485eea588745fef`
- SNC repositories or files accessed: no
- Remote, push, PR, tag, publication, deployment, or active-profile install: none

The checker-only delta between the two commits changes release reporting, not
either example's artifact source. A proportional check at the checker commit
reran lint, typecheck, unit, determinism, and exact-artifact browser smoke.

## Clean-copy local acceptance

The clean copy passed a frozen offline install for all 12 workspaces. The full
local matrix passed 121 tests in 20 files, with two intentional skips. Both the
repository-local Codex plugin and the thin Hermes adapter validators passed.

Release preparation passed initial pack and verify, lint, typecheck, unit and
negative tests, two-build determinism, final pack and verify, and all nine
exact-artifact browser scenarios. It exited 1 only because physical Samsung
evidence was not supplied, using the stable finding
`SFHS_RELEASE_PHYSICAL_DEVICE_REQUIRED`.

- Evidence run: `sfhs-20260721011721`
- Evidence manifest SHA-256:
  `aaa9f3268070cd04dcf1a6bb7b736413c720f9f5a27624aaefa4a0f3686bed00`
- Pixi artifact: 574,264 bytes
- Pixi source SHA-256:
  `5487739f0fcdb89e17410c1a1dd89c69719c095e850f15449a756ef0cf8fb72d`
- Pixi artifact SHA-256:
  `1fdbc6443d592a3f7a63ef0f54e0d89ec5c8046fd0298cdc1fb30322c458a431`
- Pixi build ID: `pixi-minimal-5487739f0fcd`
- Import artifact SHA-256:
  `0d8f965cc341a3b91108a9f76b335d8ee257e520365af0bf8cb1a7e8f554a141`
- Import build ID: `hermes-minimal-import-efd5f6efe012`

Both artifacts were packed immediately before the final read-only gate and
verified against current authored source. Generated `dist/` files remain
ignored and are not release source.

## Browser and semantic review

The Pixi fixture passed boot/assets/audio, context loss, file-protocol,
fixed-step visibility, keyboard, pointer, portrait, landscape, and target
activation scenarios. The reusable import separately passed exact-byte desktop,
portrait, landscape, keyboard, pointer, collection, and score-HUD checks.

An initial visual review found that Pixi `autoDensity` inline dimensions could
crop the logical canvas on phone layouts even though the host element fit. The
fixture now constrains the canvas itself and the browser assertions require
rendered-canvas containment and `object-fit`. All browser scenarios were rerun.

The final semantic review is bound to the evidence manifest and marks all three
screenshots passed:

- desktop SHA-256:
  `f127713c845d55362f8b04fdea090591f4bfcfcac7c6b836125f9ef9117584ac`
- S21 Ultra portrait-emulation SHA-256:
  `c0c9ecfe410cf47565952ceb74f7554f1496bf0d8f2b6de317fbb2eb1f4a2867`
- S21 Ultra landscape-emulation SHA-256:
  `448f53cc1a9cfc9d3d5abe4ee26dbc0977fd342e29de28e0703647020a627556`

Emulation is supporting evidence only and is not represented as physical-device
acceptance.

## Independent read-only checker

`pnpm release-gate` validates repository identity, plugin and Hermes structure,
host dependency direction, adapter boundaries, both exact artifacts, evidence
and semantic-review hashes, limitations, remote state, and cross-platform
evidence. It performs no repairs and returns exactly one documented verdict.

Final verdict:

```text
BLOCKED_ON_EXTERNAL_DECISION
```

Local findings: none.

External blockers:

- `BLOCKED_ON_PLUGIN_INSTALL_AUTHORIZATION`
- `SFHS_RELEASE_CROSS_PLATFORM_CI_UNVERIFIED`
- `SFHS_RELEASE_PHYSICAL_DEVICE_REQUIRED`
- `SFHS_RELEASE_PUBLIC_REMOTE_UNCONFIGURED`

One later offline determinism replay could not begin because the local pnpm
store no longer contained every locked tarball; a non-offline retry was blocked
by the restricted network. This does not replace or invalidate the successful
clean-copy offline two-build proof above. It is recorded so the cache condition
is not mistaken for an artifact mismatch.

## Next authorized operator actions

1. Run and record portrait and landscape acceptance on a physical Samsung
   Galaxy S21 Ultra `SM-G998*` in stable Android Chrome.
2. Explicitly authorize active-profile installation if Codex discovery is to be
   accepted.
3. Explicitly authorize creation/configuration of a public remote, then run the
   Windows/Linux determinism workflow and bind its evidence to the exact commit.
4. Rerun the read-only gate. Only a
   `READY_FOR_USER_RELEASE_APPROVAL` verdict permits a separate 010C approval
   request; it does not itself authorize publication.
