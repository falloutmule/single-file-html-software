# Issues Encountered

## BFV-001 — NVIDIA node dependency missing

- Phase: preflight
- Status: `RESOLVED`
- Severity: blocking
- Observed: ComfyUI logged `IMPORT FAILED` for `Nvidia_RTX_Nodes_ComfyUI`; `nvvfx` was absent.
- Expected: live `RTXVideoSuperResolution` node.
- Resolution: with explicit user approval, installed only `nvidia-vfx` 0.1.0.1 from NVIDIA's package index and restarted the localhost ComfyUI server.
- Verification: `/object_info/RTXVideoSuperResolution` now reports exact-size and ULTRA-quality inputs.

## BFV-002 — Initial PyPI stub installation failed

- Phase: preflight
- Status: `RESOLVED`
- Severity: blocking
- Observed: the source stub could not import `wheel_stub.buildapi`.
- Resolution: used the node repository's documented prebuilt-wheel route from NVIDIA's index; no pip upgrade or unrelated package was installed.
