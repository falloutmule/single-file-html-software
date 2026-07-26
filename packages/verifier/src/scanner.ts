import { parse as parseJavaScript, type Node as JavaScriptNode } from "acorn";
import {
  parse as parseHtml,
  parseFragment as parseHtmlFragment,
  type DefaultTreeAdapterTypes,
  type ParserError
} from "parse5";
import postcss from "postcss";

export type StaticScanFindingCode =
  | "SFHS_SCAN_CSS_PARSE_ERROR"
  | "SFHS_SCAN_EXTERNAL_REFERENCE"
  | "SFHS_SCAN_HTML_PARSE_ERROR"
  | "SFHS_SCAN_JAVASCRIPT_PARSE_ERROR"
  | "SFHS_SCAN_META_REFRESH"
  | "SFHS_SCAN_RUNTIME_CONNECTION"
  | "SFHS_SCAN_RUNTIME_FETCH"
  | "SFHS_SCAN_RUNTIME_IMPORT"
  | "SFHS_SCAN_RUNTIME_RESOURCE"
  | "SFHS_SCAN_RUNTIME_WORKER"
  | "SFHS_SCAN_SERVICE_WORKER"
  | "SFHS_SCAN_SOURCE_MAP"
  | "SFHS_SCAN_UTF8_INVALID";

export type StaticScanSurface = "artifact" | "css" | "html" | "javascript";

export interface StaticScanFinding {
  readonly code: StaticScanFindingCode;
  readonly severity: "error";
  readonly surface: StaticScanSurface;
  readonly location: string;
  readonly message: string;
  readonly reference?: string;
}

export interface StaticScanOptions {
  readonly allowedRuntimeUrls?: readonly string[];
}

export interface StaticScanReport {
  readonly schema: "sfhs.static-scan@1";
  readonly valid: boolean;
  readonly findings: readonly StaticScanFinding[];
}

type Document = DefaultTreeAdapterTypes.Document;
type Element = DefaultTreeAdapterTypes.Element;
type HtmlNode = DefaultTreeAdapterTypes.Node;

interface ScanContext {
  readonly allowedRuntimeUrls: ReadonlySet<string>;
  readonly findings: StaticScanFinding[];
}

interface CssReference {
  readonly offset: number;
  readonly value: string;
}

const urlAttributeNames = new Set([
  "action",
  "background",
  "cite",
  "formaction",
  "href",
  "manifest",
  "ping",
  "poster",
  "src",
  "xlink:href"
]);

const runtimeAssignmentNames = new Set([
  "href",
  "poster",
  "src"
]);

const cssValueAttributeNames = new Set([
  "clip-path",
  "cursor",
  "fill",
  "filter",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "stroke"
]);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function elementChildren(node: HtmlNode): readonly Element[] {
  const found: Element[] = [];
  const children = "childNodes" in node ? node.childNodes : [];
  for (const child of children) {
    if ("tagName" in child) {
      found.push(child);
    }
    found.push(...elementChildren(child));
  }
  return found;
}

function elementText(element: Element): string {
  return element.childNodes
    .map((child) => ("value" in child && typeof child.value === "string" ? child.value : ""))
    .join("");
}

function addFinding(
  context: ScanContext,
  finding: Omit<StaticScanFinding, "severity">
): void {
  context.findings.push(Object.freeze({ ...finding, severity: "error" as const }));
}

function isEmbeddedReference(value: string, context: ScanContext): boolean {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  return (
    context.allowedRuntimeUrls.has(normalized) ||
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower === "about:blank" ||
    normalized.startsWith("#")
  );
}

function scanReference(
  context: ScanContext,
  reference: string,
  surface: StaticScanSurface,
  location: string,
  code: StaticScanFindingCode = "SFHS_SCAN_EXTERNAL_REFERENCE",
  label = "Runtime reference"
): void {
  const normalized = reference.trim();
  if (normalized.length > 0 && isEmbeddedReference(normalized, context)) {
    return;
  }
  addFinding(context, {
    code,
    surface,
    location,
    reference: normalized,
    message: `${label} is not embedded or explicitly allowed.`
  });
}

function srcsetReferences(value: string): readonly string[] {
  const references: string[] = [];
  let index = 0;
  while (index < value.length) {
    while (index < value.length && /[\s,]/u.test(value[index] ?? "")) {
      index += 1;
    }
    const start = index;
    while (index < value.length && !/\s/u.test(value[index] ?? "")) {
      index += 1;
    }
    let candidate = value.slice(start, index);
    if (candidate.endsWith(",")) {
      candidate = candidate.replace(/,+$/u, "");
    } else {
      let parentheses = 0;
      while (index < value.length) {
        const character = value[index] ?? "";
        if (character === "(") {
          parentheses += 1;
        } else if (character === ")") {
          parentheses = Math.max(0, parentheses - 1);
        } else if (character === "," && parentheses === 0) {
          index += 1;
          break;
        }
        index += 1;
      }
    }
    if (candidate.length > 0) {
      references.push(candidate);
    }
  }
  return references;
}

