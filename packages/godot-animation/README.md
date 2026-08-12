# `@sfhs/godot-animation`

Renderer-neutral, descriptor-driven export of sampled Godot 2D animations to deterministic RGBA sprite sheets.

## Prerequisite

Only the official standard Godot `4.7.1.stable` executable is supported. Later or earlier versions are rejected. Pass its path explicitly or set `SFHS_GODOT_EXECUTABLE`.

Godot must have access to a real 2D renderer. Windows uses a noninteractive off-screen window. Linux CI runs the same command under Xvfb. Godot's `--headless` dummy renderer cannot read a rendered `SubViewport` texture.

## Command

```powershell
pnpm sfhs godot animation export --project <sfhs-project> --descriptor <project-relative-descriptor.json> --godot-executable <godot-4.7.1> --json
```

The repository fixture can use the environment fallback:

```powershell
$env:SFHS_GODOT_EXECUTABLE = "C:\path\to\Godot_v4.7.1-stable_win64_console.exe"
pnpm godot-animation-fixture
```

## Descriptor

Schema `sfhs.godot-animation-export@1` declares:

- project-relative Godot project and scene paths;
- the `AnimationPlayer` node path;
- RGBA working-frame dimensions and integer nearest-neighbor scale;
- row/column sheet capacity;
- integer anchor, transparent-border, and grounded-baseline rules;
- ordered animation name/time samples;
- opaque variant IDs and JSON parameters;
- one sheet path per variant plus metadata and validation paths.

The scene root must implement `sfhs_apply_variant(variant_id, parameters)`. SFHS assigns no meaning to variant IDs, parameters, animations, or frames. Samples are packed in descriptor order, row-major. The working anchor scales by the declared integer scale when used on the sheet.

## Validation and deterministic limits

The exporter requires nonempty 8-bit RGBA frames, transparent borders, declared bounds and anchors, complete samples, and optional exact binary alpha-mask parity across variants. It records the executable version/SHA-256, descriptor SHA-256, renderer, frame findings, output bytes, and output hashes. A repeat run verifies existing bytes; differing existing output fails as drift.

Determinism is claimed only for repeated exports on the same OS, verified Godot binary, renderer, and graphics environment. Windows and Linux outputs are each tested for internal repeatability; pixel-byte identity across operating systems is not claimed.

Before launch, SFHS rejects symlinks, paths escaping the project, URL schemes, and known Godot networking APIs/classes. Proxy variables are scrubbed for the Godot process. This is a fail-closed source guard, not an operating-system syscall sandbox.

## Troubleshooting

- `SFHS_GODOT_ANIMATION_GODOT_UNSUPPORTED`: use official Godot 4.7.1 stable.
- `SFHS_GODOT_ANIMATION_PATH_INVALID`: keep all declared paths inside the project and remove symlinks.
- `SFHS_GODOT_ANIMATION_NETWORK_GUARD`: remove URL/network-capable project content.
- `SFHS_GODOT_ANIMATION_RENDER_FAILED`: verify the scene hook, `AnimationPlayer`, animation names, display/Xvfb, and sample times.
- `SFHS_GODOT_ANIMATION_VALIDATION_FAILED`: inspect alpha, borders, clipping, anchors, and variant silhouettes.
- `SFHS_GODOT_ANIMATION_OUTPUT_DRIFT`: preserve the old evidence, deliberately remove stale generated outputs, then export again.
