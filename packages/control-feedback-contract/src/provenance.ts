import type { ControlDonor, ControlDonorProvenance, ControlDonorSource, ControlValidationFinding } from "./types.ts";

export interface FrozenDonorSource extends ControlDonorSource {
  readonly donor: ControlDonor;
  readonly license: "MIT";
}

export const frozenDonorRevisions = Object.freeze({
  uiverse: Object.freeze({ repository: "uiverse-io/galaxy", commit: "adbd2adde0a299a3956ea288fb444ec01891ca41" }),
  animata: Object.freeze({ repository: "codse/animata", commit: "de9aabb0eed14e0db944bb07720961ddc450c672" }),
  magicui: Object.freeze({ repository: "magicuidesign/magicui", commit: "0bd8b9fe0e15c4697c8d22dee1d35d88b5152c25" })
} as const);

function frozenSource(donor: ControlDonor, path: string, blobSha: string): FrozenDonorSource {
  const revision = frozenDonorRevisions[donor];
  return Object.freeze({ donor, license: "MIT", repository: revision.repository, commit: revision.commit, path, blobSha });
}

export const frozenDonorSources = Object.freeze([
  frozenSource("uiverse", "Buttons/cssbuttons-io_plastic-mule-29.html", "013cdb596866767dd9c8ca002087b6b01da2233f"),
  frozenSource("uiverse", "Buttons/krlozCJ_blue-dodo-17.html", "d2ba48cdb4e7e7cf1e2d5fe32b706c6a2c9fa682"),
  frozenSource("uiverse", "Buttons/Cobp_horrible-bird-48.html", "cb0aada6e5bb1f5357b055953c427117c8b8e9f9"),
  frozenSource("uiverse", "Buttons/mrhyddenn_mighty-duck-73.html", "b8393b2237e9bcf4bbc2194bd786858d82150d1a"),
  frozenSource("uiverse", "Buttons/KSAplay_proud-bullfrog-29.html", "a775edf9f3398040c53b50679dd7a096c6aff24d"),
  frozenSource("uiverse", "Buttons/Zena4L_heavy-yak-65.html", "67c42836aa7259f5f391b2169be52b51118103f9"),
  frozenSource("uiverse", "Buttons/elijahgummer_hard-turkey-58.html", "e175f1576033b7602e5590a012eeb742aa0c06e7"),
  frozenSource("uiverse", "Toggle-switches/ErzenXz_weak-falcon-28.html", "29fc567fdc32f172263ec6a6b5b4f9ab69a01e54"),
  frozenSource("uiverse", "Toggle-switches/JkHuger_old-falcon-20.html", "c227753eb5da221bc0e759d8bfdd69ecc7620d70"),
  frozenSource("uiverse", "Checkboxes/KSAplay_tough-pug-83.html", "fc6d589a4064b1ed74d3382e56aa5d724c19d643"),
  frozenSource("uiverse", "Radio-buttons/adamgiebl_hard-vampirebat-36.html", "a9f7136b24e21b8585508a10a1391f185507bd82"),
  frozenSource("animata", "animata/button/ripple-button.tsx", "36e3b5f331a63cad228e82caeb89f6795893ff46"),
  frozenSource("animata", "animata/button/ripple-button.css", "2f599332a773b190ae091aa5cda2ac80b530026d"),
  frozenSource("animata", "animata/button/status-button.tsx", "3c227ffadc2f8be1ea487f6618216348b8ae6fcb"),
  frozenSource("animata", "animata/button/shining-button.tsx", "03abaff794fb4cdd08a92ea95b08c6d5adc4e667"),
  frozenSource("animata", "animata/button/swipe-button.tsx", "7b1661bdbf1ee38887e53cd57149cfdc5aa4dbc6"),
  frozenSource("animata", "animata/button/arrow-button.tsx", "d5c1bc8ab0d33d00e75af9076cec331f0cc29006"),
  frozenSource("animata", "animata/button/slide-arrow-button.tsx", "3e21309cd5871bba76ce3f44ef9bb0dd7b56b201"),
  frozenSource("animata", "animata/button/work-button.tsx", "75affb05b53de7b32e0629919c0b42fed7770611"),
  frozenSource("animata", "animata/button/get-started-button.tsx", "b0024091ffe13c154364423221e9f33e573a967b"),
  frozenSource("magicui", "apps/www/registry/magicui/shimmer-button.tsx", "d675cc0979eb96b95b86ae0833c8065933aa21cd"),
  frozenSource("magicui", "apps/www/public/r/rainbow-button.json", "1650c73168e8e658b38facc78adc7778c461336c"),
  frozenSource("magicui", "apps/www/public/r/interactive-hover-button.json", "a03bde458bf47a6a299d9ec771bbe5a527087e20"),
  frozenSource("magicui", "apps/www/public/r/pulsating-button.json", "dff60452f60c7415fc9540b45d6d0acc2c2a4291"),
  frozenSource("magicui", "apps/www/public/r/ripple-button.json", "cd88d83d5b29e9385469eefdaa39735a320dbc29"),
  frozenSource("magicui", "apps/www/registry/magicui/glare-hover.tsx", "a9e553a22e174ab850f3ba0b5675f06eb0dda62a")
] satisfies readonly FrozenDonorSource[]);

