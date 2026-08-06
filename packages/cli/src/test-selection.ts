export type TestSelectionMode = "check" | "test";

export type TestStepId =
  | "browser-scenarios"
  | "browser-smoke"
  | "build-pack-verify"
  | "contracts-core"
  | "dom-canvas-fabric"
  | "determinism"
  | "lint"
  | "pixi-runtime"
  | "runner"
  | "skyline-browser"
  | "skyline-simulation"
  | "typecheck"
  | "unit-all";

export interface TestStepDefinition {
  readonly id: TestStepId;
  readonly executable: "pnpm";
  readonly arguments: readonly string[];
  readonly command: string;
}

export interface ProportionalTestPlan {
  readonly schema: "sfhs.test-plan@1";
  readonly mode: TestSelectionMode;
  readonly changedPaths: readonly string[];
  readonly steps: readonly TestStepDefinition[];
  readonly reviewRequired: boolean;
  readonly reviewReason?: string;
}

const definitions: Readonly<Record<TestStepId, TestStepDefinition>> = Object.freeze({
  "browser-scenarios": step("browser-scenarios", ["browser-scenarios"]),
  "browser-smoke": step("browser-smoke", ["browser-smoke"]),
  "build-pack-verify": step("build-pack-verify", [
    "run", "test",
    "packages/builder/src", "packages/packer/src", "packages/verifier/src"
  ]),
  "contracts-core": step("contracts-core", [
    "run", "test", "packages/contracts/src", "packages/core/src"
  ]),
  "dom-canvas-fabric": step("dom-canvas-fabric", [
    "run", "test", "adapters/dom-canvas-fabric/src"
  ]),
  determinism: step("determinism", ["determinism"]),
  lint: step("lint", ["run", "lint"]),
  "pixi-runtime": step("pixi-runtime", [
    "run", "test", "adapters/pixi-v8/src", "examples/pixi-minimal/src"
  ]),
  runner: step("runner", ["run", "test", "packages/browser-runner/src"]),
  "skyline-browser": step("skyline-browser", ["--filter", "@sfhs/example-skyline-drop", "test:canonical"]),
  "skyline-simulation": step("skyline-simulation", ["--filter", "@sfhs/example-skyline-drop", "test:simulation"]),
  typecheck: step("typecheck", ["run", "typecheck"]),
  "unit-all": step("unit-all", ["run", "test"])
});

function step(id: TestStepId, arguments_: readonly string[]): TestStepDefinition {
  return Object.freeze({
    id,
    executable: "pnpm",
    arguments: Object.freeze([...arguments_]),
    command: ["pnpm", ...arguments_].join(" ")
  });
}

function normalizedPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//u, "");
}

function isRuntimeLike(path: string): boolean {
  return /\.(?:css|html|js|json|mjs|ts|tsx)$/iu.test(path);
}

function add(set: Set<TestStepId>, ...ids: readonly TestStepId[]): void {
  for (const id of ids) {
    set.add(id);
  }
}

export function selectProportionalTestPlan(
  changedPaths: readonly string[],
  mode: TestSelectionMode
): ProportionalTestPlan {
  const normalized = Object.freeze([...new Set(changedPaths.map(normalizedPath).filter(Boolean))].sort());
  const selected = new Set<TestStepId>();
  let reviewRequired = false;
  const unknownRuntimePaths: string[] = [];

  if (mode === "check") {
    add(selected, "lint", "typecheck");
  }
  if (normalized.length === 0) {
    add(selected, "unit-all");
    if (mode === "check") {
      add(selected, "browser-smoke");
    }
  }

  for (const path of normalized) {
    if (path.startsWith("packages/contracts/") || path.startsWith("packages/core/")) {
      add(selected, "contracts-core");
      if (mode === "check") {
        add(selected, "build-pack-verify", "browser-smoke");
      }
      continue;
    }
    if (
      path.startsWith("packages/builder/") ||
      path.startsWith("packages/packer/") ||
      path.startsWith("packages/verifier/") ||
      path.startsWith("fixtures/")
    ) {
      add(selected, "build-pack-verify");
      if (mode === "check") {
        add(selected, "browser-smoke");
      }
      continue;
    }
    if (path.startsWith("packages/browser-runner/")) {
      add(selected, "runner");
      if (mode === "check") {
        add(selected, path.includes("pixi-scenarios") ? "browser-scenarios" : "browser-smoke");
      }
      continue;
    }
    if (path.startsWith("adapters/pixi-v8/") || path.startsWith("examples/pixi-minimal/")) {
      add(selected, "pixi-runtime");
      if (mode === "check") {
        add(selected, "browser-scenarios");
      }
      continue;
    }
    if (path.startsWith("adapters/dom-canvas-fabric/")) {
      add(selected, "dom-canvas-fabric");
      if (mode === "check") add(selected, "runner");
      continue;
    }
    if (path === "examples/skyline-drop" || path.startsWith("examples/skyline-drop/")) {
      add(selected, "skyline-simulation");
      if (mode === "check") {
        add(selected, "skyline-browser");
      }
      continue;
    }
    if (path === "pnpm-lock.yaml" || path === "pnpm-workspace.yaml" || path.startsWith("tools/")) {
      add(selected, "unit-all");
      if (mode === "check") {
        add(selected, "determinism", "browser-smoke");
      }
      continue;
    }
    if (
      path.startsWith("packages/cli/") ||
      path.startsWith("packages/evidence/") ||
      path === "package.json" ||
      path === "tsconfig.json" ||
      path === "eslint.config.js" ||
      path.startsWith(".github/")
    ) {
      add(selected, "unit-all");
      continue;
    }
    if (path.startsWith("docs/") || path.endsWith(".md")) {
      if (mode === "test") {
        add(selected, "unit-all");
      }
      continue;
    }

    add(selected, "unit-all");
    reviewRequired = true;
    if (isRuntimeLike(path)) {
      unknownRuntimePaths.push(path);
      add(selected, "build-pack-verify", "browser-smoke");
    }
  }

  const order: readonly TestStepId[] = [
    "lint",
    "typecheck",
    "contracts-core",
    "build-pack-verify",
    "dom-canvas-fabric",
    "pixi-runtime",
    "runner",
    "skyline-simulation",
    "unit-all",
    "determinism",
    "browser-smoke",
    "browser-scenarios",
    "skyline-browser"
  ];
  const steps = Object.freeze(order.filter((id) => selected.has(id)).map((id) => definitions[id]));
  const reviewReason = unknownRuntimePaths.length > 0
    ? `Unknown runtime paths received static/build coverage plus one browser smoke: ${unknownRuntimePaths.join(", ")}`
    : reviewRequired
      ? "One or more changed paths are not covered by the explicit SFHS path map."
      : undefined;

  return Object.freeze({
    schema: "sfhs.test-plan@1",
    mode,
    changedPaths: normalized,
    steps,
    reviewRequired,
    ...(reviewReason === undefined ? {} : { reviewReason })
  });
}

export function releasePreparationSteps(): readonly TestStepDefinition[] {
  return Object.freeze([
    definitions.lint,
    definitions.typecheck,
    definitions["unit-all"],
    definitions.determinism
  ]);
}
