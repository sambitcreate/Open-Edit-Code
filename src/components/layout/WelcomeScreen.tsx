import { useState, type ReactNode } from "react";
import { CheckCircle2, BookOpen, Circle, FolderOpen, Phone } from "lucide-react";

type WelcomeScreenProps = {
  onOpenFile: () => void | Promise<void>;
};

type ChecklistItem = {
  id: string;
  label: string;
  detail: string;
  icon: ReactNode;
  action?: "open-file" | "toggle";
};

const checklistItems: ChecklistItem[] = [
  {
    id: "open-file",
    label: "Open a config file",
    detail: "Start with JSON, JSONC, YAML, or TOML.",
    icon: <FolderOpen className="w-4 h-4" />,
    action: "open-file",
  },
  {
    id: "switch-mode",
    label: "Compare Form and Raw views",
    detail: "Use the mode tabs to move between structured and raw editing.",
    icon: <BookOpen className="w-4 h-4" />,
    action: "toggle",
  },
  {
    id: "save-ready",
    label: "Save when you are ready",
    detail: "Keep an eye on the status bar for validation and dirty-state updates.",
    icon: <Phone className="w-4 h-4" />,
    action: "toggle",
  },
];

export function WelcomeScreen({ onOpenFile }: WelcomeScreenProps) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  async function handleChecklistAction(item: ChecklistItem) {
    if (item.action === "open-file") {
      setCompleted((current) => ({ ...current, [item.id]: true }));
      void onOpenFile();
      return;
    }

    setCompleted((current) => ({
      ...current,
      [item.id]: !current[item.id],
    }));
  }

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
          type="button"
          onClick={onOpenFile}
          aria-label="Open a config file"
          className="raised-button welcome-open-button"
        >
          <FolderOpen className="w-4 h-4" />
          Open Config File
        </button>

        <div className="welcome-shortcut-row">
          <kbd className="status-kbd">Cmd+O</kbd>
          <span className="welcome-shortcut-text">keyboard shortcut</span>
        </div>
      </div>

      <div className="task-list-preview" aria-label="Getting started checklist">
        <h2 className="task-list-heading">Getting started</h2>
        {checklistItems.map((item, index) => {
          const tone = index === 0 ? "peach" : index === 1 ? "mint" : "blue";
          const isDone = Boolean(completed[item.id]);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleChecklistAction(item)}
              aria-label={item.label}
              aria-pressed={isDone}
              className={`task-item task-item-${tone} task-item-button ${isDone ? "task-item-done" : ""}`}
            >
              <span className={`task-icon-shell task-icon-${tone}`}>
                {item.icon}
              </span>
              <span className="task-copy">
                <span className="task-text">{item.label}</span>
                <span className="task-detail">{item.detail}</span>
              </span>
              <span className={`task-circle task-circle-${tone}`}>
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
