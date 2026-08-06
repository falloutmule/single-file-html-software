import { describe, expect, it } from "vitest";

import invalidArtifact from "../fixtures/invalid/artifact-invalid-hash.json";
import invalidEvidence from "../fixtures/invalid/evidence-no-commands.json";
import invalidDeviceEmulation from "../fixtures/invalid/device-emulation.json";
import invalidProjectUnknownAdapter from "../fixtures/invalid/project-unknown-adapter.json";
import invalidProjectPathEscape from "../fixtures/invalid/project-path-escape.json";
import invalidProjectMalformed from "../fixtures/invalid/project-malformed.json";
import invalidProjectRuntimeUrl from "../fixtures/invalid/project-runtime-url.json";
import validArtifact from "../fixtures/valid/artifact.json";
import validEvidence from "../fixtures/valid/evidence.json";
import validDeviceAcceptance from "../fixtures/valid/device-acceptance.json";
import validProject from "../fixtures/valid/project.json";
import {
  canonicalJsonStringify,
  canonicalizeJson,
  packageIdentity,
  validateArtifactManifest,
  validateEvidenceManifest,
  validatePhysicalDeviceAcceptanceManifest,
  validateProjectManifest
} from "./index";

describe("@sfhs/contracts", () => {
  it("exposes its workspace boundary", () => {
    expect(packageIdentity).toBe("@sfhs/contracts");
  });

  it("accepts valid versioned project, artifact, and evidence fixtures", () => {
    expect(validateProjectManifest(validProject)).toEqual({ valid: true, findings: [] });
    expect(validateArtifactManifest(validArtifact)).toEqual({ valid: true, findings: [] });
    expect(validateEvidenceManifest(validEvidence)).toEqual({ valid: true, findings: [] });
    expect(validatePhysicalDeviceAcceptanceManifest(validDeviceAcceptance)).toEqual({ valid: true, findings: [] });
  });

  it("accepts an honest adaptive viewport contract", () => {
    expect(validateProjectManifest({
      ...validProject,
      viewport: { ...validProject.viewport, mode: "adaptive", scalePolicy: "contain" }
    }, { mode: "release" })).toEqual({ valid: true, findings: [] });
  });

  it("accepts the DOM/Fabric Canvas 2D adapter contract", () => {
    expect(validateProjectManifest({
      ...validProject,
      adapter: {
        id: "dom-canvas-fabric",
        versionRange: "^0.1.0",
        renderer: { required: "canvas2d", webgpu: "disabled", unsupportedBehavior: "show-capability-page" }
      },
      viewport: { ...validProject.viewport, mode: "responsive-contained-artboard" },
      runtime: { ...validProject.runtime, simulationHz: 0 }
    }, { mode: "release" })).toEqual({ valid: true, findings: [] });
  });

  it("rejects an adapter paired with the wrong renderer", () => {
    expect(validateProjectManifest({
      ...validProject,
      adapter: {
        id: "dom-canvas-fabric",
        versionRange: "^0.1.0",
        renderer: { required: "webgl", webgpu: "disabled", unsupportedBehavior: "show-capability-page" }
      }
    }, { mode: "release" }).findings).toEqual([
      expect.objectContaining({ code: "SFHS_SCHEMA_INVALID", path: "/adapter/renderer/required" })
    ]);
  });

  it("allows physical Canvas projects to record WebGL as not required", () => {
    expect(validatePhysicalDeviceAcceptanceManifest({
      ...validDeviceAcceptance,
      webgl: { result: "not-required" }
    })).toEqual({ valid: true, findings: [] });
  });

  it("rejects emulation as physical Samsung Galaxy S21 Ultra acceptance", () => {
    expect(validatePhysicalDeviceAcceptanceManifest(invalidDeviceEmulation).findings).toEqual([
      expect.objectContaining({ code: "SFHS_DEVICE_NOT_PHYSICAL", path: "/device/physical" })
    ]);
  });

  it("returns stable physical-device failure codes", () => {
    const failedAcceptance = {
      ...validDeviceAcceptance,
      device: { ...validDeviceAcceptance.device, modelIdentifier: "different-device" },
      webgl: { result: "unsupported" },
      orientations: {
        ...validDeviceAcceptance.orientations,
        portrait: { ...validDeviceAcceptance.orientations.portrait, status: "failed" }
      },
      verdict: "fail"
    };

    expect(validatePhysicalDeviceAcceptanceManifest(failedAcceptance).findings).toEqual([
      expect.objectContaining({ code: "SFHS_DEVICE_MODEL_UNSUPPORTED" }),
      expect.objectContaining({ code: "SFHS_DEVICE_ACCEPTANCE_FAILED" }),
      expect.objectContaining({ code: "SFHS_DEVICE_WEBGL_UNSUPPORTED" })
    ]);
  });

  it("returns stable semantic finding codes for project policy failures", () => {
    expect(validateProjectManifest(invalidProjectUnknownAdapter).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SFHS_ADAPTER_UNKNOWN", path: "/adapter/id" })
    ]));
    expect(validateProjectManifest(invalidProjectPathEscape).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SFHS_PATH_INVALID", path: "/source/entry" })
    ]));
    expect(validateProjectManifest(invalidProjectRuntimeUrl).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SFHS_RUNTIME_EXTERNAL_URL_FORBIDDEN", path: "/assets/runtimeExternalUrls" })
    ]));
  });

  it("rejects malformed project, artifact, and evidence fixtures", () => {
    expect(validateProjectManifest(invalidProjectMalformed).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SFHS_SCHEMA_INVALID", path: "/" }),
      expect.objectContaining({ code: "SFHS_SCHEMA_UNKNOWN_FIELD", path: "/project/unexpected" })
    ]));
    expect(validateArtifactManifest(invalidArtifact).findings).toEqual([
      expect.objectContaining({ code: "SFHS_SCHEMA_INVALID", path: "/artifact/sha256" })
    ]);
    expect(validateEvidenceManifest(invalidEvidence).findings).toEqual([
      expect.objectContaining({ code: "SFHS_SCHEMA_INVALID", path: "/commands" })
    ]);
  });

  it("warns about unknown project fields in development and rejects them for release", () => {
    const projectWithFutureField = {
      ...validProject,
      project: { ...validProject.project, futureField: true }
    };

    expect(validateProjectManifest(projectWithFutureField)).toEqual({
      valid: true,
      findings: [
        expect.objectContaining({
          code: "SFHS_SCHEMA_UNKNOWN_FIELD",
          severity: "warning",
          path: "/project/futureField"
        })
      ]
    });
    expect(validateProjectManifest(projectWithFutureField, { mode: "release" })).toEqual({
      valid: false,
      findings: [
        expect.objectContaining({
          code: "SFHS_SCHEMA_UNKNOWN_FIELD",
          severity: "error",
          path: "/project/futureField"
        })
      ]
    });
  });

  it("serializes JSON with deterministic key order", () => {
    expect(canonicalJsonStringify({ zebra: [3, { beta: true, alpha: null }], alpha: "first" })).toBe(
      '{"alpha":"first","zebra":[3,{"alpha":null,"beta":true}]}'
    );
    expect(canonicalizeJson(Object.assign(Object.create(null), { beta: 2, alpha: 1 }))).toEqual({ alpha: 1, beta: 2 });
  });

  it("rejects JSON values that cannot be serialized deterministically", () => {
    expect(() => canonicalJsonStringify({ value: Number.NaN })).toThrow("non-finite numbers");
    expect(() => canonicalJsonStringify({ value: new Date("2026-07-20T00:00:00Z") })).toThrow("object values");
  });
});
