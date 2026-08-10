import { canonicalJsonStringify } from "@sfhs/contracts";
import { validateControlPresets, type ControlDonor, type ControlDonorProvenance, type ControlPreset } from "@sfhs/control-feedback-contract";

export const packageIdentity = "@sfhs/control-feedback-notices" as const;
export const thirdPartyNoticesSchema = "sfhs.third-party-notices@0" as const;

export interface ControlNoticeSource {
  readonly presetIds: readonly string[];
  readonly path: string;
  readonly blobSha: string;
  readonly attribution?: string;
}

export interface ControlDonorNotice {
  readonly donor: ControlDonor;
  readonly name: string;
  readonly repository: string;
  readonly commit: string;
  readonly license: "MIT";
  readonly licensePath: "LICENSE" | "LICENSE.md";
  readonly licenseText: string;
  readonly modified: true;
  readonly presetIds: readonly string[];
  readonly sources: readonly ControlNoticeSource[];
}

export interface ControlThirdPartyNotices {
  readonly schema: typeof thirdPartyNoticesSchema;
  readonly donors: readonly ControlDonorNotice[];
}

const licenses = Object.freeze({
  uiverse: Object.freeze({
    name: "Uiverse Galaxy",
    repository: "uiverse-io/galaxy",
    commit: "adbd2adde0a299a3956ea288fb444ec01891ca41",
    licensePath: "LICENSE",
    text: `MIT License

Copyright (c) 2023 Uiverse.io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
  }),
  animata: Object.freeze({
    name: "Animata",
    repository: "codse/animata",
    commit: "de9aabb0eed14e0db944bb07720961ddc450c672",
    licensePath: "LICENSE.md",
    text: `MIT License

Copyright (c) Animata

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`
  }),
  magicui: Object.freeze({
    name: "Magic UI",
    repository: "magicuidesign/magicui",
    commit: "0bd8b9fe0e15c4697c8d22dee1d35d88b5152c25",
    licensePath: "LICENSE.md",
    text: `MIT License

Copyright (c) Magic UI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
  })
} as const);

const uiverseAttribution: Readonly<Record<string, string>> = Object.freeze({
  "Buttons/cssbuttons-io_plastic-mule-29.html": "From Uiverse.io by cssbuttons-io",
  "Buttons/krlozCJ_blue-dodo-17.html": "From Uiverse.io by krlozCJ",
  "Buttons/Cobp_horrible-bird-48.html": "From Uiverse.io by Cobp",
  "Buttons/mrhyddenn_mighty-duck-73.html": "From Uiverse.io by mrhyddenn",
  "Buttons/KSAplay_proud-bullfrog-29.html": "From Uiverse.io by KSAplay",
  "Buttons/Zena4L_heavy-yak-65.html": "From Uiverse.io by Zena4L",
  "Buttons/elijahgummer_hard-turkey-58.html": "From Uiverse.io by elijahgummer; Farrel Putra; https://x.com/farrelput/status/1772222462329287156",
  "Toggle-switches/ErzenXz_weak-falcon-28.html": "From Uiverse.io by ErzenXz",
  "Toggle-switches/JkHuger_old-falcon-20.html": "From Uiverse.io by JkHuger",
  "Checkboxes/KSAplay_tough-pug-83.html": "From Uiverse.io by KSAplay",
  "Radio-buttons/adamgiebl_hard-vampirebat-36.html": "From Uiverse.io by adamgiebl"
});

function isDonor(provenance: ControlPreset["provenance"]): provenance is ControlDonorProvenance {
  return "donor" in provenance;
}

export function generateControlThirdPartyNotices(presets: readonly ControlPreset[]): ControlThirdPartyNotices {
  const validation = validateControlPresets(presets);
  if (!validation.valid) throw new TypeError(`Cannot generate notices for invalid presets: ${validation.findings.map((finding) => `${finding.path} ${finding.code}`).join(", ")}`);
  const donorPresets = new Map<ControlDonor, ControlPreset[]>();
  for (const preset of presets) {
    if (!isDonor(preset.provenance)) continue;
    const list = donorPresets.get(preset.provenance.donor) ?? [];
    list.push(preset);
    donorPresets.set(preset.provenance.donor, list);
  }
  const donors: ControlDonorNotice[] = [];
  for (const donor of [...donorPresets.keys()].sort()) {
    const donorLicense = licenses[donor];
    const used = [...(donorPresets.get(donor) ?? [])].sort((left, right) => left.id.localeCompare(right.id));
    const sourceMap = new Map<string, { source: ControlDonorProvenance["sources"][number]; presetIds: string[] }>();
    for (const preset of used) {
      const provenance = preset.provenance;
      if (!isDonor(provenance)) continue;
      for (const source of provenance.sources) {
        const sourceKey = `${source.path}:${source.blobSha}`;
        const current = sourceMap.get(sourceKey) ?? { source, presetIds: [] };
        current.presetIds.push(preset.id);
        sourceMap.set(sourceKey, current);
      }
    }
    const sources = [...sourceMap.values()].sort((left, right) => left.source.path.localeCompare(right.source.path)).map(({ source, presetIds }) => Object.freeze({
      presetIds: Object.freeze([...presetIds].sort()),
      path: source.path,
      blobSha: source.blobSha,
      ...(donor === "uiverse" && uiverseAttribution[source.path] !== undefined ? { attribution: uiverseAttribution[source.path] } : {})
    }));
    donors.push(Object.freeze({ donor, name: donorLicense.name, repository: donorLicense.repository, commit: donorLicense.commit, license: "MIT", licensePath: donorLicense.licensePath, licenseText: donorLicense.text, modified: true, presetIds: Object.freeze(used.map((preset) => preset.id)), sources: Object.freeze(sources) }));
  }
  return Object.freeze({ schema: thirdPartyNoticesSchema, donors: Object.freeze(donors) });
}

export function canonicalControlThirdPartyNoticesJson(presets: readonly ControlPreset[]): string {
  return canonicalJsonStringify(generateControlThirdPartyNotices(presets));
}

export function controlThirdPartyNoticesText(presets: readonly ControlPreset[]): string {
  const notices = generateControlThirdPartyNotices(presets);
  const lines = ["SFHS Control Feedback — Third-Party Notices", ""];
  if (notices.donors.length === 0) return `${lines.join("\n")}No third-party control presets are included.\n`;
  for (const donor of notices.donors) {
    lines.push(`## ${donor.name}`, `Repository: ${donor.repository}`, `Frozen commit: ${donor.commit}`, `License file: ${donor.licensePath}`, "SFHS adaptations: modified", `Included presets: ${donor.presetIds.join(", ")}`, "", "Sources:");
    for (const source of donor.sources) lines.push(`- ${source.path} (blob ${source.blobSha}; presets: ${source.presetIds.join(", ")})${source.attribution === undefined ? "" : ` — ${source.attribution}`}`);
    lines.push("", donor.licenseText, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export { uiverseAttribution as frozenUiverseAttribution };
