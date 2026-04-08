import { useAppStore } from "@/lib/state/store";
import { isEditorModeAvailable } from "@/lib/editorModes";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  FileJson,
  Code2,
  GitCompare,
} from "lucide-react";
import type { EditorMode } from "@/types";

const tabs: { mode: EditorMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { mode: "form", label: "Form", icon: <LayoutGrid className="w-3.5 h-3.5" />, shortcut: "Cmd+1" },
  { mode: "structure", label: "Structure", icon: <FileJson className="w-3.5 h-3.5" />, shortcut: "Cmd+2" },
  { mode: "raw", label: "Raw", icon: <Code2 className="w-3.5 h-3.5" />, shortcut: "Cmd+3" },
  { mode: "diff", label: "Diff", icon: <GitCompare className="w-3.5 h-3.5" />, shortcut: "Cmd+4" },
];

export function ModeTabs() {
  const { editorMode, setEditorMode, currentFile, configData, configRootKind } = useAppStore();

  if (!currentFile) return null;

  return (
    <div className="mode-tabs-shell">
      {tabs.map(({ mode, label, icon, shortcut }) => {
        const disabled = !isEditorModeAvailable({
          mode,
          format: currentFile.format,
          hasConfigData: Boolean(configData),
          configRootKind,
        });

        return (
          <button
            key={mode}
            onClick={() => setEditorMode(mode)}
            disabled={disabled}
            title={`${label} (${shortcut})`}
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
