/**
 * Contract descriptor for offline interactive applications whose presentation
 * is ordinary browser DOM and which require no rendering framework.
 */
export const packageIdentity = "@sfhs/adapter-dom-interactive" as const;

export const domInteractiveAdapter = {
  id: "dom-interactive",
  packageVersion: "0.1.0",
  requiredRenderer: "none",
  webgpu: "disabled",
  simulationLoop: "application-owned"
} as const;
