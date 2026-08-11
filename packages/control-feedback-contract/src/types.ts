export const controlPresetSchema = "sfhs.control-preset@0" as const;
export const controlPackSchema = "sfhs.control-pack@0" as const;

export type ControlPresetSchema = typeof controlPresetSchema;
export type ControlPackSchema = typeof controlPackSchema;
export type ControlSemanticKind = "momentary" | "toggle" | "choice";
export type ControlStatus = "idle" | "loading" | "success" | "error";
export type ControlInteractionState = "rest" | "pressed-inside" | "pressed-outside";
export type ControlLayerRole = "depth" | "edge" | "surface" | "content" | "focus" | "effect";
export type ControlShape = "rect" | "round-rect" | "circle" | "capsule";
export type ControlLengthUnit = "px" | "ratio";
export type ControlEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";
export type ControlEffectKind = "field-ripple" | "activation-ripple";
export type ControlContentSlot = "label" | "icon-leading" | "icon-trailing" | "status-icon";
export type ControlDonor = "uiverse" | "animata" | "magicui";

export interface ControlLength {
  readonly value: number;
  readonly unit: ControlLengthUnit;
}

export interface ControlTransform {
  readonly translateX?: ControlLength;
  readonly translateY?: ControlLength;
  readonly scaleX?: number;
  readonly scaleY?: number;
  readonly rotationDeg?: number;
}

export interface ControlLayerBounds {
  readonly x: ControlLength;
  readonly y: ControlLength;
  readonly width: ControlLength;
  readonly height: ControlLength;
  readonly anchorX: number;
  readonly anchorY: number;
}

export interface ControlTransition {
  readonly durationMs: number;
  readonly delayMs?: number;
  readonly easing: ControlEasing;
  readonly overshoot?: number;
}

export interface ControlBorder {
  readonly width: ControlLength;
  readonly color: string;
  readonly radius: ControlLength;
}

export interface ControlGradientStop {
  readonly offset: number;
  readonly color: string;
}

export interface ControlGradient {
  readonly kind: "linear" | "radial" | "conic";
  readonly angleDeg?: number;
  readonly stops: readonly ControlGradientStop[];
}

export interface ControlShadow {
  readonly x: ControlLength;
  readonly y: ControlLength;
  readonly blur: ControlLength;
  readonly spread: ControlLength;
  readonly color: string;
  readonly inset: boolean;
}

export interface ControlLayerStyle {
  readonly role: ControlLayerRole;
  readonly shape: ControlShape;
  readonly fill?: string;
  readonly gradient?: ControlGradient;
  readonly opacity?: number;
  readonly border?: ControlBorder;
  readonly shadows?: readonly ControlShadow[];
  readonly transform?: ControlTransform;
  readonly transition?: ControlTransition;
  readonly contentSlot?: ControlContentSlot;
  readonly contentText?: string;
  readonly bounds?: ControlLayerBounds;
}

export interface FieldRippleEffect {
  readonly kind: "field-ripple";
  readonly diameterFactor: number;
  readonly enter: ControlTransition;
  readonly leave: ControlTransition;
  readonly keyboardOrigin: "center";
}

export interface ActivationRippleEffect {
  readonly kind: "activation-ripple";
  readonly concurrentCap: number;
  readonly durationMs: number;
  readonly keyboardOrigin: "center";
  readonly idStrategy: "monotonic";
}

export type ControlEffect = FieldRippleEffect | ActivationRippleEffect;

export interface ControlVisualState {
  readonly layers?: readonly ControlLayerStyle[];
  readonly effects?: readonly ControlEffect[];
}

export interface ControlVisualStates {
  readonly base: ControlVisualState;
  readonly selected?: ControlVisualState;
  readonly hover?: ControlVisualState;
  readonly focus?: ControlVisualState;
  readonly pressedInside?: ControlVisualState;
  readonly pressedOutside?: ControlVisualState;
  readonly disabled?: ControlVisualState;
  readonly reducedMotion?: ControlVisualState;
  readonly status?: Readonly<Partial<Record<ControlStatus, ControlVisualState>>>;
}

