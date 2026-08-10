import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import validArtifact from "../../contracts/fixtures/valid/artifact.json";
import { sha256Bytes } from "@sfhs/core";
import { describe, expect, it } from "vitest";

import { verifyArtifactBytes } from "./artifact-verifier.ts";
import { verifyHtmlArtifactBytes } from "./html-artifact-verifier.ts";

const fixturePath = fileURLToPath(new URL("../../../fixtures/html-artifact/producer-neutral.html", import.meta.url));
const encode = (source: string): Uint8Array => new TextEncoder().encode(source);
const codes = (source: string, allowedRuntimeUrls?: readonly string[]): readonly string[] =>
  verifyHtmlArtifactBytes(encode(source), allowedRuntimeUrls === undefined ? {} : { allowedRuntimeUrls })
    .findings.map((finding) => finding.code);

describe("producer-neutral HTML artifact verification", () => {
  it("accepts a hand-authored page with multiple scripts, styles, and no SFHS metadata or descriptor", async () => {
    const bytes = new Uint8Array(await readFile(fixturePath));
    const report = verifyHtmlArtifactBytes(bytes);

    expect(report).toEqual({
      schema: "sfhs.html-artifact-verification@1",
      valid: true,
      htmlArtifact: {
        bytes: bytes.byteLength,
        sha256: sha256Bytes(bytes),
        allowedRuntimeUrls: []
      },
      findings: []
    });
    const source = new TextDecoder().decode(bytes);
    expect(source.match(/<script>/gu)).toHaveLength(2);
    expect(source.match(/<style>/gu)).toHaveLength(2);
    expect(source).not.toContain("data-sfhs-inline");
    expect(source).not.toContain("sfhs-build-id");
  });

  it.each([
    ["external script", '<!doctype html><script src="https://cdn.example/app.js"></script>', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["external stylesheet", '<!doctype html><link rel="stylesheet" href="https://cdn.example/app.css">', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["relative image", '<!doctype html><img src="./image.png">', "SFHS_SCAN_EXTERNAL_REFERENCE"],
    ["static fetch", '<!doctype html><script>fetch("https://api.example/data")</script>', "SFHS_SCAN_RUNTIME_FETCH"]
  ])("rejects an undeclared %s", (_name, source, expectedCode) => {
    expect(codes(source)).toContain(expectedCode);
  });

  it("accepts exact declared runtime URLs and normalizes duplicate declarations", () => {
    const scriptUrl = "https://cdn.example/app.js";
    const apiUrl = "https://api.example/data";
    const report = verifyHtmlArtifactBytes(encode(
      `<!doctype html><script src="${scriptUrl}"></script><script>fetch("${apiUrl}")</script>`
    ), {
      allowedRuntimeUrls: [scriptUrl, apiUrl, scriptUrl]
    });

    expect(report.valid).toBe(true);
    expect(report.htmlArtifact.allowedRuntimeUrls).toEqual([apiUrl, scriptUrl]);
  });

  it("accepts an exact declared module import while keeping the default closed", () => {
    const moduleUrl = "https://modules.example/runtime.js";
    const source = `<!doctype html><script type="module">import "${moduleUrl}";</script>`;
    expect(codes(source)).toContain("SFHS_SCAN_RUNTIME_IMPORT");
    expect(codes(source, [moduleUrl])).toEqual([]);
  });

  it("accepts an embedded data module without a network declaration", () => {
    expect(codes('<!doctype html><script type="module">import "data:text/javascript,export default 1";</script>')).toEqual([]);
  });

  it("rejects malformed UTF-8", () => {
    const report = verifyHtmlArtifactBytes(new Uint8Array([0xc3, 0x28]));
    expect(report.findings.map((finding) => finding.code)).toEqual(["SFHS_SCAN_UTF8_INVALID"]);
  });

  it("rejects malformed inline JavaScript", () => {
    expect(codes("<!doctype html><script>const = ;</script>")).toContain("SFHS_SCAN_JAVASCRIPT_PARSE_ERROR");
  });

  it("rejects malformed inline CSS", () => {
    expect(codes("<!doctype html><style>a { color: red;</style>")).toContain("SFHS_SCAN_CSS_PARSE_ERROR");
  });

  it("keeps service-worker registration rejected even when its URL is declared", () => {
    const workerUrl = "https://workers.example/sw.js";
    expect(codes(
      `<!doctype html><script>navigator.serviceWorker.register("${workerUrl}")</script>`,
      [workerUrl]
    )).toContain("SFHS_SCAN_SERVICE_WORKER");
  });

  it("sorts findings deterministically", () => {
    const bytes = encode('<!doctype html><img src="./z.png"><script>fetch("./a.json")</script><style>a{background:url(./m.png)}</style>');
    const first = verifyHtmlArtifactBytes(bytes);
    const second = verifyHtmlArtifactBytes(bytes);

    expect(first).toEqual(second);
    expect(first.findings.map((finding) => finding.location)).toEqual(
      [...first.findings.map((finding) => finding.location)].sort((left, right) => left.localeCompare(right))
    );
  });

  it("repeats the exact SHA and report without producer, build, or source claims", async () => {
    const bytes = new Uint8Array(await readFile(fixturePath));
    const first = verifyHtmlArtifactBytes(bytes);
    const second = verifyHtmlArtifactBytes(bytes);

    expect(first).toEqual(second);
    expect(first.htmlArtifact.sha256).toBe(sha256Bytes(bytes));
    expect(JSON.stringify(first)).not.toMatch(/sourceSha|buildId|producer/iu);
  });

  it("does not relax strict verifyArtifactBytes semantics", async () => {
    const bytes = new Uint8Array(await readFile(fixturePath));
    const descriptor = {
      ...validArtifact,
      artifact: {
        ...validArtifact.artifact,
        bytes: bytes.byteLength,
        sha256: sha256Bytes(bytes)
      }
    };
    const strict = verifyArtifactBytes(bytes, descriptor);

    expect(strict.valid).toBe(false);
    expect(strict.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "SFHS_VERIFY_INLINE_ENTRY_INVALID",
      "SFHS_VERIFY_INLINE_STYLES_INVALID",
      "SFHS_VERIFY_BUILD_ID_MISMATCH",
      "SFHS_VERIFY_SOURCE_SHA256_MISMATCH"
    ]));
  });
});
