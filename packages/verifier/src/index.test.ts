import { fileURLToPath } from "node:url";

import { buildProject } from "@sfhs/builder";
import { packIntermediate } from "@sfhs/packer";
import { describe, expect, it } from "vitest";

import { packageIdentity, scanPackedBytes, scanPackedHtml } from "./index.ts";

const fixtureRoot = fileURLToPath(new URL("../../../examples/pixi-minimal/", import.meta.url));

function codes(source: string): readonly string[] {
  return scanPackedHtml(source).findings.map((finding) => finding.code);
}

describe("@sfhs/verifier static scanner", () => {
  it("exposes its workspace boundary", () => {
    expect(packageIdentity).toBe("@sfhs/verifier");
  });

  it("accepts the exact one-file Pixi artifact without mistaking inert library strings for requests", async () => {
    const artifact = packIntermediate(await buildProject(fixtureRoot));

    const result = scanPackedBytes(artifact.bytes);

    expect(result).toEqual({ schema: "sfhs.static-scan@1", valid: true, findings: [] });
  });

  it("allows embedded data, blob, fragment, about:blank, and XML namespace values", () => {
    const result = scanPackedHtml(`<!doctype html><html><head>
      <style>.a{background:url(data:image/png;base64,AA==)}</style>
      </head><body><img src="data:image/png;base64,AA=="><a href="#local">local</a>
      <iframe src="about:blank"></iframe>
      <svg xmlns="http://www.w3.org/2000/svg"><use href="#shape"></use></svg>
      <script>const inert="https://not-a-request.example/file";
      new Worker(URL.createObjectURL(new Blob(["self.close()"])))</script>
      </body></html>`);

    expect(result).toEqual({ schema: "sfhs.static-scan@1", valid: true, findings: [] });
  });

  it.each([
    ["external script", '<script src="https://cdn.example/app.js"></script>', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["relative image", '<img src="./asset.png">', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["srcset", '<img srcset="data:image/png;base64,AA== 1x, /large.png 2x">', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["inline style", '<div style="background:url(/hidden.png)"></div>', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["CSS import", '<style>@import "./theme.css";</style>', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["font source", '<style>@font-face{src:url(./font.woff2)}</style>', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["worker", '<script>new Worker("./worker.js")</script>', "SFHS_SCAN_RUNTIME_WORKER"],
    ["service worker", '<script>navigator.serviceWorker.register("./sw.js")</script>', "SFHS_SCAN_SERVICE_WORKER"],
    ["fetch", '<script>fetch("https://api.example/data")</script>', "SFHS_SCAN_RUNTIME_FETCH"],
    ["dynamic import", '<script type="module">import("./chunk.js")</script>', "SFHS_SCAN_RUNTIME_IMPORT"],
    ["runtime source", '<script>image.src="./late.png"</script>', "SFHS_SCAN_RUNTIME_RESOURCE"],
    ["runtime srcset", '<script>image.srcset="data:image/png;base64,AA== 1x, ./late.png 2x"</script>', "SFHS_SCAN_RUNTIME_RESOURCE"],
    ["runtime attribute", '<script>image.setAttribute("src", "./late.png")</script>', "SFHS_SCAN_RUNTIME_RESOURCE"],
    ["runtime namespaced attribute", '<script>node.setAttributeNS(null, "href", "./late.svg")</script>', "SFHS_SCAN_RUNTIME_RESOURCE"],
    ["inserted markup", '<script>node.insertAdjacentHTML("beforeend", "<img src=\'./late.png\'>")</script>', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["audio constructor", '<script>new Audio("./sound.wav")</script>', "SFHS_SCAN_RUNTIME_RESOURCE"],
    ["request constructor", '<script>fetch(new Request("./api"))</script>', "SFHS_SCAN_RUNTIME_RESOURCE"],
    ["SVG use", '<svg><use href="icons.svg#play"></use></svg>', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["SVG paint", '<svg><rect fill="url(icons.svg#paint)"></rect></svg>', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["manifest", '<link rel="manifest" href="./app.webmanifest">', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["import map", '<script type="importmap">{"imports":{"x":"./x.js"}}</script>', "SFHS_SCAN_RUNTIME_IMPORT"],
    ["speculation rules", '<script type="speculationrules">{"prefetch":[{"urls":["./next"]}]}</script>', "SFHS_SCAN_RUNTIME_RESOURCE"],
    ["iframe srcdoc", '<iframe srcdoc="&lt;img src=\'./nested.png\'&gt;"></iframe>', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["object data", '<object data="./document.pdf"></object>', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["media", '<video poster="./poster.png"><source src="./movie.mp4"></video>', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["meta refresh", '<meta http-equiv="refresh" content="0; url=https://example.com">', "SFHS_SCAN_META_REFRESH"],
    ["source map", '<script>//# sourceMappingURL=app.js.map</script>', "SFHS_SCAN_SOURCE_MAP"]
  ])("rejects %s", (_name, fragment, expectedCode) => {
    expect(codes(`<!doctype html><html><head></head><body>${fragment}</body></html>`)).toContain(expectedCode);
  });

  it("reports malformed CSS, JavaScript, and UTF-8 with stable codes", () => {
    expect(codes("<style>a{</style>")).toContain("SFHS_SCAN_CSS_PARSE_ERROR");
    expect(codes("<script>function {</script>")).toContain("SFHS_SCAN_JAVASCRIPT_PARSE_ERROR");
    expect(scanPackedBytes(new Uint8Array([0xc3, 0x28])).findings[0]?.code).toBe("SFHS_SCAN_UTF8_INVALID");
  });

  it("continues to reject raw C0/C1 controls in HTML input", () => {
    for (const control of ["\u0000", "\u001f", "\u007f", "\u0080", "\u009f"]) {
      const source = `<!doctype html><script>const value="${control}"</script>`;
      expect(codes(source)).toContain("SFHS_SCAN_HTML_PARSE_ERROR");
      expect(scanPackedBytes(new TextEncoder().encode(source)).findings.map((finding) => finding.code)).toContain("SFHS_SCAN_HTML_PARSE_ERROR");
    }
    expect(codes('<!doctype html><style>.value::before{content:"\u0080"}</style>')).toContain("SFHS_SCAN_HTML_PARSE_ERROR");
    expect(codes('<!doctype html><p>\u0080</p>')).toContain("SFHS_SCAN_HTML_PARSE_ERROR");
    expect(scanPackedHtml("<!doctype html><p>\t\n\r</p>").valid).toBe(true);
    expect(scanPackedHtml('<!doctype html><script>const value="\\u0080"</script>').valid).toBe(true);
    expect(scanPackedHtml('<!doctype html><p>\u00a0</p>').valid).toBe(true);
  });

  it("accepts packer-escaped controls in generated JavaScript", async () => {
    const intermediate = await buildProject(fixtureRoot);
    const packed = packIntermediate(
      Object.freeze({
        ...intermediate,
        javascript: 'const value="\\u0080"; const matcher=/\\u0080/; globalThis.__sfhsControlProbe=[value,matcher.test(value)];',
        emittedAssets: []
      })
    );

    expect(packed.html).not.toContain("\u0080");
    expect(scanPackedBytes(packed.bytes)).toEqual({ schema: "sfhs.static-scan@1", valid: true, findings: [] });
  });

  it("sorts repeated findings and honors an exact explicit allowlist", () => {
    const source = '<!doctype html><img src="https://assets.example/a.png"><script>fetch("https://api.example/v1")</script>';
    const first = scanPackedHtml(source, {
      allowedRuntimeUrls: ["https://assets.example/a.png", "https://api.example/v1"]
    });
    const second = scanPackedHtml(source, {
      allowedRuntimeUrls: ["https://assets.example/a.png", "https://api.example/v1"]
    });

    expect(first).toEqual(second);
    expect(first.valid).toBe(true);
  });
});
