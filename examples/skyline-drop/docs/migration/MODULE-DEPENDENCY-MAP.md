# Skyline Drop Module Dependency Map

The Chat intake used one `SkylineDrop` namespace spread across script files. SFHS bundles entry sources as ES modules, so no file may depend on another file's unimported namespace declaration.

| Module | Owns | Explicit dependencies |
| --- | --- | --- |
| `types.ts` | board constants, directions, serializable game/action/presentation types | none |
| `pieces.ts` | district definitions, rotation, Road Remix definitions | `types.ts` |
| `levels.ts` | level terrain, goals, queues | `types.ts` |
| `state.ts` | initial and level-reset state | `types.ts`, `pieces.ts`, `levels.ts`, `simulation.ts` metric calculation |
| `simulation.ts` | placement, networks, scoring, progression, immutable fixed-step transitions | `types.ts`, `pieces.ts`, `levels.ts`, `state.ts` |
| `input.ts` | keyboard and DOM control events to semantic action snapshots | `types.ts` |
| `audio.ts` | procedural audio only | none |
| `diagnostics.ts` | narrow read-only browser diagnostics | `types.ts` |
| `asset-urls.ts` | declared local asset URLs | bundled asset imports only |
| `presentation.ts` | read-only Pixi scene construction and board-to-screen mapping | SFHS Pixi adapter/runtime, Pixi, assets, `types.ts` |
| `main.ts` | DOM presentation, semantic action wiring, SFHS scene/lifecycle integration | project modules and SFHS runtime |
| `sfhs-entry.ts` | explicit bootstrap and error boundary | `main.ts`, adapter capability probe |

The only intentional browser global is the narrow diagnostics API. It exposes inspection for evidence; it does not expose a mutable game namespace or bootstrap-order contract.

The `state.ts`/`simulation.ts` cycle is function-only: state construction invokes metric calculation only after all modules have initialized.
