---
{"schema":"sfhs.one-shot-report@1","status":"VERIFIED","facts":{"artifact":{"classification":"canonical","path":"dist/index.html","sha256":"d7e95638ad9d31e924fbf9ba9d8f4d95070d06a57b4ade461a2c42ab1f726721","buildId":"skyline-drop-cfb081a04f41"},"physicalDevice":"UNTESTED"}}
---
# Verification Report

`pnpm sfhs pack` and the exact `pnpm sfhs verify` produced canonical `dist/index.html` as build `skyline-drop-cfb081a04f41` (2,091,772 bytes; SHA-256 `d7e95638ad9d31e924fbf9ba9d8f4d95070d06a57b4ade461a2c42ab1f726721`; source SHA-256 `cfb081a04f412d79d8a0cef71f7b2714d1d570097dc067b721d39bb2ec4c7645`). `tests/canonical-browser-smoke.mjs` navigated those exact bytes, started the game, confirmed one WebGL Pixi surface, completed a semantic rotation/drop, paused/resumed, resized, and observed no page errors or runtime external requests. Physical-device evidence remains UNTESTED.
