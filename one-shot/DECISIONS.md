# One-Shot Factory Decisions

| ID | Status | Decision | Evidence / rationale |
| --- | --- | --- | --- |
| OSF-001 | VERIFIED | Keep public One-Shot sources at repository-root `one-shot/` and operational code in `@sfhs/one-shot`. | This preserves the requested direct LLM entry path while using the existing package/test/CLI conventions. |
| OSF-002 | VERIFIED | Treat current SFHS contracts and explicit user authority as higher priority than One-Shot prose. | Prevents copied guidance from overriding live adapter, packer, verifier, or repository instructions. |
| OSF-003 | VERIFIED | Initialize only `pixi-v8` from `examples/pixi-minimal`. | It is the only current SFHS adapter registered by project validation and documented as the active development lane. |
| OSF-004 | VERIFIED | Generate one self-contained JSON source kit from the manifest. | The kit records current commit and hashes without committing a duplicate documentation bundle. |
| OSF-005 | VERIFIED | Use JSON front matter only for auditable packet facts; keep narrative in Markdown. | Supports automated audit while avoiding schema-encoding general prose. |
