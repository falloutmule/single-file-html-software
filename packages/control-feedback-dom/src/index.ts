export const packageIdentity = "@sfhs/control-feedback-dom" as const;

export { mountDomControl } from "./dom.ts";
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
