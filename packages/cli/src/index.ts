import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

import {
  buildProject,
  SfhsBuildError,
  type BuildErrorCode,
  type IntermediateBundle
} from "@sfhs/builder";
import {
  runPixiArtifactScenarios
} from "@sfhs/browser-runner";
import {
  canonicalJsonStringify,
  type JsonValue,
  type SfhsArtifactManifest,
  type SfhsEvidenceManifest,
  type SfhsPhysicalDeviceAcceptanceManifest,
  type ValidationFinding,
  type ValidationFindingCode,
  validatePhysicalDeviceAcceptanceManifest,
  validateProjectManifest
} from "@sfhs/contracts";
import {
  discoverProject,
  type CoreErrorCode,
  type DiscoveredProject,
  resolveProjectPath,
  sha256Bytes,
  SfhsCoreError
} from "@sfhs/core";
import {
  type EvidenceErrorCode,
  SfhsEvidenceError,
  writeEvidenceRun
} from "@sfhs/evidence";
import {
  auditOneShotProject,
  buildOneShotKit,
  initializeOneShotProject,
  inspectOneShotProject,
  type OneShotFindingCode,
  type OneShotInspection
} from "@sfhs/one-shot";
import {
  packIntermediate,
  packProject,
  SfhsPackError,
  type PackErrorCode,
  type PackedArtifact
} from "@sfhs/packer";
import {
  type ArtifactVerificationFinding,
  type ArtifactVerificationFindingCode,
  verifyArtifactFile
} from "@sfhs/verifier";
import {
  releasePreparationSteps,
  selectProportionalTestPlan,
  type ProportionalTestPlan,
  type TestSelectionMode,
  type TestStepDefinition
} from "./test-selection.ts";

export const packageIdentity = "@sfhs/cli" as const;

export type CliCommand =
  | "build"
  | "check"
  | "doctor"
  | "inspect"
  | "one-shot audit"
  | "one-shot init"
  | "one-shot inspect"
  | "one-shot kit"
  | "pack"
  | "release prepare"
  | "test"
  | "validate"
  | "verify";
export type CliEnvelopeCommand = CliCommand | "unknown";
export type CliExitCode = 0 | 1 | 2;
export type CliFindingCode =
  | CoreErrorCode
  | BuildErrorCode
  | PackErrorCode
  | ArtifactVerificationFindingCode
  | EvidenceErrorCode
  | OneShotFindingCode
  | ValidationFindingCode
  | "SFHS_CLI_ARGUMENT_INVALID"
  | "SFHS_CLI_IO_FAILURE"
  | "SFHS_MANIFEST_PARSE_INVALID"
  | "SFHS_NODE_VERSION_UNSUPPORTED"
  | "SFHS_RELEASE_ARTIFACT_DRIFT"
  | "SFHS_RELEASE_BROWSER_FAILED"
  | "SFHS_RELEASE_DEVICE_ARTIFACT_MISMATCH"
  | "SFHS_RELEASE_DEVICE_EVIDENCE_INVALID"
  | "SFHS_RELEASE_PHYSICAL_DEVICE_REQUIRED"
  | "SFHS_TEST_SELECTION_REVIEW_REQUIRED"
  | "SFHS_TEST_STEP_FAILED";

export interface CliFinding {
  readonly code: CliFindingCode;
  readonly severity: "error" | "warning";
  readonly path: string;
  readonly message: string;
}

export interface CliProjectSummary {
  readonly root: string;
  readonly manifestPath: string;
  readonly id?: string;
  readonly title?: string;
  readonly version?: string;
  readonly adapterId?: string;
}

export interface CliBuildSummary {
  readonly sourceSha256: string;
  readonly outputPath: string;
  readonly moduleInputs: readonly string[];
  readonly declaredAssetCount: number;
  readonly emittedAssetCount: number;
}

export interface CliArtifactSummary {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly buildId: string;
  readonly sourceSha256: string;
}

export interface CliTestStepResult {
  readonly id: string;
  readonly command: string;
  readonly exitCode: number;
  readonly status: "failed" | "passed" | "skipped";
}

export interface CliTestPlanSummary {
  readonly schema: "sfhs.test-plan@1";
  readonly mode: TestSelectionMode;
  readonly changedPaths: readonly string[];
  readonly reviewRequired: boolean;
  readonly reviewReason?: string;
  readonly steps: readonly CliTestStepResult[];
}

export interface CliReleaseSummary {
  readonly status: "blocked" | "failed" | "prepared";
  readonly blockers: readonly string[];
  readonly evidenceDirectory?: string;
  readonly evidenceManifestPath?: string;
  readonly commands: readonly CliTestStepResult[];
}

export interface CliEnvelope {
  readonly schema: "sfhs.cli@1";
  readonly command: CliEnvelopeCommand;
  readonly ok: boolean;
  readonly exitCode: CliExitCode;
  readonly findings: readonly CliFinding[];
  readonly project?: CliProjectSummary;
  readonly build?: CliBuildSummary;
  readonly artifact?: CliArtifactSummary;
  readonly testPlan?: CliTestPlanSummary;
  readonly release?: CliReleaseSummary;
  readonly oneShot?: {
    readonly lane?: string;
    readonly packet?: Readonly<Record<string, string>>;
  };
  readonly runtime?: {
    readonly node: string;
  };
}

