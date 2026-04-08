import { useAppStore } from "@/lib/state/store";
import type { DataSection } from "@/lib/schema";
import { cn } from "@/lib/utils";
import {
  FileJson,
  FileText,
  List,
} from "lucide-react";

const sectionIcons = {
  object: FileJson,
  array: List,
  value: FileText,
} as const;

type SidebarProps = {
  sections: DataSection[];
};

export function Sidebar({ sections }: SidebarProps) {
  const { currentFile, activeSection, setActiveSection } = useAppStore();

  if (!currentFile || sections.length === 0) {
    return null;
  }

  return (
    <aside className="sidebar-shell">
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          Sections
        </h2>
        <p className="sidebar-subtitle">Top-level keys from the opened JSON</p>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-list">
          {sections.map(({ id, label, kind, tone }) => {
            const Icon = sectionIcons[kind];

            return (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "sidebar-item",
                `sidebar-item-${tone}`,
                activeSection === id
                  ? "sidebar-item-active"
                  : "sidebar-item-idle"
              )}
              disabled={!currentFile}
              >
                <span className="sidebar-item-leading">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </span>
                <span className="sidebar-item-circle" />
              </button>
            );
          })}
        </div>
      </nav>
      {currentFile && (
        <div className="sidebar-footer">
          <p className="sidebar-footer-label">Current file</p>
          <p className="sidebar-footer-label">{sections.length} top-level key{sections.length === 1 ? "" : "s"}</p>
          <p className="sidebar-footer-path" title={currentFile.path}>{currentFile.path}</p>
        </div>
      )}
    </aside>
  );
}
