import { chromium } from "playwright";
import { describe, expect, it } from "vitest";
import { captureRuntimeCanvasTrace, installRuntimeCanvasInstrumentation } from "./index.ts";

describe("Canvas capability runtime instrumentation", () => {
  it("records operations, per-frame totals, text without storing text, gradients, and save depth", async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await installRuntimeCanvasInstrumentation(page);
      await page.goto(`data:text/html,${encodeURIComponent(`<canvas id="c" width="40" height="30"></canvas><script>const c=document.querySelector('#c').getContext('2d');c.save();c.translate(1,2);const g=c.createLinearGradient(0,0,2,2);g.addColorStop(0,'#fff');c.fillStyle=g;c.fillRect(0,0,3,3);c.font='12px sans-serif';c.fillText('private label',1,2);c.restore();requestAnimationFrame(()=>c.arc(1,1,1,0,1));</script>`)}`);
      await page.waitForTimeout(40);
      const trace = await captureRuntimeCanvasTrace(page);
      const operations = trace.contexts[0]?.operations ?? [];
      expect(operations).toEqual(expect.arrayContaining([expect.objectContaining({ operation: "fillRect", totalCalls: 1 }), expect.objectContaining({ operation: "addColorStop", totalCalls: 1 }), expect.objectContaining({ operation: "fillText", values: [expect.stringContaining("length=13")] })]));
      expect(trace.contexts[0]).toMatchObject({ maximumSaveDepth: 1, saveDepthAtEnd: 0 });
    } finally { await browser.close(); }
  });
});
