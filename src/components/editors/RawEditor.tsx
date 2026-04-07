import { lazy, Suspense, useCallback } from "react";
import { useAppStore } from "@/lib/state/store";
import { serializeJson } from "@/lib/parse";

const MonacoEditor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.default })));

export function RawEditor() {
  const { configData, setConfigData, setDirty, originalContent, currentFile } = useAppStore();

  const content = configData ? serializeJson(configData) : "";

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      try {
        const parsed = JSON.parse(value);
        setConfigData(parsed);
        setDirty(value !== originalContent);
      } catch {
        // user is still typing
      }
    },
    [setConfigData, setDirty, originalContent]
  );

  if (!currentFile) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="neu-card p-6 text-center text-muted-foreground text-sm">
          Open a file to edit
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full p-8">
            <div className="neu-card p-6 text-center text-muted-foreground text-sm">
              Loading editor...
            </div>
          </div>
        }
      >
        <MonacoEditor
          height="100%"
          defaultLanguage="json"
          value={content}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </Suspense>
    </div>
  );
}
