import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, relative, sep } from "node:path";

import {
  defaultTreeAdapter,
  html,
  parse,
  serialize,
  type DefaultTreeAdapterTypes
} from "parse5";
import { parse as parseJavaScript, type Node as JavaScriptNode } from "acorn";

import {
  buildIntermediate,
  createBuildPlan,
  type IntermediateBundle,
  type IntermediateOutputAsset
} from "@sfhs/builder";
import {
  type SfhsArtifactManifest,
  validateArtifactManifest
} from "@sfhs/contracts";
import { sha256Bytes } from "@sfhs/core";

export const packageIdentity = "@sfhs/packer" as const;

export type PackErrorCode =
  | "SFHS_PACK_ARTIFACT_INVALID"
  | "SFHS_PACK_ASSET_REFERENCE_MISSING"
  | "SFHS_PACK_ENTRY_SCRIPT_INVALID"
  | "SFHS_PACK_SCRIPT_CONTROL_INVALID"
  | "SFHS_PACK_STYLESHEET_INVALID"
  | "SFHS_PACK_WRITE_FAILED";

export class SfhsPackError extends Error {
  readonly code: PackErrorCode;

  constructor(code: PackErrorCode, message: string) {
    super(message);
    this.name = "SfhsPackError";
    this.code = code;
  }
}

export interface PackOptions {
  readonly nodeVersion?: string;
  readonly pnpmVersion?: string;
  readonly sfhsVersion?: string;
  readonly sourceRevision?: string;
}

export interface PackedArtifact {
  readonly html: string;
  readonly bytes: Uint8Array;
  readonly descriptor: SfhsArtifactManifest;
}

type Document = DefaultTreeAdapterTypes.Document;
type Element = DefaultTreeAdapterTypes.Element;
type Node = DefaultTreeAdapterTypes.Node;
interface TaggedTemplateNode extends JavaScriptNode {
  readonly type: "TaggedTemplateExpression";
  readonly quasi: { readonly quasis: readonly { readonly start: number; readonly end: number }[] };
}

