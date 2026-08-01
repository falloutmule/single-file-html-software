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
| OSF-011 | VERIFIED | Split the Chat kit into a model-readable JSON authority pack and a separately hashed runtime ZIP. | Runtime bytes do not belong in model context. The JSON records its exact ZIP path, bytes, hash, revision, and compiler state. |
| OSF-012 | VERIFIED | Make Protocol v2 opt-in for initialization, but make it the explicit behavior of the `chat-build` kit stage. | Existing `one-shot init` packets remain unchanged; Chat-specific records are deliberate and testable. |
| OSF-013 | VERIFIED | Require a matching runtime descriptor with an `AVAILABLE` compiler before candidate mode can be selected. | A ZIP's existence is provenance only; it is not proof of a usable candidate compiler. |
| OSF-014 | VERIFIED | Make Graduation Protocol v1 additive and keep standalone source authoritative. | Graduation produces records and a disposable ignored workspace materialization; it neither rewrites gameplay nor replaces canonical SFHS authorities. |
| OSF-015 | VERIFIED | Use a bounded Node-built ZIP central-directory parser for graduation intake. | Stored and deflated ZIP support, CRC validation, path normalization, size/ratio limits, and unsupported-feature rejection are small, auditable, and avoid executing supplied content. |
| OSF-016 | VERIFIED | Resolve legacy source authority from manifests and lineage, never timestamps. | A single source manifest or SFHS project manifest establishes authority; multiple otherwise valid roots return a stable ambiguity blocker. |
| OSF-017 | VERIFIED | Materialize external projects under ignored `examples/.sfhs-grad-*` paths. | The copy can participate in repository-relative tooling while preserving the original standalone project and excluding caches, dist, candidates, and intake payloads. |