export interface CliRunOptions {
  readonly cwd?: string;
  readonly nodeVersion?: string;
  readonly sourceRevision?: string;
  readonly workspaceRoot?: string;
  readonly commandExecutor?: CliCommandExecutor;
  readonly now?: () => Date;
  readonly runId?: string;
  readonly releaseBrowserRunner?: CliReleaseBrowserRunner;
}

export interface CliRunResult {
  readonly exitCode: CliExitCode;
  readonly stdout: string;
  readonly stderr: string;
  readonly envelope: CliEnvelope;
}

interface ParsedArguments {
  readonly command: CliCommand;
  readonly json: boolean;
  readonly projectArgument?: string;
  readonly changedPaths: readonly string[];
  readonly evidenceArgument?: string;
  readonly deviceEvidenceArgument?: string;
  readonly briefArgument?: string;
  readonly outputArgument?: string;
  readonly laneArgument?: string;
}

export interface CliCommandExecution {
  readonly exitCode: number;
}

export type CliCommandExecutor = (
  step: TestStepDefinition,
  workspaceRoot: string
) => Promise<CliCommandExecution>;

export interface CliReleaseBrowserScreenshot {
  readonly id: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
}

export interface CliReleaseBrowserResult {
  readonly valid: boolean;
  readonly browserVersion: string;
  readonly screenshots: readonly CliReleaseBrowserScreenshot[];
}

export type CliReleaseBrowserRunner = (
  bytes: Uint8Array,
  descriptor: SfhsArtifactManifest,
  evidenceDirectory: string
) => Promise<CliReleaseBrowserResult>;

const usage = "Usage: sfhs <doctor|inspect|validate|build|pack|verify|test|check|release prepare|one-shot init|one-shot inspect|one-shot audit|one-shot kit> [--project <path>] [--brief <path>] [--output <path>] [--lane <id>] [--changed <path>]... [--evidence <dir>] [--device-evidence <file>] [--json]";
const execFileAsync = promisify(execFile);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function sortFindings(findings: readonly CliFinding[]): readonly CliFinding[] {
  return [...findings].sort((left, right) => {
    const byPath = left.path.localeCompare(right.path);
    if (byPath !== 0) {
      return byPath;
    }

    const byCode = left.code.localeCompare(right.code);
    return byCode === 0 ? left.severity.localeCompare(right.severity) : byCode;
  });
}

function hasErrors(findings: readonly CliFinding[]): boolean {
  return findings.some((finding) => finding.severity === "error");
}

function findingsFromValidation(findings: readonly ValidationFinding[]): readonly CliFinding[] {
  return findings.map(({ code, severity, path, message }) => ({ code, severity, path, message }));
}

function coreFinding(error: unknown, path: string): CliFinding {
  if (error instanceof SfhsCoreError) {
    return { code: error.code, severity: "error", path, message: error.message };
  }

  return {
    code: "SFHS_CLI_IO_FAILURE",
    severity: "error",
    path,
    message: "SFHS could not safely read a required project path."
  };
}