const key = (repository: string, path: string): string => `${repository}:${path}`;

export const frozenPresetSourceKeys: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "uv-plastic-inset-press": [key("uiverse-io/galaxy", "Buttons/cssbuttons-io_plastic-mule-29.html")],
  "uv-simple-drop-press": [key("uiverse-io/galaxy", "Buttons/krlozCJ_blue-dodo-17.html")],
  "uv-tilt-level-press": [key("uiverse-io/galaxy", "Buttons/Cobp_horrible-bird-48.html")],
  "uv-diagonal-offset-press": [key("uiverse-io/galaxy", "Buttons/mrhyddenn_mighty-duck-73.html")],
  "uv-hover-lift-pill": [key("uiverse-io/galaxy", "Buttons/KSAplay_proud-bullfrog-29.html")],
  "uv-halo-lift": [key("uiverse-io/galaxy", "Buttons/Zena4L_heavy-yak-65.html")],
  "uv-dark-capsule-icon": [key("uiverse-io/galaxy", "Buttons/elijahgummer_hard-turkey-58.html")],
  "uv-basic-toggle": [key("uiverse-io/galaxy", "Toggle-switches/ErzenXz_weak-falcon-28.html")],
  "uv-sun-moon-toggle": [key("uiverse-io/galaxy", "Toggle-switches/JkHuger_old-falcon-20.html")],
  "uv-like-pop-toggle": [key("uiverse-io/galaxy", "Checkboxes/KSAplay_tough-pug-83.html")],
  "uv-skeuo-icon-choice": [key("uiverse-io/galaxy", "Radio-buttons/adamgiebl_hard-vampirebat-36.html")],
  "an-pointer-field-ripple": [key("codse/animata", "animata/button/ripple-button.tsx"), key("codse/animata", "animata/button/ripple-button.css")],
  "an-status-cycle": [key("codse/animata", "animata/button/status-button.tsx")],
  "an-shine-sweep": [key("codse/animata", "animata/button/shining-button.tsx")],
  "an-vertical-label-swap": [key("codse/animata", "animata/button/swipe-button.tsx")],
  "an-overlay-arrow-swap": [key("codse/animata", "animata/button/arrow-button.tsx")],
  "an-expanding-leading-fill": [key("codse/animata", "animata/button/slide-arrow-button.tsx")],
  "an-rising-bubble-fill": [key("codse/animata", "animata/button/work-button.tsx")],
  "an-arrow-conveyor": [key("codse/animata", "animata/button/get-started-button.tsx")],
  "mu-perimeter-shimmer": [key("magicuidesign/magicui", "apps/www/registry/magicui/shimmer-button.tsx")],
  "mu-rainbow-border": [key("magicuidesign/magicui", "apps/www/public/r/rainbow-button.json")],
  "mu-dot-flood-reveal": [key("magicuidesign/magicui", "apps/www/public/r/interactive-hover-button.json")],
  "mu-attention-pulse": [key("magicuidesign/magicui", "apps/www/public/r/pulsating-button.json")],
  "mu-multi-activation-ripple": [key("magicuidesign/magicui", "apps/www/public/r/ripple-button.json")],
  "mu-glare-sweep": [key("magicuidesign/magicui", "apps/www/registry/magicui/glare-hover.tsx")]
});

