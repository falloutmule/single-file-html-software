import { supportsRequiredWebGl } from "@sfhs/adapter-pixi-v8";
import { boot } from "./main.ts";

void boot().catch((error: unknown) => {
  console.error("Skyline Drop failed to boot", error);
  const toast = document.getElementById("status-toast");
  if (toast) {
    toast.textContent = supportsRequiredWebGl(document)
      ? "The city failed to initialize. Open diagnostics for details."
      : "WebGL is required for Skyline Drop.";
    toast.className = "show error";
  }
});