function parseArguments(argv: readonly string[]): ParsedArguments | CliFinding {
  const commandCandidate: string = (argv[0] === "release" && argv[1] === "prepare"
    ? "release prepare"
    : argv[0] === "one-shot" && ["init", "inspect", "audit", "kit"].includes(argv[1] ?? "")
      ? `one-shot ${argv[1]!}`
      : argv[0]) ?? "";
  const optionStart = commandCandidate === "release prepare" || commandCandidate.startsWith("one-shot ") ? 2 : 1;
  if (
    commandCandidate !== "doctor" &&
    commandCandidate !== "inspect" &&
    commandCandidate !== "one-shot init" &&
    commandCandidate !== "one-shot inspect" &&
    commandCandidate !== "one-shot audit" &&
    commandCandidate !== "one-shot kit" &&
    commandCandidate !== "validate" &&
    commandCandidate !== "build" &&
    commandCandidate !== "check" &&
    commandCandidate !== "pack" &&
    commandCandidate !== "release prepare" &&
    commandCandidate !== "test" &&
    commandCandidate !== "verify"
  ) {
    return {
      code: "SFHS_CLI_ARGUMENT_INVALID",
      severity: "error",
      path: "/argv/0",
      message: usage
    };
  }

  let json = false;
  let projectArgument: string | undefined;
  let evidenceArgument: string | undefined;
  let deviceEvidenceArgument: string | undefined;
  let briefArgument: string | undefined;
  let outputArgument: string | undefined;
  let laneArgument: string | undefined;
  const changedPaths: string[] = [];

  for (let index = optionStart; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      json = true;
      continue;
    }

    if (argument === "--project") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--") || projectArgument !== undefined) {
        return {
          code: "SFHS_CLI_ARGUMENT_INVALID",
          severity: "error",
          path: "/argv",
          message: usage
        };
      }

      projectArgument = value;
      index += 1;
      continue;
    }

    if (argument === "--brief" || argument === "--output" || argument === "--lane") {
      const value = argv[index + 1];
      const existing = argument === "--brief" ? briefArgument : argument === "--output" ? outputArgument : laneArgument;
      if (value === undefined || value.startsWith("--") || value.length === 0 || existing !== undefined) {
        return { code: "SFHS_CLI_ARGUMENT_INVALID", severity: "error", path: "/argv", message: usage };
      }
      if (argument === "--brief") briefArgument = value;
      if (argument === "--output") outputArgument = value;
      if (argument === "--lane") laneArgument = value;
      index += 1;
      continue;
    }

    if (argument === "--changed") {
      const value = argv[index + 1];
      const normalized = value?.replaceAll("\\", "/");
      if (
        value === undefined ||
        value.startsWith("--") ||
        normalized === undefined ||
        normalized.length === 0 ||
        isAbsolute(value) ||
        normalized.split("/").includes("..")
      ) {
        return {
          code: "SFHS_CLI_ARGUMENT_INVALID",
          severity: "error",
          path: "/argv",
          message: usage
        };
      }
      changedPaths.push(normalized);
      index += 1;
      continue;
    }

    if (argument === "--evidence" || argument === "--device-evidence") {
      const value = argv[index + 1];
      const alreadySet = argument === "--evidence"
        ? evidenceArgument !== undefined
        : deviceEvidenceArgument !== undefined;
      if (value === undefined || value.startsWith("--") || value.length === 0 || alreadySet) {
        return {
          code: "SFHS_CLI_ARGUMENT_INVALID",
          severity: "error",
          path: "/argv",
          message: usage
        };
      }
      if (argument === "--evidence") {
        evidenceArgument = value;
      } else {
        deviceEvidenceArgument = value;
      }
      index += 1;
      continue;
    }

    return {
      code: "SFHS_CLI_ARGUMENT_INVALID",
      severity: "error",
      path: `/argv/${index}`,
      message: usage
    };
  }

  if (changedPaths.length > 0 && commandCandidate !== "test" && commandCandidate !== "check") {
    return {
      code: "SFHS_CLI_ARGUMENT_INVALID",
      severity: "error",
      path: "/argv",
      message: usage
    };
  }
  if (
    commandCandidate === "release prepare"
      ? evidenceArgument === undefined
      : evidenceArgument !== undefined || deviceEvidenceArgument !== undefined
  ) {
    return {
      code: "SFHS_CLI_ARGUMENT_INVALID",
      severity: "error",
      path: "/argv",
      message: usage
    };
  }
  const oneShotInit = commandCandidate === "one-shot init";
  const oneShotProject = commandCandidate === "one-shot inspect" || commandCandidate === "one-shot audit";
  const oneShotKit = commandCandidate === "one-shot kit";
  if (
    (oneShotInit && (briefArgument === undefined || outputArgument === undefined || laneArgument === undefined || projectArgument !== undefined)) ||
    (oneShotProject && (projectArgument === undefined || briefArgument !== undefined || outputArgument !== undefined || laneArgument !== undefined)) ||
    (oneShotKit && (outputArgument === undefined || projectArgument !== undefined || briefArgument !== undefined || laneArgument !== undefined)) ||
    (!oneShotInit && !oneShotProject && !oneShotKit && (briefArgument !== undefined || outputArgument !== undefined || laneArgument !== undefined))
  ) return { code: "SFHS_CLI_ARGUMENT_INVALID", severity: "error", path: "/argv", message: usage };

  return {
    command: commandCandidate,
    json,
    changedPaths: Object.freeze([...changedPaths]),
    ...(projectArgument === undefined ? {} : { projectArgument }),
    ...(evidenceArgument === undefined ? {} : { evidenceArgument }),
    ...(deviceEvidenceArgument === undefined ? {} : { deviceEvidenceArgument }),
    ...(briefArgument === undefined ? {} : { briefArgument }),
    ...(outputArgument === undefined ? {} : { outputArgument }),
    ...(laneArgument === undefined ? {} : { laneArgument })
  };
}

function isParsedArguments(value: ParsedArguments | CliFinding): value is ParsedArguments {
  return "command" in value;
}

function projectSummary(discovery: DiscoveredProject, manifest: unknown): CliProjectSummary {
  const rootManifest = asRecord(manifest);
  const project = asRecord(rootManifest?.project);
  const adapter = asRecord(rootManifest?.adapter);
  const id = project?.id;
  const title = project?.title;
  const version = project?.version;
  const adapterId = adapter?.id;

  return {
    root: discovery.projectRoot,
    manifestPath: discovery.manifestPath,
    ...(typeof id === "string" ? { id } : {}),
    ...(typeof title === "string" ? { title } : {}),
    ...(typeof version === "string" ? { version } : {}),
    ...(typeof adapterId === "string" ? { adapterId } : {})
  };
}

function supportedNodeFinding(nodeVersion: string): CliFinding | undefined {
  const match = /^v?(\d+)/u.exec(nodeVersion);
  const majorVersion = match?.[1] === undefined ? undefined : Number(match[1]);

  if (majorVersion !== undefined && Number.isInteger(majorVersion) && majorVersion >= 24) {
    return undefined;
  }

  return {
    code: "SFHS_NODE_VERSION_UNSUPPORTED",
    severity: "error",
    path: "/runtime/node",
    message: "SFHS requires Node.js 24 or newer."
  };
}

async function readManifest(manifestPath: string): Promise<unknown | CliFinding> {
  let contents: string;
  try {
    contents = await readFile(manifestPath, "utf8");
  } catch {
    return {
      code: "SFHS_CLI_IO_FAILURE",
      severity: "error",
      path: "/manifest",
      message: "SFHS could not read the discovered project manifest."
    };
  }

  try {
    return JSON.parse(contents) as unknown;
  } catch {
    return {
      code: "SFHS_MANIFEST_PARSE_INVALID",
      severity: "error",
      path: "/",
      message: "The project manifest is not valid JSON."
    };
  }
}

function isCliFinding(value: unknown | CliFinding): value is CliFinding {
  return asRecord(value)?.code !== undefined;
}