const p0Ids = new Set(["uv-plastic-inset-press", "uv-simple-drop-press", "uv-diagonal-offset-press", "uv-basic-toggle", "uv-skeuo-icon-choice", "an-pointer-field-ripple", "an-status-cycle", "mu-multi-activation-ripple"]);
const p0SourceKeys = new Set([...p0Ids].flatMap((id) => frozenPresetSourceKeys[id] ?? []));
export const frozenP0DonorSources = Object.freeze(frozenDonorSources.filter((source) => p0SourceKeys.has(key(source.repository, source.path))));
export const frozenP0PresetSourceKeys: Readonly<Record<string, readonly string[]>> = Object.freeze(Object.fromEntries([...p0Ids].map((id) => [id, frozenPresetSourceKeys[id] ?? []])));

const frozenByKey: ReadonlyMap<string, FrozenDonorSource> = new Map(frozenDonorSources.map((source) => [key(source.repository, source.path), source]));

function sourceFinding(path: string, message: string): ControlValidationFinding {
  return { code: "SFHS_CONTROL_PROVENANCE_MISMATCH", path, message };
}

export function validateFrozenProvenance(provenance: ControlDonorProvenance, path = "/provenance", presetId?: string): readonly ControlValidationFinding[] {
  const findings: ControlValidationFinding[] = [];
  if (provenance.license !== "MIT" || provenance.modified !== true || provenance.sources.length === 0) {
    findings.push({ code: "SFHS_CONTROL_PROVENANCE_MISSING", path, message: "Adapted presets require MIT provenance, modified=true, and at least one frozen source." });
    return findings;
  }
  if (presetId !== undefined) {
    const expectedKeys = frozenPresetSourceKeys[presetId];
    if (expectedKeys === undefined) {
      findings.push(sourceFinding(path, `Preset ${presetId} is not in the frozen donor provenance register.`));
    } else {
      const actualKeys = provenance.sources.map((source) => key(source.repository, source.path)).sort();
      const expectedSorted = [...expectedKeys].sort();
      if (actualKeys.length !== expectedSorted.length || actualKeys.some((value, index) => value !== expectedSorted[index])) findings.push(sourceFinding(`${path}/sources`, `Preset ${presetId} does not use its exact frozen source set.`));
    }
  }
  for (const [index, source] of provenance.sources.entries()) {
    const sourcePath = `${path}/sources/${index}`;
    const frozen = frozenByKey.get(key(source.repository, source.path));
    if (frozen === undefined) { findings.push(sourceFinding(sourcePath, "Source repository/path is not in the frozen donor register.")); continue; }
    if (frozen.donor !== provenance.donor) findings.push(sourceFinding(`${sourcePath}/repository`, "Source donor does not match preset donor."));
    if (source.commit !== frozen.commit) findings.push(sourceFinding(`${sourcePath}/commit`, `Expected frozen commit ${frozen.commit}.`));
    if (source.blobSha !== frozen.blobSha) findings.push(sourceFinding(`${sourcePath}/blobSha`, `Expected frozen blob ${frozen.blobSha}.`));
  }
  return findings;
}
