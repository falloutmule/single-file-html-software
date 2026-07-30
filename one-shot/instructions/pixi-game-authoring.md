# Pixi v8 game authoring

Start from the current `examples/pixi-minimal` template through `sfhs one-shot init`; do not recreate Pixi startup or an SFHS loop. Keep simulation serializable and renderer-independent. Input produces actions, actions advance the one fixed-step simulation, and rendering observes immutable presentation only.

Use `@sfhs/adapter-pixi-v8` actively. A manifest declaration alone is insufficient: retain runtime/browser evidence that the meaningful primary surface is Pixi/WebGL and no redundant visible Canvas2D presentation exists. WebGL capability failure remains explicit; do not create a pretend Canvas fallback.
