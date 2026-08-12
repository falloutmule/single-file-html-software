import mintSheetUrl from "./assets/mascot-mint.png";
import violetSheetUrl from "./assets/mascot-violet.png";

const canvas = document.querySelector<HTMLCanvasElement>("#playback")!;
const context = canvas.getContext("2d")!;
const proof = document.querySelector<HTMLElement>("#proof")!;
const toggle = document.querySelector<HTMLButtonElement>("#toggle")!;
const status = document.querySelector<HTMLOutputElement>("#status")!;
context.imageSmoothingEnabled = false;
let frame = 0;

function load(source: string): Promise<HTMLImageElement> {
  return new Promise((resolveImage, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolveImage(image), { once: true });
    image.addEventListener("error", reject, { once: true });
    image.src = source;
  });
}

async function boot(): Promise<void> {
  const sheets = await Promise.all([load(mintSheetUrl), load(violetSheetUrl)]);
  function render(): void {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const [index, sheet] of sheets.entries()) {
      context.drawImage(sheet, frame * 128, 0, 128, 128, 96 + index * 320, 64, 192, 192);
    }
    status.value = `Embedded offline playback - frame ${frame} - 2 variants`;
    toggle.textContent = frame === 0 ? "Show wave frame" : "Show idle frame";
  }

  toggle.addEventListener("click", () => { frame = frame === 0 ? 1 : 0; render(); });
  render();
  proof.dataset.ready = "true";
  window.__SFHS_GODOT_ANIMATION_PROOF__ = Object.freeze({ ready: true, getFrame: () => frame });
}

void boot();

declare global {
  interface Window {
    __SFHS_GODOT_ANIMATION_PROOF__?: { readonly ready: true; getFrame(): number };
  }
}
