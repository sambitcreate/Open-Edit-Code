import { CircleHelp, Settings2 } from "lucide-react";
import { useAppStore } from "@/lib/state/store";

export function AppUtilityControls() {
  const { setShortcutOverlayOpen, setSettingsOpen } = useAppStore();

  return (
    <div className="toolbar-cluster">
      <button
        type="button"
        onClick={() => setShortcutOverlayOpen(true)}
        className="toolbar-button toolbar-button-secondary"
        title="Keyboard shortcuts (?)"
      >
        <CircleHelp className="w-4 h-4" />
        Shortcuts
      </button>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="toolbar-button toolbar-button-secondary"
        title="Settings (Cmd+,)"
      >
        <Settings2 className="w-4 h-4" />
        Settings
      </button>
    </div>
  );
}
