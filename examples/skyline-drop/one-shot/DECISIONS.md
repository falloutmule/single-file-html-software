---
{"schema":"sfhs.one-shot-decision-log@1","status":"REPORTED","facts":{"decisions":["D-001 preserve supplied game behavior","D-002 pixi-v8 is the required lane","D-003 unlimited Main Street road reuse remains unchanged","D-004 remote mutation is deferred","D-005 explicit modules replace legacy namespace","D-006 canonical lifecycle is SFHS-owned","D-007 bind reported physical pass to exact canonical artifact"]}}
---
# Decisions

| ID | Status | Decision | Reason / evidence | Supersedes |
| --- | --- | --- | --- | --- |
| D-001 | ACCEPTED | Preserve the handoff candidate's game behavior. | Explicit intake boundary. | — |
| D-002 | ACCEPTED | Use SFHS Pixi v8 / WebGL. | Current factory lane and handoff authority. | Candidate-owned lifecycle. |
| D-003 | DEFERRED | Keep unlimited Main Street road reuse. | Balance change is explicitly unauthorized. | — |
| D-004 | ACCEPTED | Do not create a GitHub remote. | Explicit current remote boundary. | — |
| D-005 | ACCEPTED | Replace the preserved global namespace with explicit ES module imports and exports. | Canonical browser boot failed with `Direction is not defined`; explicit dependencies preserve the source boundary. | Script-order global assumptions. |
| D-006 | ACCEPTED | Use the real SFHS Pixi adapter and runtime for canonical application, scheduling, resize, and teardown. | Active adapter integration is required. | Candidate-owned Pixi application and animation loop. |
| D-007 | ACCEPTED | Record the user `REPORTED PASS` only against canonical build `skyline-drop-cfb081a04f41` and SHA-256 `d7e95638ad9d31e924fbf9ba9d8f4d95070d06a57b4ade461a2c42ab1f726721`. | The exported artifact was byte-for-byte confirmed before the report. Absent device/session metadata remains explicit rather than inferred. | `UNTESTED` physical acceptance. |
