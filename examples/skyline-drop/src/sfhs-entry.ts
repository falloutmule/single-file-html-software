import { supportsRequiredWebGl } from "@sfhs/adapter-pixi-v8";

import "./pixi-global.ts";
import "./asset-urls.ts";
import "./types.ts";
import "./pieces.ts";
import "./levels.ts";
import "./state.ts";
import "./simulation.ts";
import "./input.ts";
import "./audio.ts";
import "./viewport.ts";
import "./diagnostics.ts";
import "./presentation.ts";
import "./main.ts";

void SkylineDrop.boot().catch((error: unknown) => {
  console.error("Skyline Drop failed to boot", error);
  const toast = document.getElementById("status-toast");
  if (toast) {
    toast.textContent = supportsRequiredWebGl(document)
      ? "The city failed to initialize. Open diagnostics for details."
      : "WebGL is required for Skyline Drop.";
    toast.className = "show error";
  }
});
