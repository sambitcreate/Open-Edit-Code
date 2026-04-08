import { useAppStore } from "@/lib/state/store";
import { supportsVisualEditing } from "@/lib/parse";
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
  const { editorMode, setEditorMode, currentFile, configData } = useAppStore();

  if (!currentFile) return null;

  return (
    <div className="mode-tabs-shell">
      {tabs.map(({ mode, label, icon }) => {
        const disabled =
          (mode === "form" || mode === "structure") &&
          (!configData || !supportsVisualEditing(currentFile.format));

        return (
          <button
            key={mode}
            onClick={() => setEditorMode(mode)}
            disabled={disabled}
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
