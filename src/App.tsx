import { useEffect, useCallback } from "react";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useAppStore } from "@/lib/state/store";
import { detectFormat, getFileName, parseContent } from "@/lib/parse";
import type { OpenFile } from "@/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { ModeTabs } from "@/components/layout/ModeTabs";
import { StatusBar } from "@/components/layout/StatusBar";
import { WelcomeScreen } from "@/components/layout/WelcomeScreen";
import { FileOpener } from "@/components/file/FileOpener";
import { SaveControls } from "@/components/file/SaveControls";
import { FormEditor } from "@/components/editors/FormEditor";
import { RawEditor } from "@/components/editors/RawEditor";
import { StructureEditor } from "@/components/editors/StructureEditor";
import { DiffViewer } from "@/components/editors/DiffViewer";

function App() {
  const {
    currentFile,
    editorMode,
  } = useAppStore();

  const handleOpenFile = useCallback(async () => {
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
      const store = useAppStore.getState();

      if (parsed.error) {
        store.setValidationErrors([
          { path: "/", message: parsed.error, severity: "error" },
        ]);
        store.setConfigData(null);
      } else {
        store.setConfigData(parsed.data);
        store.setValidationErrors([]);
      }

      store.setCurrentFile({
        path: filePath,
        content: result.content,
        format,
        fileName: getFileName(filePath),
      });
      store.setOriginalContent(result.content);
      store.setDirty(false);
      store.setEditorMode(parsed.data ? "form" : "raw");
    } catch (e) {
      useAppStore.getState().setValidationErrors([
        { path: "/", message: String(e), severity: "error" },
      ]);
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCmd = e.metaKey || e.ctrlKey;

      if (isCmd && e.key === "o") {
        e.preventDefault();
        handleOpenFile();
      }

      if (isCmd && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        document.getElementById("save-btn")?.click();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenFile]);

  const renderEditor = () => {
    switch (editorMode) {
      case "form":
        return <FormEditor />;
      case "structure":
        return <StructureEditor />;
      case "raw":
        return <RawEditor />;
      case "diff":
        return <DiffViewer />;
      default:
        return <FormEditor />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="h-11 bg-card border-b border-border flex items-center justify-between px-3 shrink-0">
        <FileOpener />
        <ModeTabs />
        <SaveControls />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {currentFile && <Sidebar />}
        <main className="flex-1 overflow-hidden">
          {currentFile ? renderEditor() : <WelcomeScreen />}
        </main>
      </div>

      <StatusBar />
    </div>
  );
}

export default App;
