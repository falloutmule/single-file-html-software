---
{"schema":"sfhs.one-shot-intake@1","status":"VERIFIED","facts":{"adapterIntegration":{"status":"VERIFIED","evidence":["src/presentation.ts creates the real @sfhs/adapter-pixi-v8 presentation", "src/main.ts owns simulation through @sfhs/pixi-runtime", "tests/canonical-browser-smoke.mjs proves one WebGL surface and semantic placement against canonical bytes"]},"physicalDevice":"UNTESTED"}}
---
# Intake Status

Imported source is PixiJS v8/WebGL with renderer-neutral simulation and semantic actions. The historical Chat candidate remains under `candidate/` as intake evidence only. The canonical path uses explicit ES modules, `@sfhs/adapter-pixi-v8`, and `@sfhs/pixi-runtime`; the prior direct Pixi application, custom animation loop, and custom viewport owner no longer govern canonical execution.
