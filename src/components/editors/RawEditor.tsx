import { lazy, Suspense, useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/state/store";
import { parseContent, supportsStructuredEditing } from "@/lib/parse";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";

const MonacoEditor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.default })));

export function RawEditor() {
  const theme = useSystemTheme();
  const {
    rawContent,
    setRawContent,
    setConfigData,
    setConfigRootKind,
    setDirty,
    originalContent,
    currentFile,
    setValidationErrors,
  } = useAppStore();

  const editorLanguage = currentFile?.format === "jsonc"
    ? "json"
    : currentFile?.format === "toml"
      ? "ini"
      : currentFile?.format ?? "json";
  const isEmptyFile = Boolean(currentFile && !currentFile.content.trim());
  const isLargeFile = Boolean(currentFile && currentFile.content.length > 750_000);
  const editorTitle = useMemo(
    () => `${currentFile ? `${currentFile.fileName} · ` : ""}Raw`,
    [currentFile]
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined || !currentFile) return;

      setRawContent(value);
      setDirty(value !== originalContent);

      const parsed = parseContent(value, currentFile.format);
      if (parsed.error) {
        setConfigData(null);
        setConfigRootKind(null);
        setValidationErrors([
          {
            path: "/",
            message: parsed.error,
            severity: supportsStructuredEditing(currentFile.format) ? "error" : "warning",
          },
        ]);
        return;
      }

      setConfigData(parsed.data);
      setConfigRootKind(parsed.rootKind);
      setValidationErrors([]);
    },
    [
      currentFile,
      originalContent,
      setConfigData,
      setConfigRootKind,
      setDirty,
      setRawContent,
      setValidationErrors,
    ]
  );

  if (!currentFile) {
    return (
      <div className="editor-empty-state">
        <div className="editor-empty-card">
          <div className="editor-empty-title">Open a file to edit</div>
          <p className="editor-empty-copy">Raw editing becomes available once a file is opened.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-panel-shell">
      <header className="editor-panel-header">
        <div>
          <h2 className="editor-section-heading">{editorTitle}</h2>
          <p className="editor-section-breadcrumb">
            {currentFile.path}
          </p>
        </div>
        <div className="editor-context-stack">
          {isEmptyFile && (
            <div className="editor-context-banner">This file is empty, so the editor starts blank.</div>
          )}
          {isLargeFile && (
            <div className={cn("editor-context-banner", "editor-context-banner-warning")}>
              Large file detected. Monaco may take a moment to finish loading and rendering.
            </div>
          )}
        </div>
      </header>
      <Suspense
        fallback={
          <div className="editor-empty-state editor-empty-state-loading">
            <div className="editor-empty-card">
              <div className="editor-loading-shell" aria-hidden="true">
                <Loader2 className="editor-loading-spinner" />
              </div>
              <div className="editor-empty-title">Loading editor</div>
              <p className="editor-empty-copy">Monaco is still loading for the first time.</p>
            </div>
          </div>
        }
      >
        <div className="editor-panel-card">
          <MonacoEditor
            height="100%"
            defaultLanguage={editorLanguage}
            value={rawContent}
            onChange={handleChange}
            theme={theme === "dark" ? "vs-dark" : "vs"}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 22, bottom: 22 },
            }}
          />
        </div>
      </Suspense>
    </div>
  );
}
