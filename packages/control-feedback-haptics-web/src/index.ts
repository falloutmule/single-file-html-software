import type { ControlFeedbackCueRole } from "@sfhs/control-feedback-runtime";

export const packageIdentity = "@sfhs/control-feedback-haptics-web" as const;

export type WebHapticPattern = "subtle-tick" | "firm-press" | "toggle" | "success" | "error";
export interface SymbolicHapticCue { readonly role: ControlFeedbackCueRole; readonly cueId?: string; }
export interface WebHapticResult { readonly attempted: boolean; readonly supported: boolean; readonly accepted: boolean; readonly pattern?: WebHapticPattern; }
export interface WebHapticTransport {
  readonly supported: boolean;
  playCue(cue: SymbolicHapticCue): WebHapticResult;
  setEnabled(enabled: boolean): void;
  stop(): void;
  dispose(): void;
}

export const webHapticPatterns = Object.freeze({
  "subtle-tick": Object.freeze([8]),
  "firm-press": Object.freeze([18]),
  toggle: Object.freeze([10, 20, 10]),
  success: Object.freeze([8, 24, 18]),
  error: Object.freeze([22, 28, 22])
} as const satisfies Record<WebHapticPattern, readonly number[]>);

const rolePatterns: Readonly<Record<ControlFeedbackCueRole, WebHapticPattern>> = Object.freeze({
  press: "subtle-tick",
  activate: "firm-press",
  cancel: "subtle-tick",
  "select-on": "toggle",
  "select-off": "toggle",
  success: "success",
  error: "error"
});

export function createWebHapticTransport(options: { readonly navigator?: { vibrate(pattern: number | number[]): boolean }; readonly enabled?: boolean } = {}): WebHapticTransport {
  const navigatorValue = options.navigator ?? (typeof navigator === "undefined" ? undefined : navigator);
  const vibrate = navigatorValue?.vibrate;
  const supported = typeof vibrate === "function";
  let enabled = options.enabled ?? true;
  let disposed = false;

  const invoke = (pattern: number | readonly number[]): boolean => {
    if (!supported || navigatorValue === undefined) return false;
    try { return Boolean(vibrate.call(navigatorValue, typeof pattern === "number" ? pattern : [...pattern])); } catch { return false; }
  };

  return Object.freeze({
    supported,
    playCue(cue: SymbolicHapticCue): WebHapticResult {
      const pattern = cue.cueId !== undefined && cue.cueId in webHapticPatterns ? cue.cueId as WebHapticPattern : rolePatterns[cue.role];
      if (disposed || !enabled || !supported) return { attempted: false, supported, accepted: false, pattern };
      return { attempted: true, supported, accepted: invoke(webHapticPatterns[pattern]), pattern };
    },
    setEnabled(nextEnabled: boolean): void { if (!disposed) enabled = nextEnabled; },
    stop(): void { if (!disposed) invoke(0); },
    dispose(): void { if (disposed) return; invoke(0); disposed = true; }
  });
}
