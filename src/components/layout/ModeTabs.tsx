import { useAppStore } from "@/lib/state/store";
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
  const { editorMode, setEditorMode, currentFile } = useAppStore();

  if (!currentFile) return null;

  return (
    <div className="flex items-center bg-muted rounded-lg p-0.5">
      {tabs.map(({ mode, label, icon }) => (
        <button
          key={mode}
          onClick={() => setEditorMode(mode)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            editorMode === mode
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
