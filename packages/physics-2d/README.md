# SFHS Physics 2D

Renderer-neutral 2D rigid-body physics for SFHS products. Version 1 uses
Rapier 2D and intentionally exposes only the shared capabilities required by
the first real consumers: fixed stepping, fixed, dynamic, and position-based
kinematic bodies, circle and box colliders, transforms, next kinematic
transforms, velocities, impulses, collision events, removal, and explicit
disposal.

The package owns no rendering, controls, product rules, asset identifiers, or
pinball mechanics. SFHS embeds Rapier's WebAssembly module into the JavaScript
bundle, so this package does not require a runtime `.wasm` request.

The current builder seam covers synchronously instantiated ESM-style WASM
modules such as Rapier's. It does not claim support for arbitrary WASM import
ABIs or asynchronous WASM loading patterns.
