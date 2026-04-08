import { useMemo } from "react";
import { useAppStore } from "@/lib/state/store";
import { getDataSections } from "@/lib/schema";
import { supportsStructuredEditing } from "@/lib/parse";
import { formatValidationPath, getTopLevelValidationSection } from "@/lib/validation/utils";
import { Check, AlertCircle, AlertTriangle, ChevronDown, ChevronUp, FileText } from "lucide-react";

export function StatusBar() {
  const {
    currentFile,
    dirty,
    validationErrors,
    configData,
    configRootKind,
    activeSection,
    editorMode,
    validationPanelOpen,
    setValidationPanelOpen,
    setActiveSection,
    requestValidationFocus,
  } = useAppStore();
  const sections = useMemo(
    () => (configRootKind === "object" ? getDataSections(configData) : []),
    [configData, configRootKind]
  );

  const errorCount = validationErrors.filter((error) => error.severity === "error").length;
  const warningCount = validationErrors.filter((error) => error.severity === "warning").length;
  const schemaStatus = !currentFile
    ? null
    : !supportsStructuredEditing(currentFile.format)
      ? `${currentFile.format.toUpperCase()} raw only for now`
      : configRootKind === "object"
        ? `${sections.length} top-level key${sections.length === 1 ? "" : "s"}`
        : configRootKind === "array"
          ? "Array root: Raw or Structure"
          : "Fix JSON in Raw mode";

  const hasValidationDetails = validationErrors.length > 0;

  function handleValidationItemClick(index: number) {
    const error = validationErrors[index];
    if (!error) {
      return;
    }

    if (editorMode === "form") {
      const targetSection = getTopLevelValidationSection(error.path);
      if (targetSection) {
        setActiveSection(targetSection);
      }
    }

    requestValidationFocus(error);
  }

  return (
    <div className="statusbar-stack">
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
            {hasValidationDetails ? (
              <button
                type="button"
                className="status-pill status-pill-button"
                aria-expanded={validationPanelOpen}
                aria-controls="validation-panel"
                onClick={() => setValidationPanelOpen(!validationPanelOpen)}
              >
                {errorCount > 0 ? (
                  <>
                    <AlertCircle className="w-3 h-3 text-danger" />
                    {errorCount} error{errorCount > 1 ? "s" : ""}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-warning" />
                    {warningCount} warning{warningCount > 1 ? "s" : ""}
                  </>
                )}
                {validationPanelOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            ) : (
              <span className="status-pill">
                <Check className="w-3 h-3 text-success" />
                Valid
              </span>
            )}
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
          <span className="status-empty">
            No file open <kbd className="status-kbd">Cmd+O</kbd> to open {" · "}
            <kbd className="status-kbd">?</kbd> for shortcuts
          </span>
        )}
      </div>

      {currentFile && validationPanelOpen && hasValidationDetails && (
        <div id="validation-panel" className="validation-panel" role="region" aria-label="Validation issues">
          <div className="validation-panel-header">
            <span className="validation-panel-title">Validation issues</span>
            <span className="validation-panel-summary">
              {errorCount} error{errorCount === 1 ? "" : "s"}
              {warningCount > 0 ? `, ${warningCount} warning${warningCount === 1 ? "" : "s"}` : ""}
            </span>
          </div>
          <div className="validation-panel-list">
            {validationErrors.map((error, index) => (
              <button
                key={`${error.severity}-${error.path}-${error.message}-${error.line ?? "line"}-${error.column ?? "column"}`}
                type="button"
                className="validation-item"
                onClick={() => handleValidationItemClick(index)}
              >
                <span
                  className={`validation-item-badge ${
                    error.severity === "error"
                      ? "validation-item-badge-error"
                      : "validation-item-badge-warning"
                  }`}
                >
                  {error.severity}
                </span>
                <span className="validation-item-path">{formatValidationPath(error.path)}</span>
                <span className="validation-item-message">{error.message}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
