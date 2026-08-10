# SFHS Control Feedback v0

SFHS Control Feedback is a reusable renderer-neutral control design and tactile-feedback capability:

```text
portable preset/pack
        |
        v
deterministic runtime semantics
        |
        +--> native DOM adapter
        +--> PixiJS v8 adapter
        |
        +--> symbolic cues --> optional Web Audio / haptics
```

The standalone SFHS Control Editor uses the same contract, runtime, DOM adapter, cue transports, exporter, and preset library used by products. It is an authoring and acceptance product, not a runtime dependency.

## Packages and ownership

| Package | Responsibility |
| --- | --- |
| `@sfhs/control-feedback-contract` | Strict renderer-neutral preset/pack data, canonical JSON, provenance, geometry, content, visual states, effects, and validation. |
| `@sfhs/control-feedback-runtime` | Deterministic transient interaction, activation proposals, presentation resolution, ripple caps, reduced motion, and symbolic cue events. |
| `@sfhs/control-feedback-dom` | Native semantic elements, DOM input normalization, CSS/layer rendering, focus, hit targets, and browser lifecycle cancellation. |
| `@sfhs/control-feedback-pixi-v8` | Pixi v8 display objects, hit areas, federated input, interpolation, and declared renderer approximations. |
| `@sfhs/control-feedback-audio-web` | Shared browser audio context, generated/decoded cue buffers, mute/volume/variance/voice/retrigger policy. |
| `@sfhs/control-feedback-haptics-web` | Optional best-effort vibration patterns; never action authority. |
| `@sfhs/control-feedback-presets` | The 25 normalized donor-derived portable presets. |
| `@sfhs/control-feedback-notices` | Deterministic used-preset provenance closure and Third-Party Notices. |
| `@sfhs/control-feedback-exporter` | Canonical preset/pack/config exports and minimal self-contained playable demos. |
| `@sfhs/control-feedback-mobile-controls-dom` | One-way presentation bridge from authoritative Mobile Controls snapshots. |

Renderer APIs, event types, asset identifiers, CSS details, and hit-testing assumptions do not enter the contract or runtime. Donor React/CSS/framework code is not a runtime dependency.

The example and acceptance applications are:

| Directory | Purpose |
| --- | --- |
| `examples/control-feedback-dom-proof` | Native DOM semantics and browser lifecycle proof. |
| `examples/control-feedback-pixi-proof` | PixiJS v8 rendering and DOM/Pixi semantic-parity proof. |
| `examples/control-feedback-cue-proof` | Web Audio and optional haptic transport proof. |
| `examples/control-feedback-library-proof` | Complete 25-preset rendering, provenance, and notice proof. |
| `examples/control-feedback-demo-shell` | Minimal production-runtime entry used by playable single-file exports. |
| `examples/control-feedback-editor` | Standalone offline authoring, torture-test, and export product. |
| `examples/mobile-controls-feedback-proof` | Presentation-only Mobile Controls interoperability proof. |

## Contract and application authority

The supported schemas are `sfhs.control-preset@0` and `sfhs.control-pack@0`. Validation is fail-closed: unknown fields, invalid colors/geometry/timing, malformed semantics, provenance mismatch, unsupported versions, and duplicate pack IDs are rejected.

The runtime owns transient feedback only. It may propose:

- a momentary activation;
- a toggle transition to the opposite selected value;
- a choice selection for a group/value.

The product remains authoritative. It applies selected, enabled, and `idle` / `loading` / `success` / `error` status back through the adapter/runtime model. Presentation never silently becomes permanent application state.

## Interaction semantics

| Input trace | Result |
| --- | --- |
| down | Immediate `pressed-inside` presentation and symbolic `press` cue. |
| move outside | `pressed-outside`; ownership remains deterministic. |
| re-enter, release inside | Exactly one activation proposal, rebound, and activation/select cue. |
| release outside | Cancel and rebound; no activation. |
| pointer cancellation, lost capture, blur, hidden document | Safe cancellation and no stuck owner. |
| unrelated concurrent pointer | Cannot steal or end the active owner. |
| rapid repeated activation | Retarget current presentation; no completed-animation backlog. |

Keyboard Space/Enter follows the same normalized runtime trace in the DOM adapter. Reduced motion selects a deterministic reduced presentation and suppresses bounded effects rather than changing action semantics.

## Rendering and parity

DOM uses real buttons, checkboxes/switches, and radio inputs. The native element owns focus, keyboard behavior, accessible name/state, disabled behavior, and the hit target; visual geometry stays non-interactive and may be smaller than the hit target.

Pixi v8 produces equivalent runtime output for the same normalized trace. Pixel identity is not required. Current declared Pixi approximations include representative-stop gradient flattening, simplified Graphics shadows/content slots, and the need for a host-provided accessible keyboard/DOM surface where canvas accessibility is required. Minimum hit-target geometry and normalized typography validation are shared.

## Sound and haptics

The runtime emits only symbolic roles such as `press`, `activate`, `cancel`, `select-on`, `select-off`, `success`, and `error`.

