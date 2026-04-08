import { useEffect } from "react";
import { Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/state/store";
import type { BackupRetentionMode, DefaultOpenMode, ThemePreference } from "@/types";

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const defaultModeOptions: Array<{ value: DefaultOpenMode; label: string }> = [
  { value: "auto", label: "Automatic" },
  { value: "form", label: "Form" },
  { value: "structure", label: "Structure" },
  { value: "raw", label: "Raw" },
  { value: "diff", label: "Diff" },
];

const backupRetentionOptions: Array<{ value: BackupRetentionMode; label: string }> = [
  { value: "count", label: "Count" },
  { value: "age", label: "Age" },
];

export function SettingsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    preferences,
    setThemePreference,
    updateEditorPreferences,
    setBackupRetention,
    setDefaultOpenMode,
    updateFormatDefaults,
  } = useAppStore();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="settings-drawer-layer"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        className="settings-drawer"
        aria-label="Settings"
        aria-modal="true"
        role="dialog"
      >
        <div className="settings-drawer-header">
          <div className="settings-drawer-title-row">
            <span className="settings-drawer-icon">
              <Settings2 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="settings-drawer-title">Preferences</h2>
              <p className="settings-drawer-subtitle">
                Tune how the editor opens, formats, and saves your files.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="settings-drawer-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="settings-drawer-body">
          <section className="settings-section">
            <div className="settings-section-copy">
              <h3 className="settings-section-title">Appearance</h3>
              <p className="settings-section-description">
                Keep following the OS, or pin the editor to a specific theme.
              </p>
            </div>
            <div className="settings-choice-group" role="radiogroup" aria-label="Theme override">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "settings-choice",
                    preferences.themePreference === option.value && "settings-choice-active"
                  )}
                  onClick={() => setThemePreference(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-copy">
              <h3 className="settings-section-title">Editor</h3>
              <p className="settings-section-description">
                Raw and diff views update immediately as you change these values.
              </p>
            </div>
            <div className="settings-grid">
              <label className="settings-field" htmlFor="settings-font-size">
                <span className="settings-label">Font size</span>
                <input
                  id="settings-font-size"
                  className="settings-input"
                  type="number"
                  min={11}
                  max={24}
                  value={preferences.editor.fontSize}
                  onChange={(event) =>
                    updateEditorPreferences({ fontSize: event.currentTarget.valueAsNumber })
                  }
                />
              </label>

              <label className="settings-field" htmlFor="settings-tab-width">
                <span className="settings-label">Tab width</span>
                <input
                  id="settings-tab-width"
                  className="settings-input"
                  type="number"
                  min={2}
                  max={8}
                  value={preferences.editor.tabSize}
                  onChange={(event) =>
                    updateEditorPreferences({ tabSize: event.currentTarget.valueAsNumber })
                  }
                />
              </label>

              <label className="settings-field" htmlFor="settings-default-mode">
                <span className="settings-label">Default mode on open</span>
                <select
                  id="settings-default-mode"
                  className="settings-select"
                  value={preferences.defaultOpenMode}
                  onChange={(event) =>
                    setDefaultOpenMode(event.currentTarget.value as DefaultOpenMode)
                  }
                >
                  {defaultModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={preferences.editor.wordWrap}
                  onChange={(event) =>
                    updateEditorPreferences({ wordWrap: event.currentTarget.checked })
                  }
                />
                <span>
                  <span className="settings-label">Line wrapping</span>
                  <span className="settings-helper">Wrap long lines instead of horizontal scrolling.</span>
                </span>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={preferences.editor.showLineNumbers}
                  onChange={(event) =>
                    updateEditorPreferences({ showLineNumbers: event.currentTarget.checked })
                  }
                />
                <span>
                  <span className="settings-label">Show line numbers</span>
                  <span className="settings-helper">Applies to raw and diff editor views.</span>
                </span>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-copy">
              <h3 className="settings-section-title">Save and backups</h3>
              <p className="settings-section-description">
                Control how aggressively old backups are pruned after each save.
              </p>
            </div>
            <div className="settings-choice-group" role="radiogroup" aria-label="Backup retention">
              {backupRetentionOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "settings-choice",
                    preferences.backupRetention.mode === option.value && "settings-choice-active"
                  )}
                  onClick={() => setBackupRetention({ mode: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="settings-field" htmlFor="settings-backup-retention">
              <span className="settings-label">
                {preferences.backupRetention.mode === "count"
                  ? "Keep this many recent backups"
                  : "Delete backups older than this many days"}
              </span>
              <input
                id="settings-backup-retention"
                className="settings-input"
                type="number"
                min={1}
                max={preferences.backupRetention.mode === "count" ? 250 : 365}
                value={preferences.backupRetention.value}
                onChange={(event) =>
                  setBackupRetention({ value: event.currentTarget.valueAsNumber })
                }
              />
            </label>
          </section>

          <section className="settings-section">
            <div className="settings-section-copy">
              <h3 className="settings-section-title">Format defaults</h3>
              <p className="settings-section-description">
                These defaults apply when the app serializes structured JSON content for saving.
              </p>
            </div>
            {(["json", "jsonc"] as const).map((format) => (
              <div key={format} className="settings-format-card">
                <div className="settings-format-header">
                  <h4>{format.toUpperCase()}</h4>
                  {format === "jsonc" && (
                    <span className="settings-note">Raw JSONC saves still preserve comments and spacing.</span>
                  )}
                </div>
                <div className="settings-grid settings-grid-compact">
                  <label className="settings-field" htmlFor={`settings-${format}-indent`}>
                    <span className="settings-label">Indentation</span>
                    <select
                      id={`settings-${format}-indent`}
                      className="settings-select"
                      value={preferences.formatDefaults[format].indentSize}
                      onChange={(event) =>
                        updateFormatDefaults(format, {
                          indentSize: Number(event.currentTarget.value) === 4 ? 4 : 2,
                        })
                      }
                    >
                      <option value={2}>2 spaces</option>
                      <option value={4}>4 spaces</option>
                    </select>
                  </label>

                  <label className="settings-toggle settings-toggle-compact">
                    <input
                      type="checkbox"
                      checked={preferences.formatDefaults[format].sortKeys}
                      onChange={(event) =>
                        updateFormatDefaults(format, {
                          sortKeys: event.currentTarget.checked,
                        })
                      }
                    />
                    <span>
                      <span className="settings-label">Sort keys on save</span>
                      <span className="settings-helper">
                        Reorders object keys alphabetically before the app writes JSON.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </section>
        </div>
      </aside>
    </div>
  );
}
