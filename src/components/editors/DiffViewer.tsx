import { lazy, Suspense, useEffect } from "react";
import { useAppStore } from "@/lib/state/store";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";

const MonacoDiffEditor = lazy(() =>
  import("@monaco-editor/react").then((module) => ({ default: module.DiffEditor }))
);

export function DiffViewer() {
  const theme = useSystemTheme();
  const { originalContent, rawContent, currentFile, preferences, setEditorActions } = useAppStore();

  const editorLanguage =
    currentFile?.format === "jsonc"
      ? "json"
      : currentFile?.format === "toml"
        ? "ini"
        : currentFile?.format ?? "json";

  useEffect(() => {
    return () => {
      setEditorActions({});
    };
  }, [setEditorActions]);

  if (!originalContent && !rawContent) {
    return (
      <div className="editor-empty-state">
        <div className="editor-empty-card">Open a file to view diff</div>
      </div>
    );
  }

  return (
    <div className="editor-panel-shell">
      <Suspense
        fallback={
          <div className="editor-empty-state">
            <div className="editor-empty-card">Loading diff...</div>
          </div>
        }
      >
        <div className="editor-panel-card">
          <MonacoDiffEditor
            height="100%"
            original={originalContent}
            modified={rawContent}
            language={editorLanguage}
            onMount={(editor) => {
              setEditorActions({
                find: () => {
                  const modifiedEditor = editor.getModifiedEditor();
                  modifiedEditor.focus();
                  void modifiedEditor.getAction("actions.find")?.run();
                },
              });
            }}
            theme={theme === "dark" ? "vs-dark" : "vs"}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: preferences.editor.fontSize,
              lineNumbers: preferences.editor.showLineNumbers ? "on" : "off",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              renderSideBySide: true,
              wordWrap: preferences.editor.wordWrap ? "on" : "off",
            }}
          />
        </div>
      </Suspense>
    </div>
  );
}
