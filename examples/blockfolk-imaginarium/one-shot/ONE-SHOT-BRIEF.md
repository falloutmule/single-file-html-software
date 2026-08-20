# BlockFolk Snapping Overhaul — Phase 0 Brief

Status: `PHASE 1 PASS` — the renderer-neutral core is implemented, verified, pushed, and published without enabling production doorway behavior. Continuing to Phase 2 under explicit user authority.

Remove the physically disproved Stone Door geometry introduced by `fe3735f` without replacing or destabilizing the permanent Snap/Unsnap controller from `1757d05`. Disable creation of new door connections until calibrated typed door profiles exist, retain validation-only support for saves containing failed doorway endpoints, correct the superseded success report, and publish the exact verified baseline only at `/blockfolk-imaginarium/`. Stop at the physical Samsung gate before implementing the renderer-neutral core.

Phase 1 adds separately tested, versioned asset profiles, coordinate transforms, typed ports, capacity/compatibility validation, deterministic pose-aware candidate selection, graph invariants, BFS components, cloning, and atomic transaction planning. It does not enable doors, change current page@3 records, replace the stable controller, or alter visible production behavior.
