import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Settings2 } from "lucide-react";
import "./App.css";
import { useAppStore } from "@/lib/state/store";
import { getDataSections } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";
import { refreshBackupsForCurrentFile } from "@/lib/backups";
import {
  confirmDiscardUnsavedChanges,
  openFileIntoStore,
  reopenMostRecentFileIntoStore,
} from "@/lib/fileSession";
import { Sidebar } from "@/components/layout/Sidebar";
import { ModeTabs } from "@/components/layout/ModeTabs";
import { SettingsDrawer } from "@/components/layout/SettingsDrawer";
import { StatusBar } from "@/components/layout/StatusBar";
import { WelcomeScreen } from "@/components/layout/WelcomeScreen";
import { SaveFeedbackToast } from "@/components/layout/SaveFeedbackToast";
import { FileOpener } from "@/components/file/FileOpener";
import { SaveControls } from "@/components/file/SaveControls";
import { FormEditor } from "@/components/editors/FormEditor";
import { RawEditor } from "@/components/editors/RawEditor";
import { StructureEditor } from "@/components/editors/StructureEditor";
import { DiffViewer } from "@/components/editors/DiffViewer";

function App() {
  useSystemTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    currentFile,
    configData,
    configRootKind,
    editorMode,
    activeSection,
    setActiveSection,
  } = useAppStore();
  const allowWindowCloseRef = useRef(false);

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
    await openFileIntoStore();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCmd = e.metaKey || e.ctrlKey;

      if (isCmd && e.key === "o" && !e.shiftKey) {
        e.preventDefault();
        handleOpenFile();
      }

      if (isCmd && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        void reopenMostRecentFileIntoStore();
      }

      if (isCmd && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        document.getElementById("save-btn")?.click();
      }

      if (isCmd && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
      }

      if (e.key === "Escape") {
        setIsSettingsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenFile]);

  useEffect(() => {
    void refreshBackupsForCurrentFile();
  }, [currentFile?.path]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!useAppStore.getState().dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }

    let active = true;
    let unlisten: (() => void) | undefined;
    const appWindow = getCurrentWindow();

    appWindow.onCloseRequested(async (event) => {
      if (allowWindowCloseRef.current || !useAppStore.getState().dirty) {
        return;
      }

      event.preventDefault();
      const shouldDiscard = await confirmDiscardUnsavedChanges(
        "Discard your unsaved changes and close the window?"
      );

      if (!shouldDiscard) {
        return;
      }

      allowWindowCloseRef.current = true;
      await appWindow.close();
    }).then((cleanup) => {
      if (!active) {
        cleanup();
        return;
      }

      unlisten = cleanup;
    });

    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

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
      <SaveFeedbackToast />
      <SettingsDrawer open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <div className="app-topbar-shell shrink-0">
        <div className="app-topbar-panel">
          <FileOpener />
          <ModeTabs />
          <div className="toolbar-cluster toolbar-cluster-end">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="toolbar-button toolbar-button-secondary"
              title="Preferences (Cmd+,)"
            >
              <Settings2 className="w-4 h-4" />
              Preferences
            </button>
            <SaveControls />
          </div>
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
