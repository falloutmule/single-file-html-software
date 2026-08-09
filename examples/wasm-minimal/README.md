# SFHS WASM Minimal

Neutral framework fixture for deterministic offline WebAssembly packaging. Two repository-owned 41-byte modules export `run(i32, i32)`: one adds and one multiplies. `tools/generate-fixtures.mjs` deterministically recreates both binaries without a third-party toolchain.

Application code imports `.wasm` URLs normally. The SFHS builder emits the binary assets, and the packer replaces their emitted references with deterministic `data:application/wasm;base64,...` URLs. Packed HTTP and `file://` execution therefore require no sibling WASM file or network fallback.

Supported v1 form: static module import through the bundler file loader. A hand-authored runtime string such as `fetch("./module.wasm")` is not resolved by the builder and is rejected by normal artifact verification as an external reference. WebAssembly semantic validation remains a runtime/application responsibility; the packer treats WASM as binary input.
