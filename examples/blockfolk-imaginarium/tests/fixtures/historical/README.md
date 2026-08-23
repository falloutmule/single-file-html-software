# Historical writer fixtures

These records were generated on 2026-08-23 in five detached temporary worktrees, not authored from the recovery branch schema:

- `f6daec9cbbc563449b8bb835aef35fba2ad82f7c` — page@1 `createPicture`, `createSticker`, and `validatePicture`.
- `e10dc04456fb2bcb77b6c210155869c21fc119b6` — page@2 `createPicture`, `createSticker`, and `validatePicture`.
- `8340d784455555a4fe7d560802ae266f3539de12` — original page@3 writer plus its `makeConnection` implementation.
- `b639f72866a39efd13de9c2fa0057cfee9973dc5` — accepted stable page@3 writer plus its `makeConnection` implementation.
- `499636e63e9906b08a80582beeeff5c2a1b89206` — failed page@4 writer plus its real `planSnapTransaction`, asset profiles, and `validatePicture`. Its fixture contains one actual typed edge.

The generated structured objects were captured directly from each historical module’s output. `manifest.json` binds each file to its commit, schema, IndexedDB key/value shape, expected recovery read, and SHA-256 of recursively key-sorted canonical serialization. Because IndexedDB stores structured objects here, the persistence gate requires zero read-write transactions, unchanged database/key/schema/timestamps, deep equality, and matching canonical hashes; it does not claim meaningful original object byte order.