Web Audio owns one context per window, resumes from a real gesture, caches short buffers, and supports master/per-cue volume, mute, deterministic pitch variance, voice caps, and retrigger policy. Built-in families are soft, plastic, and heavy clicks, toggle on/off, success, and error. Automated scheduling is not a physical audio-latency measurement.

Haptics use bounded `navigator.vibrate` patterns where supported. Failure or absence is a silent no-op; vibration never confirms or authorizes an action.

## Presets, provenance, and notices

The library contains 25 vetted recipes:

- 11 Uiverse Galaxy;
- 8 Animata;
- 6 Magic UI.

Each donor-derived preset freezes repository, commit, source path, blob SHA, MIT license identity, modification status, and required author attribution. Frozen donor IDs cannot be relabeled `sfhs-original`. Renamed donor-derived editor controls retain donor provenance.

Notice generation follows:

```text
used presets -> provenance/source closure -> stable donor/source order -> notices
```

Products and exported demos do not receive unused donor inventories or notices. Editor-authored `sfhs-original` controls require no donor notice.

## Control Editor workflow

The editor is at `examples/control-feedback-editor` and packs to one HTML file.

1. Choose an original control or one of the 25 templates.
2. Edit geometry, shape, radius, fills/gradients, borders, depth, content, text, selected/disabled/focus/status appearance.
3. Tune travel, scale/squash, rebound, overshoot, easing, ripple, shine/glow, and reduced motion.
4. Configure generated cue family, volume, pitch variance, voice cap, mute, and optional haptics.
5. Preview idle, hover, pressed, focused, selected, disabled, loading, success, and error.
6. Run the 12-case torture matrix.
7. Save/load deterministic preset or multi-preset pack JSON. Inspector edits preserve unsupported imported topology; pack members remain selectable.
8. Export selected preset, full pack, used-preset notices, DOM/Pixi configuration, or a playable single-file demo.

The demo exporter validates before embedding, then includes the real shared runtime/DOM adapter, only the selected preset, and only its required notice closure. It does not ship the editor or the full preset library.

Portable imported sample audio is intentionally deferred until it can follow the SFHS asset contract. The editor currently provides deterministic generated short sounds.

## Mobile Controls interoperability

`@sfhs/mobile-controls` continues to own `hold`, `pulse`, `toggle`, `stick2d`, and `relative1d` input/layout semantics. The DOM bridge supports the discrete hold/pulse/toggle elements only. It mounts sibling, pointer-inert feedback visuals; it cannot steal events, duplicate outputs, or become a second layout/state model.

Pulse presentation follows the authoritative Mobile Controls owner edge, including after normal `flush()` drains. Toggle selection is applied from the external Mobile Controls snapshot. Attachment is prevalidated and transactional; destroy removes feedback while leaving Mobile Controls mounted.

See `examples/mobile-controls-feedback-proof` for the integration.

## Accessibility and reduced motion

- DOM controls retain native focus and state semantics.
- Focus-visible presentation is explicit.
- Accessible names remain separate from visual labels/icons.
- Disabled controls cannot activate.
- Loading uses `aria-busy`; status changes use a polite status region.
- Visual geometry may be smaller than a declared minimum hit target.
- Reduced motion is deterministic and does not change application state.
- Mute and unavailable audio/haptics never block controls.
- Pixi products must supply an appropriate accessible DOM/keyboard surface when canvas-only output is insufficient.

## Offline, determinism, and verification

Run:

```powershell
corepack.cmd pnpm@11.9.0 install --frozen-lockfile
corepack.cmd pnpm@11.9.0 check
corepack.cmd pnpm@11.9.0 control-feedback-acceptance
corepack.cmd pnpm@11.9.0 plugin-validate
corepack.cmd pnpm@11.9.0 hermes-adapter-validate
corepack.cmd pnpm@11.9.0 browser-smoke
corepack.cmd pnpm@11.9.0 browser-scenarios
```

The aggregate command reruns DOM, Pixi parity, cue, 25-preset library, editor/exporter, and Mobile Controls interop browser proofs. Each proof packs twice, compares exact bytes, exercises HTTP and `file://`, blocks unexpected requests, and records browser/page/console errors. Aggregate evidence is written below ignored `.sfhs-evidence/control-feedback-v0/`.

Repository CI proves quality on Ubuntu with Node 22.18 and 24. It separately proves same-platform and cross-platform determinism on Windows and Ubuntu with both Node versions, including cross-platform artifact byte comparison.

## Known limitations

- Schema `@0` is strict but not yet a stable public SDK promise.
- Pixi gradient/shadow/content behavior has explicit approximations; semantic parity is the acceptance rule.
- Web Audio automation proves API/configuration/scheduling behavior, not speaker-to-touch physical latency.
- Haptics depend on browser/device support.
- Portable imported audio samples are deferred.
- Samsung S21 Ultra editor/control-feedback physical acceptance was not executed in this initiative; Chromium device emulation is not a substitute.
- No package was externally published, no release/tag was created, and nothing was deployed by this initiative.
