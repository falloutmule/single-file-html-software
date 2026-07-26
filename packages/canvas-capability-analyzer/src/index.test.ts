import { describe, expect, it } from "vitest";
import ts from "typescript";
import { analyzeCanvasSources, buildCapabilityReport, type RuntimeCanvasTrace } from "./index.ts";

function source(text: string) { return { file: "fixture.ts", source: ts.createSourceFile("fixture.ts", text, ts.ScriptTarget.Latest, true) }; }

describe("Canvas capability static analyzer", () => {
  it("tracks direct, alias, object-property, and function-parameter contexts", () => {
    const analysis = analyzeCanvasSources(".", [source(`const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');const c=ctx;const renderer={context:c};function draw(g){g.stroke();}renderer.context.fillRect(0,0,1,1);draw(ctx);`)]);
    expect(analysis.operations).toEqual(expect.arrayContaining([expect.objectContaining({ operation: "fillRect", kind: "method" }), expect.objectContaining({ operation: "stroke", kind: "method" })]));
  });
  it("reports unresolved aliases instead of dropping the operation", () => {
    const analysis = analyzeCanvasSources(".", [source(`const maybe=obtainContext(); maybe.arc(0,0,1,0,1);`)]);
    expect(analysis.unknownContextAliases).toHaveLength(1);
    expect(analysis.operations).toContainEqual(expect.objectContaining({ operation: "arc", kind: "unknown-context-alias", unknownContextAlias: true }));
  });
  it("records property writes and context control operations", () => {
    const analysis = analyzeCanvasSources(".", [source(`const c=document.createElement('canvas').getContext('2d');c.fillStyle='#fff';c.save();c.translate(1,2);c.restore();`)]);
    expect(analysis.operations).toEqual(expect.arrayContaining([expect.objectContaining({ operation: "fillStyle", kind: "property-write" }), expect.objectContaining({ operation: "save" }), expect.objectContaining({ operation: "translate" }), expect.objectContaining({ operation: "restore" })]));
  });
  it("fails closed for observed unknown and unsupported operations", () => {
    const staticAnalysis = analyzeCanvasSources(".", [source(`const c=document.createElement('canvas').getContext('2d');c.createPattern({},'repeat');`)]);
    const trace: RuntimeCanvasTrace = { schema: "sfhs.canvas-runtime-trace@1", scenes: [], contexts: [] };
    expect(buildCapabilityReport(staticAnalysis, trace).verdict).toBe("BLOCKED_ON_UNSUPPORTED_CANVAS_FEATURES");
  });
  it("keeps declared test-only pixel diagnostics visible without blocking the production capability verdict", () => {
    const staticAnalysis = analyzeCanvasSources(".", [source(`const c=document.createElement('canvas').getContext('2d');c.getImageData(0,0,1,1);`)]);
    expect(buildCapabilityReport(staticAnalysis, { schema: "sfhs.canvas-runtime-trace@1", scenes: [], contexts: [] }, { nonProductionOperations: new Set(["getImageData"]) }).verdict).toBe("ANALYSIS_PASS");
  });
  it("covers the reusable operation fixture matrix without treating unobserved catalog entries as use", () => {
    const analysis = analyzeCanvasSources(".", [source(`
      const canvas=document.createElement('canvas'); const c=canvas.getContext('2d');
      c.save();c.translate(1,2);c.rotate(1);c.scale(2,2);c.transform(1,0,0,1,0,0);c.setTransform(1,0,0,1,0,0);c.resetTransform();
      c.beginPath();c.rect(0,0,1,1);c.roundRect(0,0,1,1,1);c.moveTo(0,0);c.lineTo(1,1);c.quadraticCurveTo(0,0,1,1);c.bezierCurveTo(0,0,1,1,2,2);c.arc(1,1,1,0,1);c.ellipse(1,1,1,1,0,0,1);c.closePath();c.clip();c.fill();c.stroke();c.restore();
      c.globalCompositeOperation='source-over';c.shadowBlur=1;c.filter='blur(1px)';c.fillText('t',1,1);c.strokeText('t',1,1);c.measureText('t');c.createLinearGradient(0,0,1,1);c.createRadialGradient(0,0,1,1,1,2);c.clearRect(0,0,1,1);c.drawImage(canvas,0,0,1,1);c.getImageData(0,0,1,1);c.putImageData(c.createImageData(1,1),0,0);c.setLineDash([1]);c.getLineDash();
    `)]);
    const names = new Set(analysis.operations.map((operation) => operation.operation));
    for (const required of ["save", "restore", "translate", "rotate", "scale", "transform", "setTransform", "resetTransform", "rect", "roundRect", "arc", "ellipse", "quadraticCurveTo", "bezierCurveTo", "clip", "drawImage", "fillText", "strokeText", "measureText", "createLinearGradient", "createRadialGradient", "getImageData", "putImageData", "createImageData", "setLineDash", "getLineDash", "globalCompositeOperation", "shadowBlur", "filter"]) expect(names.has(required)).toBe(true);
  });
  it("records offscreen creation, canvas-to-canvas drawing, serialization, and unbalanced restores", () => {
    const analysis = analyzeCanvasSources(".", [source(`const canvas=document.createElement('canvas');const other=new OffscreenCanvas(8,8);const c=canvas.getContext('2d');c.drawImage(canvas,0,0);canvas.toDataURL();canvas.toBlob(()=>{});c.restore();`)]);
    expect(analysis.offscreenCanvasLocations).toHaveLength(1);
    expect(analysis.canvasToCanvasDrawLocations).toHaveLength(1);
    expect(analysis.unbalancedRestoreLocations).toHaveLength(1);
    expect(analysis.operations).toEqual(expect.arrayContaining([expect.objectContaining({ operation: "toDataURL" }), expect.objectContaining({ operation: "toBlob" })]));
  });
});
