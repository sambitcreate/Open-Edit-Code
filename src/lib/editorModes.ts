import { supportsStructuredEditing, supportsVisualEditing } from "@/lib/parse";
import type { ConfigRootKind, EditorMode, FileFormat } from "@/types";

interface EditorModeAvailabilityOptions {
  mode: EditorMode;
  format?: FileFormat;
  hasConfigData: boolean;
  configRootKind: ConfigRootKind | null;
}

export const editorModeOrder: EditorMode[] = ["form", "structure", "raw", "diff"];

export function isEditorModeAvailable({
  mode,
  format,
  hasConfigData,
  configRootKind,
}: EditorModeAvailabilityOptions) {
  if (mode === "raw" || mode === "diff") {
    return true;
  }

  if (!format || !hasConfigData) {
    return false;
  }

  if (mode === "structure") {
    return supportsStructuredEditing(format) && (configRootKind === "object" || configRootKind === "array");
  }

  return configRootKind === "object" && supportsVisualEditing(format);
}
