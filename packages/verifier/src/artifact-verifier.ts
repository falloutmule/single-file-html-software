import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { parse, type DefaultTreeAdapterTypes } from "parse5";

import {
  type SfhsArtifactManifest,
  validateArtifactManifest
} from "@sfhs/contracts";
import { resolveProjectPath, sha256Bytes } from "@sfhs/core";

import {
  scanPackedBytes,
  type StaticScanFinding,
  type StaticScanFindingCode
} from "./scanner.ts";

export type ArtifactVerificationFindingCode =
  | StaticScanFindingCode
  | "SFHS_VERIFY_ARTIFACT_MISSING"
  | "SFHS_VERIFY_BUILD_ID_MISMATCH"
  | "SFHS_VERIFY_DESCRIPTOR_INVALID"
  | "SFHS_VERIFY_INLINE_ENTRY_INVALID"
  | "SFHS_VERIFY_INLINE_STYLES_INVALID"
  | "SFHS_VERIFY_OUTPUT_SET_INVALID"
  | "SFHS_VERIFY_SHA256_MISMATCH"
  | "SFHS_VERIFY_SIZE_MISMATCH"
  | "SFHS_VERIFY_SOURCE_SHA256_MISMATCH";

export interface ArtifactVerificationFinding {
  readonly code: ArtifactVerificationFindingCode;
  readonly severity: "error";
  readonly surface: "artifact" | "css" | "html" | "javascript";
  readonly location: string;
  readonly message: string;
  readonly reference?: string;
}

export interface ArtifactVerificationReport {
  readonly schema: "sfhs.artifact-verification@1";
  readonly valid: boolean;
  readonly artifact: {
    readonly bytes: number;
    readonly sha256: string;
  };
  readonly findings: readonly ArtifactVerificationFinding[];
}

type Element = DefaultTreeAdapterTypes.Element;
type HtmlNode = DefaultTreeAdapterTypes.Node;

function elementsIn(node: HtmlNode): readonly Element[] {
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

function attribute(element: Element, name: string): string | undefined {
  return element.attrs.find((candidate) => candidate.name === name)?.value;
}

function finding(
  code: ArtifactVerificationFindingCode,
  location: string,
  message: string
): ArtifactVerificationFinding {
  return Object.freeze({ code, severity: "error", surface: "artifact", location, message });
}

function sortFindings(
  findings: readonly ArtifactVerificationFinding[]
): readonly ArtifactVerificationFinding[] {
  return Object.freeze([...findings].sort((left, right) => {
    const byLocation = left.location.localeCompare(right.location);
    if (byLocation !== 0) {
      return byLocation;
    }
    return left.code.localeCompare(right.code);
  }));
}

function report(
  bytes: Uint8Array,
  findings: readonly ArtifactVerificationFinding[]
): ArtifactVerificationReport {
  const sorted = sortFindings(findings);
  return Object.freeze({
    schema: "sfhs.artifact-verification@1",
    valid: sorted.length === 0,
    artifact: Object.freeze({ bytes: bytes.byteLength, sha256: sha256Bytes(bytes) }),
    findings: sorted
  });
}

function descriptorFindings(value: unknown): readonly ArtifactVerificationFinding[] {
  const validation = validateArtifactManifest(value);
  return validation.findings.map((validationFinding) => finding(
    "SFHS_VERIFY_DESCRIPTOR_INVALID",
    `descriptor${validationFinding.path}`,
    `${validationFinding.code}: ${validationFinding.message}`
  ));
}

function metadataContent(elements: readonly Element[], name: string): readonly string[] {
  return elements
    .filter((element) => element.tagName === "meta" && attribute(element, "name") === name)
    .map((element) => attribute(element, "content") ?? "");
}

function inlineContractFindings(
  bytes: Uint8Array,
  descriptor: SfhsArtifactManifest
): readonly ArtifactVerificationFinding[] {
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return [];
  }
  const document = parse(source);
  const elements = elementsIn(document);
  const findings: ArtifactVerificationFinding[] = [];
  const entryScripts = elements.filter(
    (element) => element.tagName === "script" && attribute(element, "data-sfhs-inline") === "entry"
  );
  const sourceScripts = elements.filter(
    (element) => element.tagName === "script" && attribute(element, "src") !== undefined
  );
  if (entryScripts.length !== 1 || sourceScripts.length !== 0) {
    findings.push(finding(
      "SFHS_VERIFY_INLINE_ENTRY_INVALID",
      "html/script",
      "Artifact requires exactly one SFHS inline entry script and no script src attributes."
    ));
  }

  const inlineStyles = elements.filter(
    (element) => element.tagName === "style" && attribute(element, "data-sfhs-inline") === "styles"
  );
  const stylesheetLinks = elements.filter(
    (element) => element.tagName === "link" &&
      (attribute(element, "rel") ?? "").split(/\s+/u).includes("stylesheet")
  );
  if (inlineStyles.length !== 1 || stylesheetLinks.length !== 0) {
    findings.push(finding(
      "SFHS_VERIFY_INLINE_STYLES_INVALID",
      "html/style",
      "Artifact requires exactly one SFHS inline stylesheet and no stylesheet links."
    ));
  }

  const buildIds = metadataContent(elements, "sfhs-build-id");
  if (buildIds.length !== 1 || buildIds[0] !== descriptor.artifact.buildId) {
    findings.push(finding(
      "SFHS_VERIFY_BUILD_ID_MISMATCH",
      "html/meta/sfhs-build-id",
      "Embedded build ID does not match the artifact descriptor."
    ));
  }
  const sourceHashes = metadataContent(elements, "sfhs-source-sha256");
  if (sourceHashes.length !== 1 || sourceHashes[0] !== descriptor.source.sha256) {
    findings.push(finding(
      "SFHS_VERIFY_SOURCE_SHA256_MISMATCH",
      "html/meta/sfhs-source-sha256",
      "Embedded source SHA-256 does not match the artifact descriptor."
    ));
  }
  return findings;
}