async function appendProjectPathFinding(
  findings: CliFinding[],
  projectRoot: string,
  path: string,
  value: unknown
): Promise<void> {
  if (typeof value !== "string") {
    return;
  }

  try {
    await resolveProjectPath(projectRoot, value);
  } catch (error) {
    findings.push(coreFinding(error, path));
  }
}

async function projectPathFindings(manifest: unknown, projectRoot: string): Promise<readonly CliFinding[]> {
  const rootManifest = asRecord(manifest);
  const source = asRecord(rootManifest?.source);
  const assets = asRecord(rootManifest?.assets);
  const build = asRecord(rootManifest?.build);
  const findings: CliFinding[] = [];

  await appendProjectPathFinding(findings, projectRoot, "/source/html", source?.html);
  await appendProjectPathFinding(findings, projectRoot, "/source/entry", source?.entry);
  await appendProjectPathFinding(findings, projectRoot, "/source/publicDir", source?.publicDir);

  if (Array.isArray(source?.styles)) {
    for (const [index, value] of source.styles.entries()) {
      await appendProjectPathFinding(findings, projectRoot, `/source/styles/${index}`, value);
    }
  }

  await appendProjectPathFinding(findings, projectRoot, "/assets/manifest", assets?.manifest);
  await appendProjectPathFinding(findings, projectRoot, "/build/output", build?.output);
  return findings;
}

