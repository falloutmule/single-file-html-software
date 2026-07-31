# One-Shot Factory Decisions

| ID | Status | Decision | Evidence / rationale |
| --- | --- | --- | --- |
| OSF-001 | VERIFIED | Keep public One-Shot sources at repository-root `one-shot/` and operational code in `@sfhs/one-shot`. | This preserves the requested direct LLM entry path while using the existing package/test/CLI conventions. |
| OSF-002 | VERIFIED | Treat current SFHS contracts and explicit user authority as higher priority than One-Shot prose. | Prevents copied guidance from overriding live adapter, packer, verifier, or repository instructions. |
| OSF-003 | VERIFIED | Initialize only `pixi-v8` from `examples/pixi-minimal`. | It is the only current SFHS adapter registered by project validation and documented as the active development lane. |
| OSF-004 | VERIFIED | Generate one self-contained JSON source kit from the manifest. | The kit records current commit and hashes without committing a duplicate documentation bundle. |
| OSF-005 | VERIFIED | Use JSON front matter only for auditable packet facts; keep narrative in Markdown. | Supports automated audit while avoiding schema-encoding general prose. |
| OSF-006 | VERIFIED | Make project initialization transactional and bind canonical report claims to verifier output. | A prepared project must be recoverable, and `VERIFIED` canonical language must name the same artifact the real SFHS verifier produced. |
| OSF-007 | VERIFIED | Preserve the resolved manifest authority metadata inside every external source kit. | External contexts need the same reading priority, lane applicability, and supersession data as repository-native agents. |
| OSF-008 | VERIFIED | Include every maintained packet template and schema in the external source kit. | A kit must let a repository-less agent assemble and audit the complete project packet without inventing missing records. |
| OSF-009 | PROPOSED | Keep Chat Protocol v2 opt-in through `--protocol chat-v2` or `brief.protocol.version = 2`. | Existing initialization remains stable while Chat-specific records are explicit and auditable. |
| OSF-010 | PROPOSED | Treat portable candidate compilation as candidate-only reuse of the current SFHS build semantics. | It cannot emit `dist/`, canonical identities, or verifier claims; unsupported kit environments fall back honestly. |
