import { useAppStore } from "@/lib/state/store";
import { DiffEditor } from "@monaco-editor/react";

export function DiffViewer() {
  const { originalContent, configData } = useAppStore();

  const modified = configData ? JSON.stringify(configData, null, 2) : "";

  if (!originalContent && !configData) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="neu-card p-6 text-center text-muted-foreground text-sm">
          Open a file to view diff
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <DiffEditor
        height="100%"
        original={originalContent}
        modified={modified}
        language="json"
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          renderSideBySide: true,
        }}
      />
    </div>
  );
}