function formatHuman(envelope: CliEnvelope): string {
  const lines = [`${envelope.ok ? "PASS" : "FAIL"} ${envelope.command}`];

  if (envelope.runtime !== undefined) {
    lines.push(`node: ${envelope.runtime.node}`);
  }

  if (envelope.project !== undefined) {
    lines.push(`project: ${envelope.project.root}`);
    lines.push(`manifest: ${envelope.project.manifestPath}`);
    if (envelope.project.id !== undefined) {
      lines.push(`project-id: ${envelope.project.id}`);
    }
  }

  if (envelope.build !== undefined) {
    lines.push(`source-sha256: ${envelope.build.sourceSha256}`);
    lines.push(`output: ${envelope.build.outputPath}`);
  }

  if (envelope.artifact !== undefined) {
    lines.push(`artifact: ${envelope.artifact.path}`);
    lines.push(`artifact-bytes: ${envelope.artifact.bytes}`);
    lines.push(`artifact-sha256: ${envelope.artifact.sha256}`);
    lines.push(`build-id: ${envelope.artifact.buildId}`);
  }

  if (envelope.testPlan !== undefined) {
    for (const step of envelope.testPlan.steps) {
      lines.push(`${step.status.toUpperCase()} ${step.command} (exit ${step.exitCode})`);
    }
    if (envelope.testPlan.reviewReason !== undefined) {
      lines.push(`review: ${envelope.testPlan.reviewReason}`);
    }
  }

  if (envelope.release !== undefined) {
    lines.push(`release-status: ${envelope.release.status}`);
    if (envelope.release.evidenceManifestPath !== undefined) {
      lines.push(`evidence: ${envelope.release.evidenceManifestPath}`);
    }
    for (const blocker of envelope.release.blockers) {
      lines.push(`blocker: ${blocker}`);
    }
  }

  if (envelope.findings.length === 0) {
    lines.push("findings: none");
  } else {
    for (const finding of envelope.findings) {
      lines.push(`${finding.severity.toUpperCase()} ${finding.code} ${finding.path}: ${finding.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function resultFor(envelope: CliEnvelope, json: boolean): CliRunResult {
  return {
    exitCode: envelope.exitCode,
    stdout: json
      ? `${canonicalJsonStringify(envelope as unknown as JsonValue)}\n`
      : formatHuman(envelope),
    stderr: "",
    envelope
  };
}

function argumentResult(finding: CliFinding, json: boolean): CliRunResult {
  const envelope: CliEnvelope = {
    schema: "sfhs.cli@1",
    command: "unknown",
    ok: false,
    exitCode: 2,
    findings: [finding]
  };

  return resultFor(envelope, json);
}

function oneShotEnvelope(command: CliCommand, inspection: OneShotInspection | undefined, findings: readonly CliFinding[]): CliEnvelope {
  return {
    schema: "sfhs.cli@1",
    command,
    ok: !hasErrors(findings),
    exitCode: hasErrors(findings) ? 1 : 0,
    findings: sortFindings(findings),
    ...(inspection === undefined ? {} : {
      oneShot: {
        ...(inspection.lane === undefined ? {} : { lane: inspection.lane }),
        packet: inspection.packet
      }
    })
  };
}

async function currentRevision(workingDirectory: string, configured: string | undefined): Promise<string> {
  if (configured !== undefined) return configured;
  if (process.env.GITHUB_SHA !== undefined) return process.env.GITHUB_SHA;
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: workingDirectory });
    const revision = stdout.trim();
    return /^[a-f0-9]{40}$/u.test(revision) ? revision : "local-unresolved";
  } catch { return "local-unresolved"; }
}

async function runOneShotCommand(parsed: ParsedArguments, options: CliRunOptions, workingDirectory: string): Promise<CliRunResult> {
  const revision = await currentRevision(options.workspaceRoot ?? workingDirectory, options.sourceRevision);
  if (parsed.command === "one-shot init") {
    const initialized = await initializeOneShotProject({
      briefPath: resolve(workingDirectory, parsed.briefArgument!),
      outputPath: resolve(workingDirectory, parsed.outputArgument!),
      lane: parsed.laneArgument!,
      revision
    });
    return resultFor(oneShotEnvelope(parsed.command, undefined, initialized.findings), parsed.json);
  }
  if (parsed.command === "one-shot kit") {
    const built = await buildOneShotKit(resolve(workingDirectory, parsed.outputArgument!), { revision });
    return resultFor(oneShotEnvelope(parsed.command, undefined, built.findings), parsed.json);
  }
  const project = resolve(workingDirectory, parsed.projectArgument!);
  if (parsed.command === "one-shot inspect") {
    const inspection = await inspectOneShotProject(project);
    return resultFor(oneShotEnvelope(parsed.command, inspection, inspection.findings), parsed.json);
  }
  const verification = await runCli(["verify", "--json", "--project", project], options);
  const artifact = verification.exitCode === 0 ? verification.envelope.artifact : undefined;
  const audit = await auditOneShotProject(project, {
    ...(artifact === undefined ? {} : { canonicalArtifact: { path: artifact.path, sha256: artifact.sha256, buildId: artifact.buildId } })
  });
  return resultFor(oneShotEnvelope(parsed.command, audit, audit.findings), parsed.json);
}

function buildSummary(intermediate: IntermediateBundle): CliBuildSummary {
  return {
    sourceSha256: intermediate.sourceSha256,
    outputPath: intermediate.outputPath,
    moduleInputs: intermediate.moduleInputs,
    declaredAssetCount: intermediate.declaredAssets.length,
    emittedAssetCount: intermediate.emittedAssets.length
  };
}

function artifactSummary(artifact: PackedArtifact): CliArtifactSummary {
  return {
    path: artifact.descriptor.artifact.path,
    bytes: artifact.descriptor.artifact.bytes,
    sha256: artifact.descriptor.artifact.sha256,
    buildId: artifact.descriptor.artifact.buildId,
    sourceSha256: artifact.descriptor.source.sha256
  };
}

function findingFromOperation(error: unknown): CliFinding {
  if (error instanceof SfhsBuildError || error instanceof SfhsPackError) {
    return { code: error.code, severity: "error", path: "/operation", message: error.message };
  }
  return {
    code: "SFHS_CLI_IO_FAILURE",
    severity: "error",
    path: "/operation",
    message: "SFHS could not complete the requested project operation."
  };
}

function findingsFromArtifactVerification(
  findings: readonly ArtifactVerificationFinding[]
): readonly CliFinding[] {
  return findings.map(({ code, location, message }) => ({
    code,
    severity: "error" as const,
    path: `/${location}`,
    message
  }));
}

const defaultCommandExecutor: CliCommandExecutor = async (step, workspaceRoot) => new Promise((resolvePromise) => {
  const pnpmEntry = process.env.npm_execpath;
  const useNodeEntry = process.platform === "win32" && pnpmEntry !== undefined;
  const executable = useNodeEntry ? process.execPath : step.executable;
  const arguments_ = useNodeEntry ? [pnpmEntry, ...step.arguments] : [...step.arguments];
  try {
    const child = spawn(executable, arguments_, {
      cwd: workspaceRoot,
      env: process.env,
      shell: false,
      stdio: "ignore"
    });
    child.once("error", () => resolvePromise({ exitCode: 1 }));
    child.once("close", (code) => resolvePromise({ exitCode: code ?? 1 }));
  } catch {
    resolvePromise({ exitCode: 1 });
  }
});

async function executeTestPlan(
  plan: ProportionalTestPlan,
  workspaceRoot: string,
  executor: CliCommandExecutor
): Promise<readonly CliTestStepResult[]> {
  const results: CliTestStepResult[] = [];
  let failed = false;
  for (const step of plan.steps) {
    if (failed) {
      results.push({ id: step.id, command: step.command, exitCode: -1, status: "skipped" });
      continue;
    }
    const execution = await executor(step, workspaceRoot);
    const status = execution.exitCode === 0 ? "passed" : "failed";
    results.push({ id: step.id, command: step.command, exitCode: execution.exitCode, status });
    failed = status === "failed";
  }
  return Object.freeze(results);
}

const defaultReleaseBrowserRunner: CliReleaseBrowserRunner = async (
  bytes,
  descriptor,
  evidenceDirectory
) => {
  const report = await runPixiArtifactScenarios(bytes, descriptor, {
    browserChannel: process.env.SFHS_BROWSER_CHANNEL === "chrome" ? "chrome" : "chromium",
    evidenceDirectory: join(evidenceDirectory, "screenshots")
  });
  return Object.freeze({
    valid: report.valid,
    browserVersion: report.smoke.browser.version,
    screenshots: Object.freeze(report.screenshots.map((screenshot) => Object.freeze({
      id: screenshot.id,
      path: screenshot.path,
      width: screenshot.width,
      height: screenshot.height
    })))
  });
};

function releaseRunId(now: Date): string {
  return `sfhs-${now.toISOString().replace(/[^0-9]/gu, "").slice(0, 14)}`;
}

async function readPhysicalDeviceEvidence(
  path: string,
  artifact: CliArtifactSummary
): Promise<{
  readonly accepted: boolean;
  readonly finding?: CliFinding;
}> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    return {
      accepted: false,
      finding: {
        code: "SFHS_RELEASE_DEVICE_EVIDENCE_INVALID",
        severity: "error",
        path: "/release/deviceEvidence",
        message: "Physical-device evidence is missing, unreadable, or invalid JSON."
      }
    };
  }
  const validation = validatePhysicalDeviceAcceptanceManifest(value);
  if (!validation.valid) {
    return {
      accepted: false,
      finding: {
        code: "SFHS_RELEASE_DEVICE_EVIDENCE_INVALID",
        severity: "error",
        path: "/release/deviceEvidence",
        message: `Physical-device evidence failed validation: ${validation.findings.map((entry) => entry.code).join(", ")}.`
      }
    };
  }
  const manifest = value as SfhsPhysicalDeviceAcceptanceManifest;
  if (
    manifest.artifact.path !== artifact.path ||
    manifest.artifact.sha256 !== artifact.sha256 ||
    manifest.artifact.buildId !== artifact.buildId
  ) {
    return {
      accepted: false,
      finding: {
        code: "SFHS_RELEASE_DEVICE_ARTIFACT_MISMATCH",
        severity: "error",
        path: "/release/deviceEvidence/artifact",
        message: "Physical-device evidence does not identify the exact prepared artifact."
      }
    };
  }
  return { accepted: true };
}

async function screenshotEvidence(
  evidenceDirectory: string,
  screenshots: readonly CliReleaseBrowserScreenshot[]
): Promise<NonNullable<SfhsEvidenceManifest["screenshots"]>> {
  return Promise.all(screenshots.map(async (screenshot) => {
    const bytes = new Uint8Array(await readFile(screenshot.path));
    return {
      path: relative(evidenceDirectory, screenshot.path).replaceAll("\\", "/"),
      sha256: sha256Bytes(bytes),
      width: screenshot.width,
      height: screenshot.height,
      profile: screenshot.id,
      semanticReview: "pending" as const
    };
  }));
}

async function prepareRelease(
  discovery: DiscoveredProject,
  workingDirectory: string,
  parsed: ParsedArguments,
  options: CliRunOptions,
  findings: CliFinding[]
): Promise<{
  readonly artifact?: CliArtifactSummary;
  readonly release: CliReleaseSummary;
}> {
  const evidenceDirectory = resolve(workingDirectory, parsed.evidenceArgument ?? ".sfhs-evidence/invalid");
  const commands: CliTestStepResult[] = [];
  const blockers: string[] = [];
  let packed: PackedArtifact | undefined;
  let artifact: CliArtifactSummary | undefined;
  let localFailed = false;

  try {
    packed = await packProject(discovery.projectRoot, {
      ...(options.sourceRevision === undefined ? {} : { sourceRevision: options.sourceRevision })
    });
    artifact = artifactSummary(packed);
    commands.push({ id: "pack", command: "sfhs pack --json", exitCode: 0, status: "passed" });
    const verification = await verifyArtifactFile(discovery.projectRoot, packed.descriptor);
    commands.push({
      id: "verify",
      command: "sfhs verify --json",
      exitCode: verification.valid ? 0 : 1,
      status: verification.valid ? "passed" : "failed"
    });
    if (!verification.valid) {
      localFailed = true;
      findings.push(...findingsFromArtifactVerification(verification.findings));
    }
  } catch (error) {
    localFailed = true;
    findings.push(findingFromOperation(error));
    commands.push({ id: "pack", command: "sfhs pack --json", exitCode: 1, status: "failed" });
  }

  const releaseSteps = releasePreparationSteps();
  const stepResults = await executeTestPlan({
    schema: "sfhs.test-plan@1",
    mode: "check",
    changedPaths: Object.freeze([]),
    steps: releaseSteps,
    reviewRequired: false
  }, options.workspaceRoot ?? workingDirectory, options.commandExecutor ?? defaultCommandExecutor);
  commands.push(...stepResults);
  const failedStep = stepResults.find((step) => step.status === "failed");
  if (failedStep !== undefined) {
    localFailed = true;
    findings.push({
      code: "SFHS_TEST_STEP_FAILED",
      severity: "error",
      path: `/release/commands/${failedStep.id}`,
      message: `${failedStep.command} failed with exit code ${failedStep.exitCode}.`
    });
  }

  if (packed !== undefined) {
    const initialArtifact = packed.descriptor.artifact;
    const initialSource = packed.descriptor.source;
    try {
      const finalPacked = await packProject(discovery.projectRoot, {
        ...(options.sourceRevision === undefined ? {} : { sourceRevision: options.sourceRevision })
      });
      const finalArtifact = finalPacked.descriptor.artifact;
      const finalSource = finalPacked.descriptor.source;
      const unchanged =
        initialArtifact.sha256 === finalArtifact.sha256 &&
        initialArtifact.buildId === finalArtifact.buildId &&
        initialArtifact.bytes === finalArtifact.bytes &&
        initialSource.sha256 === finalSource.sha256;
      commands.push({
        id: "final-pack",
        command: "sfhs pack --json --final",
        exitCode: unchanged ? 0 : 1,
        status: unchanged ? "passed" : "failed"
      });
      packed = finalPacked;
      artifact = artifactSummary(finalPacked);
      if (!unchanged) {
        localFailed = true;
        findings.push({
          code: "SFHS_RELEASE_ARTIFACT_DRIFT",
          severity: "error",
          path: "/release/artifact",
          message: "The exact artifact changed while release checks were running."
        });
      }
      const finalVerification = await verifyArtifactFile(discovery.projectRoot, finalPacked.descriptor);
      commands.push({
        id: "final-verify",
        command: "sfhs verify --json --final",
        exitCode: finalVerification.valid ? 0 : 1,
        status: finalVerification.valid ? "passed" : "failed"
      });
      if (!finalVerification.valid) {
        localFailed = true;
        findings.push(...findingsFromArtifactVerification(finalVerification.findings));
      }
    } catch (error) {
      localFailed = true;
      findings.push(findingFromOperation(error));
      commands.push({ id: "final-pack", command: "sfhs pack --json --final", exitCode: 1, status: "failed" });
      commands.push({ id: "final-verify", command: "sfhs verify --json --final", exitCode: -1, status: "skipped" });
    }
  }

  let browserVersion = "unavailable";
  let screenshots: NonNullable<SfhsEvidenceManifest["screenshots"]> = [];
  if (!localFailed && packed !== undefined) {
    try {
      const browser = await (options.releaseBrowserRunner ?? defaultReleaseBrowserRunner)(
        packed.bytes,
        packed.descriptor,
        evidenceDirectory
      );
      browserVersion = browser.browserVersion;
      commands.push({
        id: "browser-scenarios",
        command: "sfhs browser-scenarios --exact-artifact",
        exitCode: browser.valid ? 0 : 1,
        status: browser.valid ? "passed" : "failed"
      });
      if (!browser.valid) {
        localFailed = true;
        findings.push({
          code: "SFHS_RELEASE_BROWSER_FAILED",
          severity: "error",
          path: "/release/browser",
          message: "Exact-artifact browser scenarios failed during release preparation."
        });
      } else {
        screenshots = await screenshotEvidence(evidenceDirectory, browser.screenshots);
      }
    } catch {
      localFailed = true;
      commands.push({
        id: "browser-scenarios",
        command: "sfhs browser-scenarios --exact-artifact",
        exitCode: 1,
        status: "failed"
      });
      findings.push({
        code: "SFHS_RELEASE_BROWSER_FAILED",
        severity: "error",
        path: "/release/browser",
        message: "Exact-artifact browser scenarios could not complete during release preparation."
      });
    }
  } else {
    commands.push({
      id: "browser-scenarios",
      command: "sfhs browser-scenarios --exact-artifact",
      exitCode: -1,
      status: "skipped"
    });
  }

  if (artifact !== undefined && parsed.deviceEvidenceArgument !== undefined) {
    const device = await readPhysicalDeviceEvidence(
      resolve(workingDirectory, parsed.deviceEvidenceArgument),
      artifact
    );
    commands.push({
      id: "physical-device",
      command: "sfhs physical-device-acceptance",
      exitCode: device.accepted ? 0 : 1,
      status: device.accepted ? "passed" : "failed"
    });
    if (!device.accepted && device.finding !== undefined) {
      blockers.push(device.finding.code);
      findings.push(device.finding);
    }
  } else {
    const code = "SFHS_RELEASE_PHYSICAL_DEVICE_REQUIRED" as const;
    blockers.push(code);
    findings.push({
      code,
      severity: "error",
      path: "/release/deviceEvidence",
      message: "Release preparation requires passing physical Samsung Galaxy S21 Ultra evidence."
    });
    commands.push({
      id: "physical-device",
      command: "sfhs physical-device-acceptance",
      exitCode: -1,
      status: "skipped"
    });
  }

  let evidenceManifestPath: string | undefined;
  let writtenEvidenceDirectory: string | undefined;
  if (artifact !== undefined) {
    const now = (options.now ?? (() => new Date()))();
    const verdict = localFailed ? "fail" : blockers.length > 0 ? "blocked" : "pass";
    const manifest: SfhsEvidenceManifest = {
      schema: "sfhs.evidence@1",
      run: {
        id: options.runId ?? releaseRunId(now),
        startedAt: now.toISOString()
      },
      artifact: {
        path: artifact.path,
        sha256: artifact.sha256,
        buildId: artifact.buildId
      },
      commands: commands.map(({ command, exitCode, status }) => ({ command, exitCode, status })),
      environment: {
        node: options.nodeVersion ?? process.version,
        pnpm: "11.9.0",
        platform: `${process.platform}-${process.arch}`,
        browser: browserVersion
      },
      ...(screenshots.length === 0 ? {} : { screenshots }),
      ...(blockers.length === 0 ? {} : { blockers: Object.freeze([...new Set(blockers)].sort()) }),
      verdict
    };
    try {
      const written = await writeEvidenceRun(evidenceDirectory, manifest);
      writtenEvidenceDirectory = written.directory;
      evidenceManifestPath = written.manifestPath;
    } catch (error) {
      localFailed = true;
      findings.push(error instanceof SfhsEvidenceError
        ? { code: error.code, severity: "error", path: "/release/evidence", message: error.message }
        : {
            code: "SFHS_EVIDENCE_WRITE_FAILED",
            severity: "error",
            path: "/release/evidence",
            message: "Release evidence could not be written."
          });
    }
  }

  return {
    ...(artifact === undefined ? {} : { artifact }),
    release: {
      status: localFailed ? "failed" : blockers.length > 0 ? "blocked" : "prepared",
      blockers: Object.freeze([...new Set(blockers)].sort()),
      ...(writtenEvidenceDirectory === undefined ? {} : { evidenceDirectory: writtenEvidenceDirectory }),
      ...(evidenceManifestPath === undefined ? {} : { evidenceManifestPath }),
      commands: Object.freeze(commands)
    }
  };
}

export async function runCli(argv: readonly string[], options: CliRunOptions = {}): Promise<CliRunResult> {
  const parsed = parseArguments(argv);
  const json = argv.includes("--json");
  if (!isParsedArguments(parsed)) {
    return argumentResult(parsed, json);
  }

  const workingDirectory = options.cwd ?? process.cwd();
  if (parsed.command.startsWith("one-shot ")) {
    return runOneShotCommand(parsed, options, workingDirectory);
  }
  const projectStartPath = parsed.projectArgument === undefined
    ? workingDirectory
    : resolve(workingDirectory, parsed.projectArgument);
  const nodeVersion = options.nodeVersion ?? process.version;
  const findings: CliFinding[] = [];
  if (parsed.command === "doctor") {
    const finding = supportedNodeFinding(nodeVersion);
    if (finding !== undefined) {
      findings.push(finding);
    }
  }

  let discovery: DiscoveredProject;
  try {
    discovery = await discoverProject(projectStartPath);
  } catch (error) {
    findings.push(coreFinding(error, "/project"));
    const envelope: CliEnvelope = {
      schema: "sfhs.cli@1",
      command: parsed.command,
      ok: false,
      exitCode: 1,
      findings: sortFindings(findings),
      ...(parsed.command === "doctor" ? { runtime: { node: nodeVersion } } : {})
    };
    return resultFor(envelope, parsed.json);
  }

  const manifest = await readManifest(discovery.manifestPath);
  if (isCliFinding(manifest)) {
    findings.push(manifest);
    const envelope: CliEnvelope = {
      schema: "sfhs.cli@1",
      command: parsed.command,
      ok: false,
      exitCode: 1,
      findings: sortFindings(findings),
      project: { root: discovery.projectRoot, manifestPath: discovery.manifestPath },
      ...(parsed.command === "doctor" ? { runtime: { node: nodeVersion } } : {})
    };
    return resultFor(envelope, parsed.json);
  }

  const validation = validateProjectManifest(manifest, { mode: "release" });
  findings.push(...findingsFromValidation(validation.findings));
  if (validation.valid) {
    findings.push(...await projectPathFindings(manifest, discovery.projectRoot));
  }

  let build: CliBuildSummary | undefined;
  let artifact: CliArtifactSummary | undefined;
  if (!hasErrors(findings) && (parsed.command === "build" || parsed.command === "pack" || parsed.command === "verify")) {
    try {
      if (parsed.command === "build") {
        build = buildSummary(await buildProject(discovery.projectRoot));
      } else if (parsed.command === "pack") {
        artifact = artifactSummary(await packProject(discovery.projectRoot, {
          ...(options.sourceRevision === undefined ? {} : { sourceRevision: options.sourceRevision })
        }));
      } else {
        const expected = packIntermediate(await buildProject(discovery.projectRoot), {
          ...(options.sourceRevision === undefined ? {} : { sourceRevision: options.sourceRevision })
        });
        artifact = artifactSummary(expected);
        const verification = await verifyArtifactFile(discovery.projectRoot, expected.descriptor);
        findings.push(...findingsFromArtifactVerification(verification.findings));
      }
    } catch (error) {
      findings.push(findingFromOperation(error));
    }
  }

  let testPlan: CliTestPlanSummary | undefined;
  if (!hasErrors(findings) && (parsed.command === "test" || parsed.command === "check")) {
    const selected = selectProportionalTestPlan(parsed.changedPaths, parsed.command);
    const stepResults = await executeTestPlan(
      selected,
      options.workspaceRoot ?? workingDirectory,
      options.commandExecutor ?? defaultCommandExecutor
    );
    if (selected.reviewRequired) {
      findings.push({
        code: "SFHS_TEST_SELECTION_REVIEW_REQUIRED",
        severity: "warning",
        path: "/testPlan/changedPaths",
        message: selected.reviewReason ?? "Human review of the proportional selection is required."
      });
    }
    const failedStep = stepResults.find((step) => step.status === "failed");
    if (failedStep !== undefined) {
      findings.push({
        code: "SFHS_TEST_STEP_FAILED",
        severity: "error",
        path: `/testPlan/steps/${failedStep.id}`,
        message: `${failedStep.command} failed with exit code ${failedStep.exitCode}.`
      });
    }
    testPlan = {
      schema: selected.schema,
      mode: selected.mode,
      changedPaths: selected.changedPaths,
      reviewRequired: selected.reviewRequired,
      ...(selected.reviewReason === undefined ? {} : { reviewReason: selected.reviewReason }),
      steps: stepResults
    };
  }

  let release: CliReleaseSummary | undefined;
  if (!hasErrors(findings) && parsed.command === "release prepare") {
    const prepared = await prepareRelease(discovery, workingDirectory, parsed, options, findings);
    artifact = prepared.artifact;
    release = prepared.release;
  }

  const sortedFindings = sortFindings(findings);
  const ok = !hasErrors(sortedFindings);
  const envelope: CliEnvelope = {
    schema: "sfhs.cli@1",
    command: parsed.command,
    ok,
    exitCode: ok ? 0 : 1,
    findings: sortedFindings,
    project: projectSummary(discovery, manifest),
    ...(build === undefined ? {} : { build }),
    ...(artifact === undefined ? {} : { artifact }),
    ...(testPlan === undefined ? {} : { testPlan }),
    ...(release === undefined ? {} : { release }),
    ...(parsed.command === "doctor" ? { runtime: { node: nodeVersion } } : {})
  };
  return resultFor(envelope, parsed.json);
}

export { selectProportionalTestPlan } from "./test-selection.ts";
export type { ProportionalTestPlan, TestSelectionMode, TestStepDefinition } from "./test-selection.ts";
