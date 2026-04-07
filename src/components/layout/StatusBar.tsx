import { useAppStore } from "@/lib/state/store";
import { Check, AlertCircle, AlertTriangle, FileText } from "lucide-react";

export function StatusBar() {
  const { currentFile, dirty, validationErrors } = useAppStore();

  const errorCount = validationErrors.filter((e) => e.severity === "error").length;
  const warningCount = validationErrors.filter((e) => e.severity === "warning").length;

  return (
    <div className="h-7 bg-card border-t border-border flex items-center px-3 gap-4 text-[11px] text-muted-foreground">
      {currentFile ? (
        <>
          <span className="flex items-center gap-1.5" title={currentFile.path}>
            <FileText className="w-3 h-3" />
            {currentFile.format.toUpperCase()}
          </span>
          <span>Schema: active</span>
          <span className="flex items-center gap-1.5">
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
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              <span className="text-warning font-medium">Unsaved</span>
            </span>
          )}
          <span className="ml-auto truncate max-w-[300px]" title={currentFile.path}>
            {currentFile.path}
          </span>
        </>
      ) : (
        <span>No file open — <kbd className="px-1 py-0.5 text-[10px] bg-background rounded border border-border font-mono">Cmd+O</kbd> to open</span>
      )}
    </div>
  );
}
