import { useMemo } from "react";
import { AlertCircle, AlertTriangle, Check, Clock3, FileLock2, FileText } from "lucide-react";
import { getDataSections } from "@/lib/schema";
import { supportsVisualEditing } from "@/lib/parse";
import { useAppStore } from "@/lib/state/store";

function formatLastModified(value: string | null) {
  if (!value) {
    return "Modified time unavailable";
  }

  return new Date(value).toLocaleString();
}

export function StatusBar() {
  const {
    currentFile,
    dirty,
    fileConflict,
    validationErrors,
    configData,
    configRootKind,
    activeSection,
  } = useAppStore();
  const sections = useMemo(
    () => (configRootKind === "object" ? getDataSections(configData) : []),
    [configData, configRootKind]
  );

  const errorCount = validationErrors.filter((e) => e.severity === "error").length;
  const warningCount = validationErrors.filter((e) => e.severity === "warning").length;
  const schemaStatus = !currentFile
    ? null
    : supportsVisualEditing(currentFile.format) && configRootKind === "object"
      ? `${sections.length} top-level key${sections.length === 1 ? "" : "s"}`
      : supportsVisualEditing(currentFile.format) && configRootKind === "array"
        ? "Array root"
        : "Raw mode only";

  const lastModifiedLabel = currentFile
    ? formatLastModified(fileConflict?.onDiskModifiedAt ?? currentFile.lastModified)
    : null;

  return (
    <div className="statusbar-shell">
      {currentFile ? (
        <>
          <span className="status-pill" title={currentFile.path} aria-label={`File format ${currentFile.format.toUpperCase()}`}>
            <FileText className="w-3 h-3" />
            {currentFile.format.toUpperCase()}
          </span>
          {schemaStatus && (
            <span className="status-pill" aria-label={schemaStatus}>
              {schemaStatus}
            </span>
          )}
          {activeSection && sections.some((section) => section.id === activeSection) && (
            <span className="status-pill" aria-label={`Current section ${activeSection}`}>
              Section: {activeSection}
            </span>
          )}
          <span
            className="status-pill"
            aria-label={
              errorCount > 0
                ? `${errorCount} error${errorCount > 1 ? "s" : ""}`
                : warningCount > 0
                  ? `${warningCount} warning${warningCount > 1 ? "s" : ""}`
                  : "Valid"
            }
          >
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
          <span className="status-pill" aria-label={`Last modified ${lastModifiedLabel ?? "unknown"}`}>
            <Clock3 className="w-3 h-3" />
            {lastModifiedLabel}
          </span>
          {currentFile.isReadOnly && (
            <span className="status-pill status-pill-warning" aria-label="Read only file">
              <FileLock2 className="w-3 h-3" />
              Read only
            </span>
          )}
          {dirty && (
            <span className="status-pill status-pill-warning" aria-label="Unsaved changes">
              <span className="file-chip-dot file-chip-dot-pulse" />
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
