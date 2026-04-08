import { useEffect } from "react";
import { RotateCcw, X } from "lucide-react";
import { defaultEditorPreferences, useAppStore } from "@/lib/state/store";

export function SettingsDialog() {
  const {
    settingsOpen,
    setSettingsOpen,
    editorPreferences,
    setEditorPreferences,
    resetEditorPreferences,
  } = useAppStore();

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSettingsOpen, settingsOpen]);

  if (!settingsOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="modal-card settings-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Preferences</p>
            <h2 id="settings-dialog-title" className="modal-title">Settings</h2>
            <p className="modal-description">
              These preferences are stored locally for this app on this device.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-button"
            onClick={() => setSettingsOpen(false)}
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="settings-list">
          <label className="settings-row">
            <div className="settings-copy">
              <span className="settings-title">Wrap long lines in Raw editor</span>
              <span className="settings-description">Keeps long JSON, YAML, and TOML values readable without horizontal scrolling.</span>
            </div>
            <input
              type="checkbox"
              checked={editorPreferences.rawWordWrap}
              onChange={(event) => setEditorPreferences({ rawWordWrap: event.target.checked })}
            />
          </label>

          <label className="settings-row">
            <div className="settings-copy">
              <span className="settings-title">Show line numbers</span>
              <span className="settings-description">Applies to both Raw and Diff editors.</span>
            </div>
            <input
              type="checkbox"
              checked={editorPreferences.rawLineNumbers}
              onChange={(event) => setEditorPreferences({ rawLineNumbers: event.target.checked })}
            />
          </label>

          <label className="settings-row">
            <div className="settings-copy">
              <span className="settings-title">Side-by-side Diff layout</span>
              <span className="settings-description">Turn this off if you prefer a stacked inline diff on smaller windows.</span>
            </div>
            <input
              type="checkbox"
              checked={editorPreferences.diffSideBySide}
              onChange={(event) => setEditorPreferences({ diffSideBySide: event.target.checked })}
            />
          </label>
        </div>

        <div className="modal-footer">
          <p className="modal-footer-copy">
            Default profile: {defaultEditorPreferences.rawWordWrap ? "wrapped" : "unwrapped"} raw text, visible line numbers, side-by-side diff.
          </p>
          <button
            type="button"
            className="toolbar-button toolbar-button-secondary"
            onClick={resetEditorPreferences}
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
