import type { ControlDonor, ControlDonorSource, ControlProvenance, ControlValidationFinding } from "./types.ts";

export interface FrozenDonorSource extends ControlDonorSource {
  readonly donor: ControlDonor;
  readonly license: "MIT";
}

export const frozenP0DonorSources = [
  {
    donor: "uiverse",
    license: "MIT",
    repository: "uiverse-io/galaxy",
    commit: "adbd2adde0a299a3956ea288fb444ec01891ca41",
    path: "Buttons/cssbuttons-io_plastic-mule-29.html",
    blobSha: "013cdb596866767dd9c8ca002087b6b01da2233f"
  },
  {
    donor: "uiverse",
    license: "MIT",
    repository: "uiverse-io/galaxy",
    commit: "adbd2adde0a299a3956ea288fb444ec01891ca41",
    path: "Buttons/krlozCJ_blue-dodo-17.html",
    blobSha: "d2ba48cdb4e7e7cf1e2d5fe32b706c6a2c9fa682"
  },
  {
    donor: "uiverse",
    license: "MIT",
    repository: "uiverse-io/galaxy",
    commit: "adbd2adde0a299a3956ea288fb444ec01891ca41",
    path: "Buttons/mrhyddenn_mighty-duck-73.html",
    blobSha: "b8393b2237e9bcf4bbc2194bd786858d82150d1a"
  },
  {
    donor: "uiverse",
    license: "MIT",
    repository: "uiverse-io/galaxy",
    commit: "adbd2adde0a299a3956ea288fb444ec01891ca41",
    path: "Toggle-switches/ErzenXz_weak-falcon-28.html",
    blobSha: "29fc567fdc32f172263ec6a6b5b4f9ab69a01e54"
  },
  {
    donor: "uiverse",
    license: "MIT",
    repository: "uiverse-io/galaxy",
    commit: "adbd2adde0a299a3956ea288fb444ec01891ca41",
    path: "Radio-buttons/adamgiebl_hard-vampirebat-36.html",
    blobSha: "a9f7136b24e21b8585508a10a1391f185507bd82"
  },
  {
    donor: "animata",
    license: "MIT",
    repository: "codse/animata",
    commit: "de9aabb0eed14e0db944bb07720961ddc450c672",
    path: "animata/button/ripple-button.tsx",
    blobSha: "36e3b5f331a63cad228e82caeb89f6795893ff46"
  },
  {
    donor: "animata",
    license: "MIT",
    repository: "codse/animata",
    commit: "de9aabb0eed14e0db944bb07720961ddc450c672",
    path: "animata/button/ripple-button.css",
    blobSha: "2f599332a773b190ae091aa5cda2ac80b530026d"
  },
  {
    donor: "animata",
    license: "MIT",
    repository: "codse/animata",
    commit: "de9aabb0eed14e0db944bb07720961ddc450c672",
    path: "animata/button/status-button.tsx",
    blobSha: "3c227ffadc2f8be1ea487f6618216348b8ae6fcb"
  },
  {
    donor: "magicui",
    license: "MIT",
    repository: "magicuidesign/magicui",
    commit: "0bd8b9fe0e15c4697c8d22dee1d35d88b5152c25",
    path: "apps/www/public/r/ripple-button.json",
    blobSha: "cd88d83d5b29e9385469eefdaa39735a320dbc29"
  }
] as const satisfies readonly FrozenDonorSource[];


export const frozenP0PresetSourceKeys: Readonly<Record<string, readonly string[]>> = {
  "uv-plastic-inset-press": ["uiverse-io/galaxy:Buttons/cssbuttons-io_plastic-mule-29.html"],
  "uv-simple-drop-press": ["uiverse-io/galaxy:Buttons/krlozCJ_blue-dodo-17.html"],
  "uv-diagonal-offset-press": ["uiverse-io/galaxy:Buttons/mrhyddenn_mighty-duck-73.html"],
  "uv-basic-toggle": ["uiverse-io/galaxy:Toggle-switches/ErzenXz_weak-falcon-28.html"],
  "uv-skeuo-icon-choice": ["uiverse-io/galaxy:Radio-buttons/adamgiebl_hard-vampirebat-36.html"],
  "an-pointer-field-ripple": [
    "codse/animata:animata/button/ripple-button.tsx",
    "codse/animata:animata/button/ripple-button.css"
  ],
  "an-status-cycle": ["codse/animata:animata/button/status-button.tsx"],
  "mu-multi-activation-ripple": ["magicuidesign/magicui:apps/www/public/r/ripple-button.json"]
} as const;

const frozenByKey: ReadonlyMap<string, FrozenDonorSource> = new Map<string, FrozenDonorSource>(
  frozenP0DonorSources.map((source) => [`${source.repository}:${source.path}`, source])
);

function sourceFinding(path: string, message: string): ControlValidationFinding {
  return { code: "SFHS_CONTROL_PROVENANCE_MISMATCH", path, message };
}

export function validateFrozenProvenance(
  provenance: ControlProvenance,
  path = "/provenance",
  presetId?: string
): readonly ControlValidationFinding[] {
  const findings: ControlValidationFinding[] = [];

  if (provenance.license !== "MIT" || provenance.modified !== true || provenance.sources.length === 0) {
    findings.push({
      code: "SFHS_CONTROL_PROVENANCE_MISSING",
      path,
      message: "P0 presets require MIT provenance, modified=true, and at least one frozen source."
    });
    return findings;
  }

  if (presetId !== undefined) {
    const expectedKeys = frozenP0PresetSourceKeys[presetId];
    if (expectedKeys === undefined) {
      findings.push(sourceFinding(path, `Preset ${presetId} is not in the frozen P0 provenance register.`));
    } else {
      const actualKeys = provenance.sources.map((source) => `${source.repository}:${source.path}`).sort();
      const expectedSorted = [...expectedKeys].sort();
      if (actualKeys.length !== expectedSorted.length || actualKeys.some((key, index) => key !== expectedSorted[index])) {
        findings.push(sourceFinding(`${path}/sources`, `Preset ${presetId} does not use its exact frozen source set.`));
      }
    }
  }

  for (const [index, source] of provenance.sources.entries()) {
    const sourcePath = `${path}/sources/${index}`;
    const frozen = frozenByKey.get(`${source.repository}:${source.path}`);
    if (frozen === undefined) {
      findings.push(sourceFinding(sourcePath, "Source repository/path is not in the frozen P0 donor register."));
      continue;
    }
    if (frozen.donor !== provenance.donor) {
      findings.push(sourceFinding(`${sourcePath}/repository`, "Source donor does not match preset donor."));
    }
    if (source.commit !== frozen.commit) {
      findings.push(sourceFinding(`${sourcePath}/commit`, `Expected frozen commit ${frozen.commit}.`));
    }
    if (source.blobSha !== frozen.blobSha) {
      findings.push(sourceFinding(`${sourcePath}/blobSha`, `Expected frozen blob ${frozen.blobSha}.`));
    }
  }

  return findings;
}
