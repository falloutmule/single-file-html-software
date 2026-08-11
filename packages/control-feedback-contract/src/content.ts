import type { ControlContent, ControlLayerStyle, ControlStatus } from "./types.ts";

const statusContent: Readonly<Record<ControlStatus, string>> = Object.freeze({
  idle: "",
  loading: "…",
  success: "✓",
  error: "!"
});

export function resolveControlLayerContent(
  layer: ControlLayerStyle,
  content: ControlContent | undefined,
  status: ControlStatus,
  visualLabel: string
): string | undefined {
  if (layer.contentSlot === undefined) return undefined;
  if (layer.contentText !== undefined) return layer.contentText;
  if (layer.contentSlot === "label") return visualLabel;
  if (layer.contentSlot === "status-icon") return statusContent[status];
  return content?.icon ?? "";
}
