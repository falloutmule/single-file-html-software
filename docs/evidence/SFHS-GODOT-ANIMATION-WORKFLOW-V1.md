# SFHS Godot Animation Workflow v1

**Status:** local implementation and real Windows fixture PASS; Linux CI pending PR execution

**Godot:** `4.7.1.stable.official.a13da4feb`

**Windows executable SHA-256:** `35dab11e04ece16a2b93035e65204f4a944a3e00b020d43e54409193379d5eef`

## Scope

- Added renderer-neutral `@sfhs/godot-animation`, schema `sfhs.godot-animation-export@1`, and the `sfhs godot animation export` CLI route.
- Added a constrained Node zlib RGBA PNG decoder/encoder with no native image dependency.
- Added strict path/symlink, version, source-network, alpha, border, anchor, sheet-order, palette-parity, hash, and drift checks.
- Added the abstract two-animation/two-variant fixture in `examples/godot-animation-proof` and offline packed playback.
- Added a pinned official Linux Godot 4.7.1 CI proof. Same-platform repeatability is required; Windows/Linux pixel identity is not claimed.

## Local real-engine result

The descriptor was exported twice with the official Windows console executable. The first run wrote the outputs and the second reported both as `verified`:

| Output | Bytes | SHA-256 |
| --- | ---: | --- |
| `src/assets/mascot-mint.png` | 652 | `02cbdf6b901542c9022b1268c6e0e49ea7937dc403afc5267a327b7f0ec4ee45` |
| `src/assets/mascot-violet.png` | 651 | `bef459887e4df35a88afe7b9209c9d30760a326bde99c867b77012f2d4d4217d` |

Descriptor SHA-256: `640d0ca523815037bf2178d475465999e34cd77a1b7ea2ce014195d5459e9e0c`.

The real fixture exposed two rendering hazards during implementation: Godot's headless dummy renderer returned an empty `SubViewport`, and an unpaused `AnimationPlayer` advanced while render frames were awaited. The final driver uses an off-screen rendered window, a fresh transparent viewport/scene per variant, and pauses immediately after each exact seek.

## Commands

```text
pnpm sfhs godot animation export --project examples/godot-animation-proof --descriptor godot/mascot-export.json --godot-executable <Godot-4.7.1> --json
pnpm sfhs inspect --project examples/godot-animation-proof --json
pnpm sfhs validate --project examples/godot-animation-proof --json
pnpm sfhs check --project examples/godot-animation-proof --json
pnpm sfhs pack --project examples/godot-animation-proof --json
pnpm sfhs verify --project examples/godot-animation-proof --json
pnpm sfhs artifact smoke --input examples/godot-animation-proof/dist/index.html --ready-selector "[data-ready='true']" --json
```

The output metadata accurately describes the network defense as a fail-closed textual preflight plus scrubbed proxy environment, not an OS syscall sandbox.