export interface ToggleVisual {
  readonly track: ControlLayerStyle;
  readonly thumb: ControlLayerStyle;
  readonly selectedThumbTransform: ControlTransform;
}

export interface ControlCueMap {
  readonly press?: string;
  readonly activate?: string;
  readonly cancel?: string;
  readonly selectOn?: string;
  readonly selectOff?: string;
  readonly success?: string;
  readonly error?: string;
}

export interface ControlGeometry {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly minimumHitTargetPx?: number;
}

export interface ControlContent {
  readonly label: string;
  readonly icon?: string;
  readonly iconSlot?: "leading" | "trailing";
  readonly fontFamily: "system-ui" | "serif" | "monospace";
  readonly fontSizePx: number;
  readonly fontWeight: number;
  readonly letterSpacingPx: number;
  readonly textColor: string;
}

export interface MomentarySemantic {
  readonly kind: "momentary";
}

export interface ToggleSemantic {
  readonly kind: "toggle";
  readonly variant?: "switch" | "checkbox";
}

export interface ChoiceSemantic {
  readonly kind: "choice";
  readonly groupId: string;
  readonly value: string;
}

export type ControlSemantic = MomentarySemantic | ToggleSemantic | ChoiceSemantic;

export interface ControlDonorSource {
  readonly repository: string;
  readonly commit: string;
  readonly path: string;
  readonly blobSha: string;
}

export interface ControlDonorProvenance {
  readonly donor: ControlDonor;
  readonly license: "MIT";
  readonly modified: true;
  readonly sources: readonly ControlDonorSource[];
}

export interface ControlOriginalProvenance {
  readonly origin: "sfhs-original";
}

export type ControlProvenance = ControlDonorProvenance | ControlOriginalProvenance;

export interface ControlPreset {
  readonly schema: ControlPresetSchema;
  readonly id: string;
  readonly title: string;
  readonly semantic: ControlSemantic;
  readonly geometry?: ControlGeometry;
  readonly content?: ControlContent;
  readonly visuals: ControlVisualStates;
  readonly toggleVisual?: ToggleVisual;
  readonly cues?: ControlCueMap;
  readonly provenance: ControlProvenance;
}

export interface ControlPack {
  readonly schema: ControlPackSchema;
  readonly id: string;
  readonly title: string;
  readonly presets: readonly ControlPreset[];
}

export type ControlValidationCode =
  | "SFHS_CONTROL_SCHEMA_INVALID"
  | "SFHS_CONTROL_UNKNOWN_FIELD"
  | "SFHS_CONTROL_ID_INVALID"
  | "SFHS_CONTROL_DUPLICATE_ID"
  | "SFHS_CONTROL_SEMANTIC_INVALID"
  | "SFHS_CONTROL_CHOICE_INVALID"
  | "SFHS_CONTROL_NUMBER_INVALID"
  | "SFHS_CONTROL_RATIO_INVALID"
  | "SFHS_CONTROL_COLOR_INVALID"
  | "SFHS_CONTROL_PRIMITIVE_INVALID"
  | "SFHS_CONTROL_DURATION_INVALID"
  | "SFHS_CONTROL_RIPPLE_CAP_INVALID"
  | "SFHS_CONTROL_PROVENANCE_MISSING"
  | "SFHS_CONTROL_PROVENANCE_MISMATCH"
  | "SFHS_CONTROL_RENDERER_STRING_FORBIDDEN";

export interface ControlValidationFinding {
  readonly code: ControlValidationCode;
  readonly path: string;
  readonly message: string;
}

export interface ControlValidationResult {
  readonly valid: boolean;
  readonly findings: readonly ControlValidationFinding[];
}
