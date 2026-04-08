import { useAppStore } from "@/lib/state/store";
import type { DataSection } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
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
  const { currentFile, activeSection, setActiveSection, validationErrors } = useAppStore();

  const sectionStats = useMemo(
    () =>
      sections.map((section) => {
        const matches = validationErrors.filter((error) => {
          if (error.path === "/") {
            return false;
          }

          const prefix = `/${section.id}`;
          return error.path === prefix || error.path.startsWith(`${prefix}/`);
        });

        return {
          id: section.id,
          errorCount: matches.filter((error) => error.severity === "error").length,
          warningCount: matches.filter((error) => error.severity === "warning").length,
        };
      }),
    [sections, validationErrors]
  );

  if (!currentFile || sections.length === 0) {
    return null;
  }

  return (
    <aside className="sidebar-shell">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <h2 className="sidebar-title">Sections</h2>
          <span className="sidebar-count-badge" aria-label={`${sections.length} sections`}>
            {sections.length}
          </span>
        </div>
        <p className="sidebar-subtitle">Top-level keys from the opened file</p>
      </div>
      <nav className="sidebar-nav" aria-label="Sections">
        <div className="sidebar-list">
          {sections.map(({ id, label, kind, tone }) => {
            const Icon = sectionIcons[kind];
            const stats = sectionStats.find((section) => section.id === id);
            const issueCount = (stats?.errorCount ?? 0) + (stats?.warningCount ?? 0);

            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                aria-label={label}
                aria-current={activeSection === id ? "true" : undefined}
                title={`${label}${issueCount > 0 ? `, ${issueCount} issue${issueCount === 1 ? "" : "s"}` : ""}`}
                className={cn(
                  "sidebar-item",
                  `sidebar-item-${tone}`,
                  activeSection === id
                    ? "sidebar-item-active"
                    : "sidebar-item-idle"
                )}
              >
                <span className="sidebar-item-leading">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="sidebar-item-label">{label}</span>
                </span>
                <span className="sidebar-item-meta">
                  {issueCount > 0 ? (
                    <span className={cn("sidebar-count-badge", stats?.errorCount ? "sidebar-count-badge-danger" : "sidebar-count-badge-warning")}>
                      {issueCount}
                    </span>
                  ) : (
                    <span className="sidebar-item-status">OK</span>
                  )}
                  <span className="sidebar-item-circle" />
                </span>
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
