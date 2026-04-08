import { useEffect, useCallback, useMemo, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { watch } from "@tauri-apps/plugin-fs";
import "./App.css";
import { useAppStore } from "@/lib/state/store";
import { getDataSections } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";
import { confirmDiscardUnsavedChanges, getCurrentFileStatus, loadFileIntoStore, openFileIntoStore } from "@/lib/fileSession";
import { Sidebar } from "@/components/layout/Sidebar";
import { ModeTabs } from "@/components/layout/ModeTabs";
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

  const {
    currentFile,
    configData,
    configRootKind,
    editorMode,
    activeSection,
    dirty,
    fileConflict,
    setActiveSection,
    updateCurrentFile,
    setFileConflict,
    acknowledgeFileConflict,
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

  useEffect(() => {
    if (!currentFile) {
      return;
    }

    let active = true;
    let unwatch: (() => void) | undefined;
    const baseline = {
      lastModified: currentFile.lastModified,
      sizeBytes: currentFile.sizeBytes,
    };

    const refreshFileStatus = async () => {
      const status = await getCurrentFileStatus(currentFile.path, baseline);

      if (!active || useAppStore.getState().currentFile?.path !== currentFile.path) {
        return;
      }

      updateCurrentFile({
        isReadOnly: status.isReadOnly,
      });

      const existingConflict = useAppStore.getState().fileConflict;

      if (!status.changed) {
        if (existingConflict) {
          setFileConflict(null);
        }
        return;
      }

      if (existingConflict?.onDiskModifiedAt === status.lastModified) {
        return;
      }

      setFileConflict({
        onDiskModifiedAt: status.lastModified,
        detectedAt: new Date().toISOString(),
        acknowledged: false,
      });
    };

    void refreshFileStatus();

    watch(
      currentFile.path,
      () => {
        void refreshFileStatus();
      },
      { delayMs: 250 }
    ).then((cleanup) => {
      if (!active) {
        cleanup();
        return;
      }

      unwatch = cleanup;
    }).catch(() => {
      // The focus refresh below still catches external edits if the watcher is unavailable.
    });

    const handleFocus = () => {
      void refreshFileStatus();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
      unwatch?.();
    };
  }, [
    currentFile?.path,
    currentFile?.lastModified,
    currentFile?.sizeBytes,
    setFileConflict,
    updateCurrentFile,
  ]);

  const handleReloadFromDisk = useCallback(async () => {
    if (!currentFile) {
      return;
    }

    if (dirty) {
      const shouldDiscard = await confirmDiscardUnsavedChanges(
        "Discard your unsaved changes and reload the version currently on disk?"
      );

      if (!shouldDiscard) {
        return;
      }
    }

    await loadFileIntoStore(currentFile.path);
  }, [currentFile, dirty]);

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
      <a className="skip-link" href="#main-editor">
        Skip to main editor
      </a>
      <SaveFeedbackToast />
      <div className="app-topbar-shell shrink-0">
        <div className="app-topbar-panel">
          <FileOpener />
          <ModeTabs />
          <SaveControls />
        </div>
      </div>

      {currentFile && fileConflict && !fileConflict.acknowledged && (
        <div className="file-conflict-banner" role="alert">
          <div className="file-conflict-copy">
            <strong>File changed on disk.</strong>
            <span>
              {fileConflict.onDiskModifiedAt
                ? ` Newer disk version detected at ${new Date(fileConflict.onDiskModifiedAt).toLocaleString()}.`
                : " The file may have been changed or removed outside the app."}
            </span>
          </div>
          <div className="file-conflict-actions">
            <button type="button" className="toolbar-button toolbar-button-secondary" onClick={handleReloadFromDisk}>
              Reload
            </button>
            <button type="button" className="toolbar-button toolbar-button-primary" onClick={acknowledgeFileConflict}>
              Keep mine
            </button>
          </div>
        </div>
      )}

      <div className={cn("app-body", sidebarSections.length > 0 && "app-body-with-sidebar")}>
        <Sidebar sections={sidebarSections} />
        <main id="main-editor" className="app-main" tabIndex={-1} aria-label="Main editor">
          {currentFile ? renderEditor() : <WelcomeScreen onOpenFile={handleOpenFile} />}
        </main>
      </div>

      <div className="statusbar-region" role="status" aria-live="polite" aria-atomic="true">
        <StatusBar />
      </div>
    </div>
  );
}

export default App;
