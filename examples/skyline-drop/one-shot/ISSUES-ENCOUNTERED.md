---
{"schema":"sfhs.one-shot-issue-log@1","status":"UNTESTED","facts":{"issues":["I-001 SFHS verifier rejects bundled Pixi control character (SUPERSEDED)","I-002 physical device acceptance remains unrun","I-003 legacy namespace modules fail under ES module bundling (RESOLVED)","I-004 spatial asset acceptance requires physical review"]}}
---
# Issues Encountered

| ID | Phase | Status | Severity | Observed / expected | Evidence | Attempts / resolution | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- |
| I-001 | Canonical verify | SUPERSEDED | High | `sfhs verify` previously rejected raw U+0080 emitted by bundled Pixi. | Historical `e52fff…` artifact and scanner result. | Generic SFHS producer repair escapes forbidden inline-script controls while scanner remains strict; current exact verifier passes. | Preserve historical failure; no current artifact blocker. |
| I-002 | Physical acceptance | UNTESTED | High | Exact packed artifact has no current S21 acceptance run. | Supplied screenshots apply only to the historical candidate. | Defer until exact verification passes. | Portrait and landscape acceptance unavailable. |
| I-003 | Browser boot | RESOLVED | High | Legacy namespace declarations expected cross-file globals; canonical bundle failed with `ReferenceError: Direction is not defined`. | Preserved canonical browser failure. | Converted source to explicit ES modules and moved lifecycle ownership to SFHS runtime; canonical browser smoke passes. | Continue to protect explicit imports with typecheck and browser smoke. |
| I-004 | Product visual acceptance | UNTESTED | Medium | Structural browser evidence cannot establish intended isometric footprint, shadow, overhang, occlusion, and utility readability on the target phone. | Historical candidate screenshots and current structural browser proof. | Bound exact canonical physical checklist prepared. | Physical Galaxy S21 Ultra session required. |
