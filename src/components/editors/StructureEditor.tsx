import { useEffect, useRef, useCallback } from "react";
import { getJsonFormatPreferences } from "@/lib/preferences";
import { serializeJson } from "@/lib/parse";
import { useAppStore } from "@/lib/state/store";

export function StructureEditor() {
  const { configData, setConfigData, setRawContent, setDirty, originalContent, currentFile, preferences } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<unknown>(null);
  const originalContentRef = useRef(originalContent);

  useEffect(() => {
    originalContentRef.current = originalContent;
  }, [originalContent]);

  const handleChange = useCallback(
    (updatedContent: { json?: unknown; text?: string }) => {
      if (updatedContent.json !== undefined && updatedContent.json !== null) {
        const data = updatedContent.json as Record<string, unknown>;
        setConfigData(data);
        const serialized = serializeJson(
          data,
          "object",
          getJsonFormatPreferences(preferences, currentFile?.format ?? "json")
        );
        setRawContent(serialized);
        setDirty(serialized !== originalContentRef.current);
      }
    },
    [currentFile?.format, preferences, setConfigData, setDirty, setRawContent]
  );

  useEffect(() => {
    if (!containerRef.current || !configData || !currentFile) return;

    let mounted = true;

    import("vanilla-jsoneditor").then((mod) => {
      if (!mounted || !containerRef.current) return;

      if (editorRef.current) {
        (editorRef.current as { destroy: () => void }).destroy();
      }

      const JSONEditor = mod.JSONEditor as unknown as new (props: {
        target: HTMLElement;
        props: Record<string, unknown>;
      }) => { destroy: () => void; set: (props: Record<string, unknown>) => void };
      const editor = new JSONEditor({
        target: containerRef.current,
        props: {
          content: {
            json: configData,
          },
          onChange: handleChange,
        },
      });

      editorRef.current = editor;
    });

    return () => {
      mounted = false;
      if (editorRef.current) {
        (editorRef.current as { destroy: () => void }).destroy();
        editorRef.current = null;
      }
    };
  }, [currentFile]);

  useEffect(() => {
    if (editorRef.current && configData) {
      const editor = editorRef.current as { set: (props: { content: { json: unknown } }) => void };
      try {
        editor.set({
          content: { json: configData },
        });
      } catch {
        // editor may not be ready
      }
    }
  }, [configData]);

  if (!currentFile) {
    return (
      <div className="editor-empty-state">
        <div className="editor-empty-card">
          Open a file to view structure
        </div>
      </div>
    );
  }

  if (!configData) {
    return (
      <div className="editor-empty-state">
        <div className="editor-empty-card">
          No data to display
        </div>
      </div>
    );
  }

  return (
    <div className="editor-panel-shell">
      <div
        ref={containerRef}
        className="editor-panel-card overflow-hidden"
      />
    </div>
  );
}