function extractCssUrls(value: string): readonly CssReference[] {
  const references: CssReference[] = [];
  let index = 0;
  while (index < value.length) {
    if (value.startsWith("/*", index)) {
      const end = value.indexOf("*/", index + 2);
      index = end === -1 ? value.length : end + 2;
      continue;
    }
    const quote = value[index];
    if (quote === "\"" || quote === "'") {
      index += 1;
      while (index < value.length) {
        if (value[index] === "\\") {
          index += 2;
        } else if (value[index] === quote) {
          index += 1;
          break;
        } else {
          index += 1;
        }
      }
      continue;
    }
    const remainder = value.slice(index);
    const match = /^url\s*\(/iu.exec(remainder);
    const previous = index === 0 ? "" : value[index - 1] ?? "";
    if (match === null || /[\w-]/u.test(previous)) {
      index += 1;
      continue;
    }
    const referenceOffset = index;
    index += match[0].length;
    while (/\s/u.test(value[index] ?? "")) {
      index += 1;
    }
    const innerQuote = value[index];
    let reference = "";
    if (innerQuote === "\"" || innerQuote === "'") {
      index += 1;
      while (index < value.length && value[index] !== innerQuote) {
        if (value[index] === "\\" && index + 1 < value.length) {
          reference += value[index + 1] ?? "";
          index += 2;
        } else {
          reference += value[index] ?? "";
          index += 1;
        }
      }
      index += 1;
      while (index < value.length && value[index] !== ")") {
        index += 1;
      }
    } else {
      const start = index;
      while (index < value.length && value[index] !== ")") {
        index += 1;
      }
      reference = value.slice(start, index).trim();
    }
    if (value[index] === ")") {
      index += 1;
    }
    references.push({ offset: referenceOffset, value: reference });
  }
  return references;
}

function leadingCssString(value: string): string | undefined {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if (quote !== "\"" && quote !== "'") {
    return undefined;
  }
  let result = "";
  for (let index = 1; index < trimmed.length; index += 1) {
    const character = trimmed[index] ?? "";
    if (character === quote) {
      return result;
    }
    if (character === "\\" && index + 1 < trimmed.length) {
      index += 1;
      result += trimmed[index] ?? "";
    } else {
      result += character;
    }
  }
  return undefined;
}

function scanSourceMapComments(
  context: ScanContext,
  source: string,
  surface: "css" | "javascript",
  location: string
): void {
  const expression = /[#@]\s*sourceMappingURL\s*=\s*([^\s*]+)/giu;
  for (const match of source.matchAll(expression)) {
    scanReference(
      context,
      match[1] ?? "",
      surface,
      `${location}:source-map:${match.index}`,
      "SFHS_SCAN_SOURCE_MAP",
      "Source map reference"
    );
  }
}

function scanCss(
  context: ScanContext,
  source: string,
  location: string,
  declarationList = false
): void {
  scanSourceMapComments(context, source, "css", location);
  try {
    const root = postcss.parse(declarationList ? `sfhs-inline{${source}}` : source, { from: undefined });
    root.walkDecls((declaration) => {
      for (const reference of extractCssUrls(declaration.value)) {
        scanReference(
          context,
          reference.value,
          "css",
          `${location}:declaration:${declaration.prop}:${reference.offset}`
        );
      }
    });
    root.walkAtRules("import", (rule) => {
      const references = extractCssUrls(rule.params);
      const reference = references[0]?.value ?? leadingCssString(rule.params) ?? "";
      scanReference(
        context,
        reference,
        "css",
        `${location}:@import`,
        "SFHS_SCAN_EXTERNAL_REFERENCE",
        "CSS import"
      );
    });
  } catch (error) {
    addFinding(context, {
      code: "SFHS_SCAN_CSS_PARSE_ERROR",
      surface: "css",
      location,
      message: error instanceof Error ? error.message : "CSS parsing failed."
    });
  }
}

function javascriptNode(value: unknown): value is JavaScriptNode {
  const record = asRecord(value);
  return typeof record?.type === "string";
}

function walkJavaScript(node: JavaScriptNode, visit: (node: JavaScriptNode) => void): void {
  visit(node);
  const record = node as unknown as Record<string, unknown>;
  for (const value of Object.values(record)) {
    if (javascriptNode(value)) {
      walkJavaScript(value, visit);
    } else if (Array.isArray(value)) {
      for (const child of value) {
        if (javascriptNode(child)) {
          walkJavaScript(child, visit);
        }
      }
    }
  }
}

function literalString(node: unknown): string | undefined {
  const record = asRecord(node);
  if (record?.type === "Literal" && typeof record.value === "string") {
    return record.value;
  }
  if (record?.type === "TemplateLiteral" && Array.isArray(record.expressions) && record.expressions.length === 0) {
    const quasis = Array.isArray(record.quasis) ? record.quasis : [];
    const quasi = asRecord(quasis[0]);
    const value = asRecord(quasi?.value);
    return typeof value?.cooked === "string" ? value.cooked : undefined;
  }
  return undefined;
}

function memberName(node: unknown): string | undefined {
  const record = asRecord(node);
  if (record?.type !== "MemberExpression") {
    return undefined;
  }
  const property = asRecord(record.property);
  if (record.computed === false && property?.type === "Identifier" && typeof property.name === "string") {
    return property.name;
  }
  return literalString(record.property);
}

function calleePath(node: unknown): string | undefined {
  const record = asRecord(node);
  if (record?.type === "Identifier" && typeof record.name === "string") {
    return record.name;
  }
  if (record?.type !== "MemberExpression") {
    return undefined;
  }
  const object = calleePath(record.object);
  const property = memberName(record);
  return object === undefined || property === undefined ? undefined : `${object}.${property}`;
}

function nodeArguments(node: Record<string, unknown>): readonly unknown[] {
  return Array.isArray(node.arguments) ? node.arguments : [];
}

function javascriptLocation(location: string, node: JavaScriptNode): string {
  return `${location}:${node.start}`;
}

function isBlobObjectUrl(node: unknown): boolean {
  const record = asRecord(node);
  return record?.type === "CallExpression" && calleePath(record.callee) === "URL.createObjectURL";
}

function scanJavaScriptNode(
  context: ScanContext,
  node: JavaScriptNode,
  location: string
): void {
  const record = node as unknown as Record<string, unknown>;
  const nodeLocation = javascriptLocation(location, node);

  if (node.type === "ImportDeclaration" || node.type === "ExportAllDeclaration") {
    const reference = literalString(record.source);
    addFinding(context, {
      code: "SFHS_SCAN_RUNTIME_IMPORT",
      surface: "javascript",
      location: nodeLocation,
      ...(reference === undefined ? {} : { reference }),
      message: "Packed JavaScript retains a module dependency."
    });
    return;
  }
  if (node.type === "ExportNamedDeclaration" && record.source !== null && record.source !== undefined) {
    const reference = literalString(record.source);
    addFinding(context, {
      code: "SFHS_SCAN_RUNTIME_IMPORT",
      surface: "javascript",
      location: nodeLocation,
      ...(reference === undefined ? {} : { reference }),
      message: "Packed JavaScript retains a module dependency."
    });
    return;
  }
  if (node.type === "ImportExpression") {
    const reference = literalString(record.source);
    addFinding(context, {
      code: "SFHS_SCAN_RUNTIME_IMPORT",
      surface: "javascript",
      location: nodeLocation,
      ...(reference === undefined ? {} : { reference }),
      message: "Packed JavaScript contains a dynamic import."
    });
    return;
  }

  if (node.type === "NewExpression") {
    const path = calleePath(record.callee);
    const firstArgument = nodeArguments(record)[0];
    const reference = literalString(firstArgument);
    if ((path === "Worker" || path === "SharedWorker") && !isBlobObjectUrl(firstArgument) && reference !== undefined) {
      scanReference(context, reference, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_WORKER", `${path} URL`);
    } else if ((path === "WebSocket" || path === "EventSource") && reference !== undefined) {
      scanReference(context, reference, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_CONNECTION", `${path} URL`);
    } else if ((path === "Audio" || path === "Request") && reference !== undefined) {
      scanReference(context, reference, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_RESOURCE", `${path} URL`);
    } else if (path === "URL" && reference !== undefined) {
      scanReference(context, reference, "javascript", nodeLocation);
    }
    return;
  }

  if (node.type === "AssignmentExpression") {
    const property = memberName(record.left);
    const reference = literalString(record.right);
    if (property === "srcset" && reference !== undefined) {
      for (const candidate of srcsetReferences(reference)) {
        scanReference(context, candidate, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_RESOURCE", "Runtime srcset assignment");
      }
    } else if (property !== undefined && runtimeAssignmentNames.has(property) && reference !== undefined && reference.length > 0) {
      scanReference(context, reference, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_RESOURCE", `Runtime .${property} assignment`);
    } else if (property === "innerHTML" && reference !== undefined) {
      scanHtmlInto(context, reference, `${nodeLocation}:innerHTML`, true);
    } else if (property !== undefined && property.toLowerCase().includes("background") && reference !== undefined) {
      scanCss(context, `sfhs-runtime{background:${reference}}`, `${nodeLocation}:style`);
    }
    return;
  }

  if (node.type !== "CallExpression") {
    return;
  }
  const path = calleePath(record.callee);
  const argumentsList = nodeArguments(record);
  if (path === "fetch" || path?.endsWith(".fetch") === true) {
    const reference = literalString(argumentsList[0]);
    if (reference !== undefined) {
      scanReference(context, reference, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_FETCH", "Fetch URL");
    }
  } else if (path === "navigator.serviceWorker.register") {
    const reference = literalString(argumentsList[0]);
    addFinding(context, {
      code: "SFHS_SCAN_SERVICE_WORKER",
      surface: "javascript",
      location: nodeLocation,
      ...(reference === undefined ? {} : { reference }),
      message: "Service worker registration is outside the SFHS v0.1 one-file runtime."
    });
  } else if (path === "importScripts" || path?.endsWith(".importScripts") === true) {
    for (const argument of argumentsList) {
      const reference = literalString(argument);
      if (reference !== undefined) {
        scanReference(context, reference, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_IMPORT", "Imported script URL");
      }
    }
  } else if (path?.endsWith(".open") === true && argumentsList.length >= 2) {
    const reference = literalString(argumentsList[1]);
    if (reference !== undefined) {
      scanReference(context, reference, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_FETCH", "Runtime open URL");
    }
  } else if (path?.endsWith(".sendBeacon") === true) {
    const reference = literalString(argumentsList[0]);
    if (reference !== undefined) {
      scanReference(context, reference, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_FETCH", "Beacon URL");
    }
  } else if (path?.endsWith(".setAttribute") === true) {
    const attribute = literalString(argumentsList[0])?.toLowerCase();
    const reference = literalString(argumentsList[1]);
    if (attribute === "srcset" && reference !== undefined) {
      for (const candidate of srcsetReferences(reference)) {
        scanReference(context, candidate, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_RESOURCE", "Runtime srcset attribute");
      }
    } else if (attribute !== undefined && urlAttributeNames.has(attribute) && reference !== undefined) {
      scanReference(context, reference, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_RESOURCE", `Runtime ${attribute} attribute`);
    }
  } else if (path?.endsWith(".setAttributeNS") === true) {
    const attribute = literalString(argumentsList[1])?.toLowerCase();
    const reference = literalString(argumentsList[2]);
    if (attribute !== undefined && urlAttributeNames.has(attribute) && reference !== undefined) {
      scanReference(context, reference, "javascript", nodeLocation, "SFHS_SCAN_RUNTIME_RESOURCE", `Runtime ${attribute} attribute`);
    }
  } else if (path?.endsWith(".insertAdjacentHTML") === true) {
    const markup = literalString(argumentsList[1]);
    if (markup !== undefined) {
      scanHtmlInto(context, markup, `${nodeLocation}:adjacent-html`, true);
    }
  } else if (path === "document.write" || path === "document.writeln") {
    const markup = literalString(argumentsList[0]);
    if (markup !== undefined) {
      scanHtmlInto(context, markup, `${nodeLocation}:document-write`, true);
    }
  }
}

function scanJavaScript(context: ScanContext, source: string, location: string, module: boolean): void {
  scanSourceMapComments(context, source, "javascript", location);
  try {
    const program = parseJavaScript(source, {
      allowHashBang: true,
      ecmaVersion: "latest",
      sourceType: module ? "module" : "script"
    });
    walkJavaScript(program, (node) => scanJavaScriptNode(context, node, location));
  } catch (error) {
    addFinding(context, {
      code: "SFHS_SCAN_JAVASCRIPT_PARSE_ERROR",
      surface: "javascript",
      location,
      message: error instanceof Error ? error.message : "JavaScript parsing failed."
    });
  }
}

function scanHtmlDocument(context: ScanContext, document: HtmlNode, location: string): void {
  const elements = elementChildren(document);
  for (const [index, element] of elements.entries()) {
    const elementLocation = `${location}/${element.tagName}[${index}]`;
    for (const attribute of element.attrs) {
      const attributeName = attribute.name.toLowerCase();
      const attributeLocation = `${elementLocation}@${attributeName}`;
      if (attributeName === "srcset") {
        for (const reference of srcsetReferences(attribute.value)) {
          scanReference(context, reference, "html", attributeLocation);
        }
      } else if (attributeName === "imagesrcset") {
        for (const reference of srcsetReferences(attribute.value)) {
          scanReference(context, reference, "html", attributeLocation);
        }
      } else if (attributeName === "srcdoc") {
        scanHtmlInto(context, attribute.value, `${attributeLocation}:srcdoc`, true);
      } else if (attributeName === "style") {
        scanCss(context, attribute.value, attributeLocation, true);
      } else if (cssValueAttributeNames.has(attributeName)) {
        scanCss(context, `sfhs-svg{${attributeName}:${attribute.value}}`, attributeLocation);
      } else if (attributeName === "data" && element.tagName === "object") {
        scanReference(context, attribute.value, "html", attributeLocation);
      } else if (attributeName === "ping") {
        for (const reference of attribute.value.split(/\s+/u).filter(Boolean)) {
          scanReference(context, reference, "html", attributeLocation);
        }
      } else if (urlAttributeNames.has(attributeName)) {
        scanReference(context, attribute.value, "html", attributeLocation);
      }
    }
    if (element.tagName === "style") {
      scanCss(context, elementText(element), elementLocation);
    } else if (element.tagName === "script") {
      const type = element.attrs.find((attribute) => attribute.name === "type")?.value.toLowerCase();
      if (type === "importmap") {
        addFinding(context, {
          code: "SFHS_SCAN_RUNTIME_IMPORT",
          surface: "javascript",
          location: elementLocation,
          message: "Import maps are outside the SFHS v0.1 one-file runtime."
        });
      } else if (type === "speculationrules") {
        addFinding(context, {
          code: "SFHS_SCAN_RUNTIME_RESOURCE",
          surface: "javascript",
          location: elementLocation,
          message: "Speculation rules may initiate hidden runtime requests."
        });
      } else if (type !== "application/json" && type !== "application/ld+json") {
        scanJavaScript(context, elementText(element), elementLocation, type === "module");
      }
    } else if (element.tagName === "meta") {
      const httpEquiv = element.attrs.find((attribute) => attribute.name === "http-equiv")?.value.toLowerCase();
      if (httpEquiv === "refresh") {
        const content = element.attrs.find((attribute) => attribute.name === "content")?.value ?? "";
        const match = /(?:^|;)\s*url\s*=\s*(.+)$/iu.exec(content);
        if (match !== null) {
          scanReference(context, match[1] ?? "", "html", elementLocation, "SFHS_SCAN_META_REFRESH", "Meta refresh URL");
        }
      }
    }
  }
}

function scanHtmlInto(context: ScanContext, source: string, location: string, fragment = false): void {
  const options = {
    onParseError(error: ParserError) {
      addFinding(context, {
        code: "SFHS_SCAN_HTML_PARSE_ERROR",
        surface: "html",
        location: `${location}:${error.startOffset}`,
        message: error.code
      });
    }
  };
  const document: Document | DefaultTreeAdapterTypes.DocumentFragment = fragment
    ? parseHtmlFragment(source, options)
    : parseHtml(source, options);
  scanHtmlDocument(context, document, location);
}

function sortFindings(findings: readonly StaticScanFinding[]): readonly StaticScanFinding[] {
  return [...findings].sort((left, right) => {
    const byLocation = left.location.localeCompare(right.location);
    if (byLocation !== 0) {
      return byLocation;
    }
    const byCode = left.code.localeCompare(right.code);
    if (byCode !== 0) {
      return byCode;
    }
    return (left.reference ?? "").localeCompare(right.reference ?? "");
  });
}

function report(findings: readonly StaticScanFinding[]): StaticScanReport {
  const sorted = sortFindings(findings);
  return Object.freeze({
    schema: "sfhs.static-scan@1",
    valid: sorted.length === 0,
    findings: Object.freeze(sorted)
  });
}

export function scanPackedHtml(source: string, options: StaticScanOptions = {}): StaticScanReport {
  const context: ScanContext = {
    allowedRuntimeUrls: new Set(options.allowedRuntimeUrls ?? []),
    findings: []
  };
  scanHtmlInto(context, source, "html");
  return report(context.findings);
}

export function scanPackedBytes(bytes: Uint8Array, options: StaticScanOptions = {}): StaticScanReport {
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return scanPackedHtml(source, options);
  } catch {
    return report([{
      code: "SFHS_SCAN_UTF8_INVALID",
      severity: "error",
      surface: "artifact",
      location: "artifact",
      message: "Packed artifact is not valid UTF-8."
    }]);
  }
}
