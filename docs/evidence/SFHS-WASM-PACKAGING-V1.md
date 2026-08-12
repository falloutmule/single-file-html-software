# SFHS WebAssembly Packaging v1

**Date:** 2026-08-09

**Status:** PASS
**Base commit:** `7cc07a9d7d3ac94501f68f67566dbd3239860f6b`

## Scope

This change establishes `.wasm` as a generic SFHS binary asset. A statically imported module is discovered by the builder, emitted with the `application/wasm` media type, and then embedded by the existing one-file packer as a base64 data URL. The packed HTML has no WASM sidecar and works over HTTP and `file://` without a runtime network dependency.

The implementation contains no physics, pinball, Planck, Rapier, renderer, or application-specific resolution behavior. The neutral `examples/wasm-minimal` fixture owns two tiny WebAssembly modules and deterministically regenerates them from documented byte arrays.

## Supported representation

Application source statically imports the module URL through the bundler:

```ts
import moduleUrl from "./assets/module.wasm";
```

The application may then use the URL with standard browser WebAssembly APIs. The builder preserves the source bytes and assigns `application/wasm`; the packer replaces the emitted asset reference with `data:application/wasm;base64,...`.

Hand-authored runtime paths such as `fetch("./assets/module.wasm")` are not resolved by the builder. The standard artifact verifier rejects that form as an external runtime fetch. Dynamic import discovery, WASI, component-model metadata, streaming compilation guarantees, and semantic validation of arbitrary WASM are outside this v1 boundary.

## Determinism and integrity

- Emitted assets retain exact source bytes and stable SHA-256 identities.
- Multiple WASM assets are emitted in deterministic filename order.
- Rebuilding and packing the same source produces byte-identical HTML and the same artifact SHA-256.
- Base64 expands each 41-byte fixture payload to 56 characters. Including the 29-character data-URL prefix, each embedded URL occupies 85 characters.
- The builder applies the manifest's existing `maximumSingleAssetBytes` guard to emitted binary assets.
- Missing static imports fail the build. Unsupported runtime fetches fail verification. Corrupt binary bytes remain byte-exact, while browser `WebAssembly` validation/instantiation rejects them; the generic packer does not pretend to be a WASM semantic validator.

## Neutral acceptance fixture

`examples/wasm-minimal` imports two repository-owned 41-byte modules. One exports integer addition and the other integer multiplication. Both return `42` in the browser proof.

The fixture verifies:

- two independent WASM assets;
- deterministic fixture generation;
- exact-byte build output;
- offline embedding in one HTML file;
- execution through the normal HTTP browser runner;
- direct `file://` execution;
- zero external requests and zero `.wasm` sidecar requests;
- clear failure behavior for missing, oversized, corrupt, and unsupported inputs.

The current project schema requires a recognized renderer-adapter manifest value, so this plain-DOM fixture uses the established `pixi-v8` metadata lane without importing or executing Pixi. That schema limitation is separate from the builder and packer behavior proved here.

## Measured result

The final neutral fixture produces build ID `wasm-minimal-74a2482cb680`, source SHA-256 `74a2482cb6803e6106d9a4e8be65ca32ce223a0a2a38b47db549f5d52a08ee61`, and a 2,450-byte packed artifact with SHA-256 `d8b9e82f7ae0902ae08347bc750fa6636c57d4e5ef67b1549b0da266a3d60e51`.

The repository-owned modules are:

| Module | Raw bytes | SHA-256 |
|---|---:|---|
| `add.wasm` | 41 | `0edaa6518c68ec1abe5b4d334345823ce18e5642ec313b294626a7acaf0b708b` |
| `multiply.wasm` | 41 | `18796080142522a48d620c96d6962597f069d32775e1c402c8108f2f8a56de4e` |

Two generator runs reproduced both module hashes. Two independent packs were byte-identical and reproduced the artifact hash above. Browser execution returned `42 / 42` over both HTTP and `file://`, with zero external requests, zero `.wasm` sidecar requests, and zero recorded errors.

## JavaScript-only regression boundary

The existing `examples/pixi-minimal` fixture remains the representative JavaScript-only control. With fixed descriptor inputs its artifact remains exactly 574,268 bytes with SHA-256 `4487a0b1d1aec53625ebff9706312f90d734fee9e55fb2a7aa7de8288d0367b2`, and contains no `application/wasm` marker. WASM support therefore adds no bytes or runtime branch to projects that emit no WASM asset.

The fixture's top-level `sfhs check` failure is pre-existing: the example package has no project-local lint script, so the check runner cannot execute its lint step from that directory. Its inspect, validate, pack, verify, and exact artifact regression remain green.

## Donor comparison

The pinball laboratory branch demonstrated that embedded Rapier WASM was feasible. This framework change reused only the generic conclusions: `.wasm` needs a standard media type and an esbuild file loader, while the established packer already embeds emitted assets generically.

The following donor mechanisms were deliberately excluded:

- package-name checks for Rapier;
- Rapier-specific resolver plugins;
- hardcoded third-party file paths;
- emitted-filename rewriting;
- pinball or physics behavior of any kind.

The pinball worktree and its history were not modified.

## Evidence locations

Generated proof remains ignored under `.sfhs-evidence/wasm-packaging/`, including the browser report and repeated-pack artifacts. The checked-in fixture generator is the source of truth for its two binary modules.

## Limitations

- Base64 has its normal 4:3 payload expansion before the short data-URL prefix.
- Large WASM modules can materially increase HTML size and browser decode/compile memory; the configured per-asset size guard should be chosen deliberately.
- `file://` execution is verified on the local Chromium environment only and is not a guarantee for every browser's local-file policy.
- WebAssembly runtime feature compatibility and module validity remain application responsibilities.
- Physical Android behavior and mobile resource cost were not tested by this framework card.
