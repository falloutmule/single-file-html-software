---
{"schema":"sfhs.one-shot-issue-log@1","status":"BLOCKED","facts":{"issues":["I-001 SFHS verifier rejects bundled Pixi control character","I-002 physical device acceptance remains unrun"]}}
---
# Issues Encountered

| ID | Phase | Status | Severity | Observed / expected | Evidence | Attempts / resolution | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- |
| I-001 | Canonical verify | BLOCKED | High | `sfhs pack` succeeds but `sfhs verify` rejects a U+0080 character in the bundled Pixi output. | `dist/index.html`; verify output. | Reproduced with minified and non-minified project builds; changing the SFHS scanner requires separate authorization. | No canonical-verified artifact. |
| I-002 | Physical acceptance | UNTESTED | High | Exact packed artifact has no current S21 acceptance run. | Supplied screenshots apply only to the historical candidate. | Defer until exact verification passes. | Portrait and landscape acceptance unavailable. |