function normalizeLineEndings(value: string): string {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function attribute(element: Element, name: string): string | undefined {
  return element.attrs.find((candidate) => candidate.name === name)?.value;
}

function elementsIn(node: Node): readonly Element[] {
  const found: Element[] = [];
  const children = "childNodes" in node ? node.childNodes : [];
  for (const child of children) {
    if ("tagName" in child) {
      found.push(child);
    }
    found.push(...elementsIn(child));
  }
  return found;
}

function dataUrl(asset: IntermediateOutputAsset): string {
  return `data:${asset.mediaType};base64,${Buffer.from(asset.bytes).toString("base64")}`;
}

interface InlineContent {
  readonly htmlTemplate: string;
  readonly javascript: string;
  readonly stylesheet: string;
}

function inlineAssetReferences(
  content: InlineContent,
  assets: readonly IntermediateOutputAsset[]
): InlineContent {
  const inlined = { ...content };
  for (const asset of assets) {
    const replacement = dataUrl(asset);
    const candidates = [`./${asset.fileName}`, asset.fileName];
    let replaced = false;
    for (const candidate of candidates) {
      for (const key of ["htmlTemplate", "javascript", "stylesheet"] as const) {
        if (inlined[key].includes(candidate)) {
          inlined[key] = inlined[key].replaceAll(candidate, replacement);
          replaced = true;
        }
      }
    }
    if (!replaced) {
      throw new SfhsPackError(
        "SFHS_PACK_ASSET_REFERENCE_MISSING",
        `Bundler output asset is not referenced by the intermediate content: ${asset.fileName}`
      );
    }
  }
  return inlined;
}

function textForRawElement(value: string, closingTag: "script" | "style"): string {
  const escapedClosingTag = value.replace(new RegExp(`</${closingTag}`, "giu"), `<\\/${closingTag}`);
  if (closingTag === "style") {
    return escapedClosingTag;
  }
  const controls: number[] = [];
  for (let offset = 0; offset < escapedClosingTag.length;) {
    const codePoint = escapedClosingTag.codePointAt(offset)!;
    const character = String.fromCodePoint(codePoint);
    const disallowed =
      codePoint <= 0x08 ||
      codePoint === 0x0b ||
      codePoint === 0x0c ||
      (codePoint >= 0x0e && codePoint <= 0x1f) ||
      (codePoint >= 0x7f && codePoint <= 0x9f);
    if (disallowed) {
      controls.push(offset);
    }
    offset += character.length;
  }
  if (controls.length === 0) return escapedClosingTag;

  try {
    const taggedTemplateControl = taggedTemplateControlOffset(escapedClosingTag, controls);
    if (taggedTemplateControl !== undefined) {
      throw new SfhsPackError(
        "SFHS_PACK_SCRIPT_CONTROL_INVALID",
        "Generated inline JavaScript contains a raw C0/C1 control character in a tagged template literal."
      );
    }
  } catch (error) {
    if (error instanceof SfhsPackError) throw error;
    throw new SfhsPackError(
      "SFHS_PACK_SCRIPT_CONTROL_INVALID",
      "Generated inline JavaScript contains a raw C0/C1 control character that could not be safely serialized."
    );
  }
  return Array.from(escapedClosingTag, (character) => {
    const codePoint = character.codePointAt(0)!;
    const disallowed =
      codePoint <= 0x08 ||
      codePoint === 0x0b ||
      codePoint === 0x0c ||
      (codePoint >= 0x0e && codePoint <= 0x1f) ||
      (codePoint >= 0x7f && codePoint <= 0x9f);
    return disallowed ? `\\u${codePoint.toString(16).padStart(4, "0")}` : character;
  }).join("");
}

function taggedTemplateControlOffset(javascript: string, controls: readonly number[]): number | undefined {
  const root = parseJavaScript(javascript, { ecmaVersion: "latest", sourceType: "script" });
  const stack: JavaScriptNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) continue;
    if (node.type === "TaggedTemplateExpression") {
      const quasis = (node as TaggedTemplateNode).quasi.quasis;
      if (quasis.some((element) => controls.some((offset) => offset >= element.start && offset < element.end))) {
        return controls.find((offset) => quasis.some((element) => offset >= element.start && offset < element.end));
      }
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) {
        for (const entry of child) {
          if (entry !== null && typeof entry === "object" && "type" in entry) stack.push(entry as JavaScriptNode);
        }
      } else if (child !== null && typeof child === "object" && "type" in child) {
        stack.push(child as JavaScriptNode);
      }
    }
  }
  return undefined;
}

function replaceStylesheets(document: Document, stylesheet: string): void {
  const stylesheetLinks = elementsIn(document).filter((element) => {
    if (element.tagName !== "link" || attribute(element, "href") === undefined) {
      return false;
    }
    return (attribute(element, "rel") ?? "").split(/\s+/u).includes("stylesheet");
  });
  const firstLink = stylesheetLinks[0];
  if (firstLink === undefined || firstLink.parentNode === null) {
    throw new SfhsPackError("SFHS_PACK_STYLESHEET_INVALID", "Authored HTML requires a stylesheet link.");
  }

  const style = defaultTreeAdapter.createElement("style", html.NS.HTML, [
    { name: "data-sfhs-inline", value: "styles" }
  ]);
  defaultTreeAdapter.appendChild(style, defaultTreeAdapter.createTextNode(textForRawElement(stylesheet, "style")));
  defaultTreeAdapter.insertBefore(firstLink.parentNode, style, firstLink);
  for (const link of stylesheetLinks) {
    defaultTreeAdapter.detachNode(link);
  }
}

function replaceEntryScript(document: Document, javascript: string): void {
  const sourceScripts = elementsIn(document).filter(
    (element) => element.tagName === "script" && attribute(element, "src") !== undefined
  );
  const moduleScripts = sourceScripts.filter((element) => attribute(element, "type") === "module");
  const sourceScript = moduleScripts[0];
  if (moduleScripts.length !== 1 || sourceScripts.length !== 1 || sourceScript === undefined || sourceScript.parentNode === null) {
    throw new SfhsPackError(
      "SFHS_PACK_ENTRY_SCRIPT_INVALID",
      "Authored HTML requires exactly one module entry script and no other source scripts."
    );
  }

  const script = defaultTreeAdapter.createElement("script", html.NS.HTML, [
    { name: "data-sfhs-inline", value: "entry" }
  ]);
  defaultTreeAdapter.appendChild(script, defaultTreeAdapter.createTextNode(textForRawElement(javascript, "script")));
  defaultTreeAdapter.insertBefore(sourceScript.parentNode, script, sourceScript);
  defaultTreeAdapter.detachNode(sourceScript);
}

