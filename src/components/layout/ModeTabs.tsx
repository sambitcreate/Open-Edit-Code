import { confirm } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "@/lib/state/store";
import { hasJsoncComments, supportsStructuredEditing } from "@/lib/parse";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  FileJson,
  Code2,
  GitCompare,
} from "lucide-react";
import type { EditorMode } from "@/types";

const tabs: { mode: EditorMode; label: string; icon: React.ReactNode }[] = [
  { mode: "form", label: "Form", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { mode: "structure", label: "Structure", icon: <FileJson className="w-3.5 h-3.5" /> },
  { mode: "raw", label: "Raw", icon: <Code2 className="w-3.5 h-3.5" /> },
  { mode: "diff", label: "Diff", icon: <GitCompare className="w-3.5 h-3.5" /> },
];

export function ModeTabs() {
  const {
    editorMode,
    setEditorMode,
    currentFile,
    configData,
    configRootKind,
    rawContent,
    jsoncCommentWarningAcceptedFor,
    setJsoncCommentWarningAcceptedFor,
  } = useAppStore();

  if (!currentFile) return null;

  const getDisabledReason = (mode: EditorMode) => {
    if (mode === "raw" || mode === "diff") {
      return null;
    }

    if (!supportsStructuredEditing(currentFile.format)) {
      return `${currentFile.format.toUpperCase()} files stay in Raw mode for now while structured support is being built.`;
    }

    if (!configData) {
      return "Fix parsing issues in Raw mode before switching to a visual editor.";
    }

    if (mode === "form" && configRootKind === "array") {
      return "This file's root is an array. Use Raw or Structure view instead.";
    }

    return null;
  };

  const handleModeChange = async (mode: EditorMode) => {
    if (mode === editorMode) {
      return;
    }

    const disabledReason = getDisabledReason(mode);
    if (disabledReason) {
      return;
    }

    const requiresJsoncWarning = (mode === "form" || mode === "structure")
      && currentFile.format === "jsonc"
      && hasJsoncComments(rawContent)
      && jsoncCommentWarningAcceptedFor !== rawContent;

    if (requiresJsoncWarning) {
      const shouldContinue = await confirm(
        "This JSONC file contains comments. Form and Structure view do not preserve comments yet, so switching modes can remove them after an edit or save.",
        {
          title: "Comments may be removed",
          kind: "warning",
          okLabel: "Switch anyway",
          cancelLabel: "Stay in Raw",
        }
      );

      if (!shouldContinue) {
        return;
      }

      setJsoncCommentWarningAcceptedFor(rawContent);
    }

    setEditorMode(mode);
  };

  return (
    <div className="mode-tabs-shell">
      {tabs.map(({ mode, label, icon }) => {
        const disabledReason = getDisabledReason(mode);
        const disabled = disabledReason !== null;

        return (
          <button
            key={mode}
            onClick={() => {
              void handleModeChange(mode);
            }}
            disabled={disabled}
            title={disabledReason ?? undefined}
            className={cn(
              "mode-tab-button",
              disabled && "mode-tab-button-disabled",
              editorMode === mode
                ? "mode-tab-button-active"
                : "mode-tab-button-idle"
            )}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
