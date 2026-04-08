import { BookOpen, Flower2, FolderOpen, Phone } from "lucide-react";

export function WelcomeScreen() {
  return (
    <div className="welcome-shell">
      <div className="welcome-card">
        <div className="welcome-drag-indicator" />

        <div className="welcome-profile">
          <div className="welcome-avatar">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div className="welcome-profile-copy">
            <span className="welcome-profile-title">Config Studio</span>
            <span className="welcome-profile-subtitle">Structured local config editing</span>
          </div>
        </div>

        <div className="welcome-divider" />

        <div className="welcome-inset-card welcome-copy-block">
          <h1 className="welcome-heading">Open a config file to start editing</h1>
          <p className="welcome-description">
            A visual editor for local configuration files. Open a JSON, JSONC,
            YAML, or TOML config file to get started.
          </p>
        </div>

        <button
          onClick={() => document.getElementById("open-file-btn")?.click()}
          className="raised-button welcome-open-button"
        >
          <FolderOpen className="w-4 h-4" />
          Open Config File
        </button>

        <div className="welcome-shortcut-row">
          <kbd className="status-kbd">Cmd+O</kbd>
          <kbd className="status-kbd">?</kbd>
          <span className="welcome-shortcut-text">open files or view shortcuts</span>
        </div>
      </div>

      <div className="task-list-preview">
        <div className="task-item task-item-peach">
          <BookOpen className="task-icon task-icon-peach" />
          <span className="task-text">Open config file</span>
          <span className="task-circle task-circle-peach" />
        </div>
        <div className="task-item task-item-mint">
          <Flower2 className="task-icon task-icon-mint" />
          <span className="task-text">Review sections</span>
          <span className="task-circle task-circle-mint" />
        </div>
        <div className="task-item task-item-blue">
          <Phone className="task-icon task-icon-blue" />
          <span className="task-text">Save when ready</span>
          <span className="task-circle task-circle-blue" />
        </div>
      </div>
    </div>
  );
}