export function verifyArtifactBytes(
  bytes: Uint8Array,
  descriptorValue: unknown
): ArtifactVerificationReport {
  const findings = [...descriptorFindings(descriptorValue)];
  const scan = scanPackedBytes(bytes);
  findings.push(...scan.findings as readonly StaticScanFinding[]);
  if (findings.some((candidate) => candidate.code === "SFHS_VERIFY_DESCRIPTOR_INVALID")) {
    return report(bytes, findings);
  }

  const descriptor = descriptorValue as SfhsArtifactManifest;
  if (bytes.byteLength !== descriptor.artifact.bytes) {
    findings.push(finding(
      "SFHS_VERIFY_SIZE_MISMATCH",
      "artifact/bytes",
      `Artifact has ${bytes.byteLength} bytes; descriptor declares ${descriptor.artifact.bytes}.`
    ));
  }
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== descriptor.artifact.sha256) {
    findings.push(finding(
      "SFHS_VERIFY_SHA256_MISMATCH",
      "artifact/sha256",
      "Artifact SHA-256 does not match the descriptor."
    ));
  }
  findings.push(...inlineContractFindings(bytes, descriptor));
  return report(bytes, findings);
}

async function outputEntries(root: string, relativePath = ""): Promise<readonly string[]> {
  const directory = join(root, relativePath);
  const entries = await readdir(directory, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(relativePath, entry.name);
    if (entry.isDirectory()) {
      found.push(...await outputEntries(root, entryPath));
    } else {
      found.push(entryPath.replaceAll("\\", "/"));
    }
  }
  return found;
}

export async function verifyArtifactFile(
  projectRoot: string,
  descriptor: SfhsArtifactManifest
): Promise<ArtifactVerificationReport> {
  const descriptorErrors = descriptorFindings(descriptor);
  if (descriptorErrors.length > 0) {
    return report(new Uint8Array(), descriptorErrors);
  }

  let artifactPath: string;
  try {
    artifactPath = await resolveProjectPath(projectRoot, descriptor.artifact.path);
  } catch {
    return report(new Uint8Array(), [finding(
      "SFHS_VERIFY_ARTIFACT_MISSING",
      "artifact/path",
      "Artifact path cannot be resolved inside the project."
    )]);
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await readFile(artifactPath));
  } catch {
    return report(new Uint8Array(), [finding(
      "SFHS_VERIFY_ARTIFACT_MISSING",
      "artifact/path",
      "Artifact file is missing or unreadable."
    )]);
  }

  const verified = verifyArtifactBytes(bytes, descriptor);
  const findings = [...verified.findings];
  const outputRoot = join(projectRoot, descriptor.artifact.path.split("/")[0] ?? "dist");
  let entries: readonly string[] = [];
  try {
    entries = await outputEntries(outputRoot);
  } catch {
    entries = [];
  }
  const expectedRelative = descriptor.artifact.path.split("/").slice(1).join("/");
  if (entries.length !== 1 || entries[0] !== expectedRelative || basename(artifactPath) !== "index.html") {
    findings.push(finding(
      "SFHS_VERIFY_OUTPUT_SET_INVALID",
      `artifact/${dirname(descriptor.artifact.path)}`,
      `Release output must contain only ${expectedRelative || "index.html"}; found ${entries.join(", ") || "none"}.`
    ));
  }
  return report(bytes, findings);
}
