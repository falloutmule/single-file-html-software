/**
 * Contract descriptor for offline DOM applications whose primary surface is a
 * Canvas 2D editor owned by Fabric.js. The application owns its DOM shell and
 * editor lifecycle; SFHS owns packaging and evidence.
 */
export const packageIdentity = "@sfhs/adapter-dom-canvas-fabric" as const;

export const domCanvasFabricAdapter = {
  id: "dom-canvas-fabric",
  packageVersion: "0.1.0",
  requiredRenderer: "canvas2d",
  webgpu: "disabled",
  simulationLoop: "not-required"
} as const;
