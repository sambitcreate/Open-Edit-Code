import { useEffect, useCallback, useMemo } from "react";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useAppStore } from "@/lib/state/store";
import { detectFormat, getFileName, parseContent, supportsStructuredEditing, supportsVisualEditing } from "@/lib/parse";
import { getDataSections } from "@/lib/schema";
import type { OpenFile } from "@/types";
import { cn } from "@/lib/utils";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";
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
  useSystemTheme();

  const {
    currentFile,
    configData,
    configRootKind,
    editorMode,
    activeSection,
    setActiveSection,
  } = useAppStore();

  const sidebarSections = useMemo(
    () => (configRootKind === "object" ? getDataSections(configData) : []),
    [configData, configRootKind]
  );

  useEffect(() => {
    if (sidebarSections.length === 0) {
      return;
    }

    if (!sidebarSections.some((section) => section.id === activeSection)) {
      setActiveSection(sidebarSections[0].id);
    }
  }, [activeSection, setActiveSection, sidebarSections]);

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
            {
            path: "/",
            message: parsed.error,
            severity: supportsStructuredEditing(format) ? "error" : "warning",
          },
          ]);
          store.setConfigData(null);
          store.setConfigRootKind(null);
        } else {
          store.setConfigData(parsed.data);
          store.setConfigRootKind(parsed.rootKind);
          store.setValidationErrors([]);
        }

      store.setCurrentFile({
        path: filePath,
        content: result.content,
        format,
        fileName: getFileName(filePath),
      });
        store.setOriginalContent(result.content);
        store.setRawContent(result.content);
        store.setDirty(false);
        store.setEditorMode(
          parsed.data && parsed.rootKind === "object" && supportsVisualEditing(format)
            ? "form"
            : "raw"
        );
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
    <div className="app-shell">
      <div className="app-topbar-shell shrink-0">
        <div className="app-topbar-panel">
          <FileOpener />
          <ModeTabs />
          <SaveControls />
        </div>
      </div>

      <div className={cn("app-body", sidebarSections.length > 0 && "app-body-with-sidebar")}>
        <Sidebar sections={sidebarSections} />
        <main className="app-main">
          {currentFile ? renderEditor() : <WelcomeScreen />}
        </main>
      </div>

      <StatusBar />
    </div>
  );
}

export default App;
