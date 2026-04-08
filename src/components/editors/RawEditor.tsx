import { lazy, Suspense, useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/state/store";
import { parseContent, supportsStructuredEditing } from "@/lib/parse";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";
import { createValidationError, getValidationMarkerRange } from "@/lib/validation/utils";

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
    configRootKind,
    editorMode,
    validationErrors,
    validationFocusRequest,
    setValidationErrors,
    setEditorActions,
    preferences,
  } = useAppStore();
  const editorRef = useRef<{
    focus: () => void;
    getModel: () => unknown;
    getAction: (id: string) => { run: () => Promise<unknown> } | undefined;
    trigger: (source: string, handlerId: string, payload: unknown) => void;
    setPosition: (position: { lineNumber: number; column: number }) => void;
    revealPositionInCenter: (position: { lineNumber: number; column: number }) => void;
  } | null>(null);
  const monacoRef = useRef<{
    MarkerSeverity: { Error: number; Warning: number };
    editor: {
      setModelMarkers: (
        model: unknown,
        owner: string,
        markers: Array<{
          startLineNumber: number;
          startColumn: number;
          endLineNumber: number;
          endColumn: number;
          message: string;
          severity: number;
        }>
      ) => void;
    };
  } | null>(null);

  const editorLanguage =
    currentFile?.format === "jsonc"
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
          createValidationError(
            "/",
            parsed.error,
            supportsStructuredEditing(currentFile.format) ? "error" : "warning",
            value
          ),
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

  const applyMarkers = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();

    if (!editor || !monaco || !model) {
      return;
    }

    const markers = validationErrors.map((error) => ({
      ...getValidationMarkerRange(rawContent, error),
      message: error.message,
      severity:
        error.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
    }));

    monaco.editor.setModelMarkers(model, "config-studio-validation", markers);
  }, [rawContent, validationErrors]);

  useEffect(() => {
    applyMarkers();
  }, [applyMarkers]);

  useEffect(() => {
    if (!validationFocusRequest || editorMode !== "raw") {
      return;
    }

    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const range = getValidationMarkerRange(rawContent, validationFocusRequest.error);
    const position = {
      lineNumber: range.startLineNumber,
      column: range.startColumn,
    };

    editor.focus();
    editor.setPosition(position);
    editor.revealPositionInCenter(position);
  }, [editorMode, rawContent, validationFocusRequest]);

  useEffect(() => {
    return () => {
      setEditorActions({});
    };
  }, [setEditorActions]);

  if (!currentFile) {
    return (
      <div className="editor-empty-state">
        <div className="editor-empty-card">Open a file to edit</div>
      </div>
    );
  }

  const rawModeNotice =
    currentFile.format === "yaml" || currentFile.format === "toml"
      ? {
          eyebrow: `${currentFile.format.toUpperCase()} format`,
          title: `${currentFile.format.toUpperCase()} files stay in Raw mode for now`,
          description:
            "Structured editing is not available yet for this format. Raw editing is fully supported today, and broader format support is planned.",
        }
      : configRootKind === "array"
        ? {
            eyebrow: "Array root",
            title: "This file's root is an array",
            description:
              "Form mode only works with object-based JSON files. Use Raw or Structure view to inspect and edit array items.",
          }
        : null;

  return (
    <div className={rawModeNotice ? "editor-panel-shell editor-panel-shell-with-note" : "editor-panel-shell"}>
      {rawModeNotice && (
        <div className="editor-context-card">
          <span className="editor-context-eyebrow">{rawModeNotice.eyebrow}</span>
          <h2 className="editor-context-title">{rawModeNotice.title}</h2>
          <p className="editor-context-description">{rawModeNotice.description}</p>
        </div>
      )}
      <Suspense
        fallback={
          <div className="editor-empty-state">
            <div className="editor-empty-card">Loading editor...</div>
          </div>
        }
      >
        <div className="editor-panel-card">
          <MonacoEditor
            height="100%"
            defaultLanguage={editorLanguage}
            value={rawContent}
            onChange={handleChange}
            onMount={(editor, monaco) => {
              editorRef.current = editor as typeof editorRef.current;
              monacoRef.current = monaco as typeof monacoRef.current;
              applyMarkers();
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
              fontSize: preferences.editor.fontSize,
              lineNumbers: preferences.editor.showLineNumbers ? "on" : "off",
              wordWrap: preferences.editor.wordWrap ? "on" : "off",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: preferences.editor.tabSize,
              padding: { top: 22, bottom: 22 },
            }}
          />
        </div>
      </Suspense>
    </div>
  );
}
