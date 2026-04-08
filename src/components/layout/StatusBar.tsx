import { useAppStore } from "@/lib/state/store";
import { getDataSections } from "@/lib/schema";
import { supportsStructuredEditing } from "@/lib/parse";
import { Check, AlertCircle, AlertTriangle, FileText } from "lucide-react";
import { useMemo } from "react";

export function StatusBar() {
  const { currentFile, dirty, validationErrors, configData, configRootKind, activeSection } = useAppStore();
  const sections = useMemo(
    () => (configRootKind === "object" ? getDataSections(configData) : []),
    [configData, configRootKind]
  );

  const errorCount = validationErrors.filter((e) => e.severity === "error").length;
  const warningCount = validationErrors.filter((e) => e.severity === "warning").length;
  const schemaStatus = !currentFile
    ? null
    : !supportsStructuredEditing(currentFile.format)
      ? `${currentFile.format.toUpperCase()} raw only for now`
      : configRootKind === "object"
      ? `${sections.length} top-level key${sections.length === 1 ? "" : "s"}`
      : configRootKind === "array"
        ? "Array root: Raw or Structure"
        : "Fix JSON in Raw mode";

  return (
    <div className="statusbar-shell">
      {currentFile ? (
        <>
          <span className="status-pill" title={currentFile.path}>
            <FileText className="w-3 h-3" />
            {currentFile.format.toUpperCase()}
          </span>
          {schemaStatus && <span className="status-pill">{schemaStatus}</span>}
          {activeSection && sections.some((section) => section.id === activeSection) && (
            <span className="status-pill">Section: {activeSection}</span>
          )}
          <span className="status-pill">
            {errorCount > 0 ? (
              <>
                <AlertCircle className="w-3 h-3 text-danger" />
                {errorCount} error{errorCount > 1 ? "s" : ""}
              </>
            ) : warningCount > 0 ? (
              <>
                <AlertTriangle className="w-3 h-3 text-warning" />
                {warningCount} warning{warningCount > 1 ? "s" : ""}
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-success" />
                Valid
              </>
            )}
          </span>
          {dirty && (
            <span className="status-pill status-pill-warning">
              <span className="file-chip-dot" />
              <span>Unsaved</span>
            </span>
          )}
          <span className="status-path" title={currentFile.path}>
            {currentFile.path}
          </span>
        </>
      ) : (
        <span className="status-empty">No file open <kbd className="status-kbd">Cmd+O</kbd> to open</span>
      )}
    </div>
  );
}
