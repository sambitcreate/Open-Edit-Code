import { lazy, Suspense, useCallback, useEffect } from "react";
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
    setEditorActions,
    editorPreferences,
  } = useAppStore();

  const editorLanguage = currentFile?.format === "jsonc"
    ? "json"
    : currentFile?.format === "toml"
      ? "ini"
      : currentFile?.format ?? "json";

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

  useEffect(() => {
    return () => {
      setEditorActions({});
    };
  }, [setEditorActions]);

  if (!currentFile) {
    return (
      <div className="editor-empty-state">
        <div className="editor-empty-card">
          Open a file to edit
        </div>
      </div>
    );
  }

  return (
    <div className="editor-panel-shell">
      <Suspense
        fallback={
          <div className="editor-empty-state">
            <div className="editor-empty-card">
              Loading editor...
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
            onMount={(editor) => {
              setEditorActions({
                find: () => {
                  editor.focus();
                  void editor.getAction("actions.find")?.run();
                },
                undo: () => {
                  editor.focus();
                  editor.trigger("keyboard", "undo", null);
                },
                redo: () => {
                  editor.focus();
                  editor.trigger("keyboard", "redo", null);
                },
              });
            }}
            theme={theme === "dark" ? "vs-dark" : "vs"}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: editorPreferences.rawLineNumbers ? "on" : "off",
              wordWrap: editorPreferences.rawWordWrap ? "on" : "off",
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
