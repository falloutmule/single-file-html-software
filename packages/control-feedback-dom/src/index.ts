export const packageIdentity = "@sfhs/control-feedback-dom" as const;

import { validateControlPreset } from "@sfhs/control-feedback-contract";
import { mountDomControlUnchecked } from "./dom.ts";
import type { DomControlController, MountDomControlOptions } from "./types.ts";

export function mountDomControl(options: MountDomControlOptions): DomControlController {
  const validation = validateControlPreset(options.preset);
  if (!validation.valid) throw new Error(`Invalid control preset: ${validation.findings.map((finding) => `${finding.path}: ${finding.message}`).join("; ")}`);
  return mountDomControlUnchecked(options);
}
export {
  applyStyle,
  controlLengthCss,
  domControlStyleText,
  ensureDomControlStyles,
  layerStyleToCss
} from "./styles.ts";
export {
  semanticElementForPreset,
  type DomControlController,
  type DomControlCue,
  type DomControlModelUpdate,
  type DomControlSemanticElement,
  type MountDomControlOptions
} from "./types.ts";
