import { useAppStore } from "@/lib/state/store";
import { revertCurrentFile, saveCurrentFile } from "@/lib/fileActions";
import { Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SaveControls() {
  const {
    currentFile,
    dirty,
    isSaving,
  } = useAppStore();

  if (!currentFile) return null;

  return (
    <div className="toolbar-cluster">
      <button
        onClick={() => { void revertCurrentFile(); }}
        disabled={!dirty}
        className={cn(
          "toolbar-button toolbar-button-secondary",
          dirty
            ? ""
            : "toolbar-button-disabled"
        )}
        title="Revert changes (Cmd+R)"
      >
        <RotateCcw className="w-4 h-4" />
        Revert
      </button>
      <button
        id="save-btn"
        onClick={() => { void saveCurrentFile(); }}
        disabled={!dirty || isSaving}
        className={cn(
          "toolbar-button toolbar-button-primary",
          dirty && !isSaving
            ? ""
            : "toolbar-button-disabled"
        )}
        title="Save (Cmd+S)"
      >
        <Save className="w-4 h-4" />
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
