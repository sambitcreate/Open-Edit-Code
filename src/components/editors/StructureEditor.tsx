import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/state/store";

export function StructureEditor() {
  const { configData, setConfigData, setRawContent, setDirty, originalContent, currentFile } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<unknown>(null);
  const originalContentRef = useRef(originalContent);
  const [isLoading, setIsLoading] = useState(false);
  const editorTitle = useMemo(
    () => `${currentFile ? `${currentFile.fileName} · ` : ""}Structure`,
    [currentFile]
  );
  const isEmptyFile = Boolean(currentFile && !currentFile.content.trim());
  const isLargeFile = Boolean(currentFile && currentFile.content.length > 750_000);

  useEffect(() => {
    originalContentRef.current = originalContent;
  }, [originalContent]);

  const handleChange = useCallback(
    (updatedContent: { json?: unknown; text?: string }) => {
      if (updatedContent.json !== undefined && updatedContent.json !== null) {
        const data = updatedContent.json as Record<string, unknown>;
        setConfigData(data);
        const serialized = JSON.stringify(data, null, 2);
        setRawContent(serialized);
        setDirty(serialized !== originalContentRef.current);
      }
    },
    [setConfigData, setDirty, setRawContent]
  );

  useEffect(() => {
    if (!containerRef.current || !configData || !currentFile) return;

    let mounted = true;
    setIsLoading(true);

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
      if (mounted) {
        setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (editorRef.current) {
        (editorRef.current as { destroy: () => void }).destroy();
        editorRef.current = null;
      }
    };
  }, [currentFile, handleChange]);

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
          <div className="editor-empty-title">Open a file to view structure</div>
          <p className="editor-empty-copy">Structure view becomes available after a file is opened.</p>
        </div>
      </div>
    );
  }

  if (!configData) {
    return (
      <div className="editor-empty-state">
        <div className="editor-empty-card">
          <div className="editor-empty-title">No data to display</div>
          <p className="editor-empty-copy">Switch to Raw view to inspect or repair the file contents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-panel-shell">
      <header className="editor-panel-header">
        <div>
          <h2 className="editor-section-heading">{editorTitle}</h2>
          <p className="editor-section-breadcrumb">{currentFile.path}</p>
        </div>
        <div className="editor-context-stack">
          {isEmptyFile && (
            <div className="editor-context-banner">This file is empty, so there is no structure yet.</div>
          )}
          {isLargeFile && (
            <div className={cn("editor-context-banner", "editor-context-banner-warning")}>
              Large file detected. Structure view may take a moment to hydrate.
            </div>
          )}
        </div>
      </header>
      {isLoading && (
        <div className="editor-empty-state editor-empty-state-loading" aria-live="polite">
          <div className="editor-empty-card">
            <div className="editor-loading-shell" aria-hidden="true">
              <Loader2 className="editor-loading-spinner" />
            </div>
            <div className="editor-empty-title">Loading structure editor</div>
            <p className="editor-empty-copy">The interactive JSON editor is still initializing.</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className={cn("editor-panel-card", "overflow-hidden", isLoading && "editor-panel-card-loading")}
      />
    </div>
  );
}