function appendArtifactMetadata(document: Document, buildId: string, sourceSha256: string): void {
  const head = elementsIn(document).find((element) => element.tagName === "head");
  if (head === undefined) {
    throw new SfhsPackError("SFHS_PACK_ARTIFACT_INVALID", "Authored HTML requires a head element.");
  }
  for (const [name, content] of [
    ["sfhs-build-id", buildId],
    ["sfhs-source-sha256", sourceSha256]
  ] as const) {
    defaultTreeAdapter.appendChild(head, defaultTreeAdapter.createElement("meta", html.NS.HTML, [
      { name: "name", value: name },
      { name: "content", value: content }
    ]));
  }
}

function projectRelativePath(projectRoot: string, outputPath: string): string {
  return relative(projectRoot, outputPath).split(sep).join("/");
}

export function packIntermediate(
  intermediate: IntermediateBundle,
  options: PackOptions = {}
): PackedArtifact {
  const buildId = `${intermediate.projectId}-${intermediate.sourceSha256.slice(0, 12)}`;
  const inlined = inlineAssetReferences({
    htmlTemplate: intermediate.htmlTemplate,
    javascript: intermediate.javascript,
    stylesheet: intermediate.stylesheet
  }, intermediate.emittedAssets);
  const document = parse(normalizeLineEndings(inlined.htmlTemplate));
  replaceStylesheets(document, inlined.stylesheet);
  replaceEntryScript(document, inlined.javascript);
  appendArtifactMetadata(document, buildId, intermediate.sourceSha256);
  const htmlText = `${normalizeLineEndings(serialize(document)).trimEnd()}\n`;
  const bytes = new Uint8Array(Buffer.from(htmlText, "utf8"));
  const descriptor: SfhsArtifactManifest = Object.freeze({
    schema: "sfhs.artifact@1",
    artifact: Object.freeze({
      path: projectRelativePath(intermediate.projectRoot, intermediate.outputPath),
      bytes: bytes.byteLength,
      sha256: sha256Bytes(bytes),
      buildId
    }),
    source: Object.freeze({
      sha256: intermediate.sourceSha256,
      ...(options.sourceRevision === undefined ? {} : { revision: options.sourceRevision })
    }),
    toolchain: Object.freeze({
      node: options.nodeVersion ?? process.version,
      pnpm: options.pnpmVersion ?? "11.9.0",
      sfhs: options.sfhsVersion ?? "0.1.0"
    })
  });
  if (!validateArtifactManifest(descriptor).valid) {
    throw new SfhsPackError("SFHS_PACK_ARTIFACT_INVALID", "Generated artifact descriptor failed its contract.");
  }
  return Object.freeze({ html: htmlText, bytes, descriptor });
}

let temporarySequence = 0;

export async function writePackedArtifact(
  outputPath: string,
  artifact: PackedArtifact
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  temporarySequence += 1;
  const temporaryPath = `${outputPath}.sfhs-${process.pid}-${temporarySequence}.tmp`;
  try {
    await writeFile(temporaryPath, artifact.bytes, { flag: "wx" });
    try {
      await rename(temporaryPath, outputPath);
    } catch {
      const existing = await readFile(outputPath).catch(() => undefined);
      if (existing !== undefined && Buffer.from(existing).equals(Buffer.from(artifact.bytes))) {
        await rm(temporaryPath, { force: true });
        return;
      }
      await rm(outputPath, { force: true });
      await rename(temporaryPath, outputPath);
    }
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    if (error instanceof SfhsPackError) {
      throw error;
    }
    const fileName = basename(outputPath);
    throw new SfhsPackError("SFHS_PACK_WRITE_FAILED", `Unable to write packed artifact: ${fileName}`);
  }
}

export async function packProject(
  startPath: string,
  options: PackOptions = {}
): Promise<PackedArtifact> {
  const plan = await createBuildPlan(startPath);
  const intermediate = await buildIntermediate(plan);
  const artifact = packIntermediate(intermediate, options);
  await writePackedArtifact(plan.outputPath, artifact);
  return artifact;
}
