import { invoke } from "@tauri-apps/api/core";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import type { OpenFile } from "@/types";
import { useAppStore } from "@/lib/state/store";
import { detectFormat, getFileName, parseContent, supportsStructuredEditing, supportsVisualEditing } from "@/lib/parse";
import { FolderOpen } from "lucide-react";

export function FileOpener() {
  const {
    setCurrentFile,
    setOriginalContent,
    setRawContent,
    setConfigData,
    setDirty,
    setEditorMode,
    setValidationErrors,
    dirty,
    currentFile,
  } = useAppStore();

  async function handleOpenFile() {
    const selected = await dialogOpen({
      multiple: false,
      filters: [
        {
          name: "Config Files",
          extensions: ["json", "jsonc", "yaml", "yml", "toml"],
        },
      ],
    });

    if (!selected) return;

    const filePath = selected as string;

    try {
      const result = await invoke<OpenFile>("open_file", { path: filePath });
      const format = detectFormat(filePath);
      const parsed = parseContent(result.content, format);

      if (parsed.error) {
        setValidationErrors([
          {
            path: "/",
            message: parsed.error,
            severity: supportsStructuredEditing(format) ? "error" : "warning",
          },
        ]);
        setConfigData(null);
      } else {
        setConfigData(parsed.data);
        setValidationErrors([]);
      }

      setCurrentFile({
        path: filePath,
        content: result.content,
        format,
        fileName: getFileName(filePath),
      });
      setOriginalContent(result.content);
      setRawContent(result.content);
      setDirty(false);
      setEditorMode(parsed.data && supportsVisualEditing(format) ? "form" : "raw");
    } catch (e) {
      setValidationErrors([
        { path: "/", message: String(e), severity: "error" },
      ]);
    }
  }

  return (
    <div className="toolbar-cluster toolbar-cluster-start">
      <button
        id="open-file-btn"
        onClick={handleOpenFile}
        className="toolbar-button toolbar-button-primary"
        title="Open file (Cmd+O)"
      >
        <FolderOpen className="w-4 h-4" />
        <span>Open File</span>
      </button>
      {currentFile && (
        <div className="file-chip" title={currentFile.path}>
          <span className="file-chip-name">
            {currentFile.fileName}
          </span>
          {dirty && (
            <span className="file-chip-dot" title="Unsaved changes" />
          )}
        </div>
      )}
    </div>
  );
}
