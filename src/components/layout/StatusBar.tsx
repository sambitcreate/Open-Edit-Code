import { useAppStore } from "@/lib/state/store";
import { Check, AlertCircle, AlertTriangle, FileText } from "lucide-react";

export function StatusBar() {
  const { currentFile, dirty, validationErrors } = useAppStore();

  const errorCount = validationErrors.filter((e) => e.severity === "error").length;
  const warningCount = validationErrors.filter((e) => e.severity === "warning").length;

  return (
    <div className="statusbar-shell">
      {currentFile ? (
        <>
          <span className="status-pill" title={currentFile.path}>
            <FileText className="w-3 h-3" />
            {currentFile.format.toUpperCase()}
          </span>
          <span className="status-pill">Schema active</span>
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
