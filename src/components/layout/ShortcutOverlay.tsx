import { useEffect } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/lib/state/store";

const shortcutGroups = [
  {
    title: "File",
    shortcuts: [
      { keys: "Cmd+O", description: "Open a config file" },
      { keys: "Cmd+S", description: "Save the current file" },
      { keys: "Cmd+R", description: "Revert to the last saved version" },
    ],
  },
  {
    title: "Views",
    shortcuts: [
      { keys: "Cmd+1", description: "Switch to Form mode" },
      { keys: "Cmd+2", description: "Switch to Structure mode" },
      { keys: "Cmd+3", description: "Switch to Raw mode" },
      { keys: "Cmd+4", description: "Switch to Diff mode" },
    ],
  },
  {
    title: "Editor",
    shortcuts: [
      { keys: "Cmd+F", description: "Find in Raw and Diff editors" },
      { keys: "Cmd+Z", description: "Undo in Raw editor, or use native field undo in forms" },
      { keys: "Cmd+Shift+Z", description: "Redo in Raw editor" },
    ],
  },
  {
    title: "App",
    shortcuts: [
      { keys: "Cmd+,", description: "Open settings" },
      { keys: "?", description: "Open this shortcut reference" },
      { keys: "Esc", description: "Close dialogs and overlays" },
    ],
  },
];

export function ShortcutOverlay() {
  const { shortcutOverlayOpen, setShortcutOverlayOpen, setSettingsOpen } = useAppStore();

  useEffect(() => {
    if (!shortcutOverlayOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShortcutOverlayOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setShortcutOverlayOpen, shortcutOverlayOpen]);

  if (!shortcutOverlayOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={() => setShortcutOverlayOpen(false)}
    >
      <div
        className="modal-card shortcut-overlay-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-overlay-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Help</p>
            <h2 id="shortcut-overlay-title" className="modal-title">Keyboard Shortcuts</h2>
            <p className="modal-description">
              Shortcuts work anywhere in the app unless you&apos;re actively typing into a field.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-button"
            onClick={() => setShortcutOverlayOpen(false)}
            aria-label="Close shortcuts"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="shortcut-grid">
          {shortcutGroups.map((group) => (
            <section key={group.title} className="shortcut-section">
              <h3 className="shortcut-section-title">{group.title}</h3>
              <div className="shortcut-list">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="shortcut-row">
                    <kbd className="shortcut-kbd">{shortcut.keys}</kbd>
                    <span className="shortcut-copy">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="modal-footer">
          <p className="modal-footer-copy">
            Need to tune the editor? Open Settings to change raw-editor and diff preferences.
          </p>
          <button
            type="button"
            className="toolbar-button toolbar-button-secondary"
            onClick={() => {
              setShortcutOverlayOpen(false);
              setSettingsOpen(true);
            }}
          >
            Open Settings
          </button>
        </div>
      </div>
    </div>
  );
}
