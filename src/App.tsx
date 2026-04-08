import { useEffect, useCallback, useMemo, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import { useAppStore } from "@/lib/state/store";
import { isEditorModeAvailable } from "@/lib/editorModes";
import { getDataSections } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";
import { confirmDiscardUnsavedChanges, openFileIntoStore } from "@/lib/fileSession";
import { revertCurrentFile, saveCurrentFile } from "@/lib/fileActions";
import { Sidebar } from "@/components/layout/Sidebar";
import { ModeTabs } from "@/components/layout/ModeTabs";
import { StatusBar } from "@/components/layout/StatusBar";
import { WelcomeScreen } from "@/components/layout/WelcomeScreen";
import { SaveFeedbackToast } from "@/components/layout/SaveFeedbackToast";
import { AppUtilityControls } from "@/components/layout/AppUtilityControls";
import { ShortcutOverlay } from "@/components/layout/ShortcutOverlay";
import { SettingsDialog } from "@/components/layout/SettingsDialog";
import { FileOpener } from "@/components/file/FileOpener";
import { SaveControls } from "@/components/file/SaveControls";
import { FormEditor } from "@/components/editors/FormEditor";
import { RawEditor } from "@/components/editors/RawEditor";
import { StructureEditor } from "@/components/editors/StructureEditor";
import { DiffViewer } from "@/components/editors/DiffViewer";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        "input",
        "textarea",
        "select",
        "[contenteditable='true']",
        ".monaco-editor",
        ".jsoneditor",
      ].join(",")
    )
  );
}

function App() {
  useSystemTheme();

  const {
    currentFile,
    configData,
    configRootKind,
    editorMode,
    activeSection,
    setEditorMode,
    setActiveSection,
    setShortcutOverlayOpen,
    setSettingsOpen,
    shortcutOverlayOpen,
    settingsOpen,
    editorActions,
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
      const key = e.key.toLowerCase();
      const editableTarget = isEditableTarget(e.target);

      if (settingsOpen || shortcutOverlayOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setSettingsOpen(false);
          setShortcutOverlayOpen(false);
        }
        return;
      }

      if (isCmd && key === "o") {
        e.preventDefault();
        void handleOpenFile();
        return;
      }

      if (isCmd && key === "s" && !e.shiftKey) {
        e.preventDefault();
        void saveCurrentFile();
        return;
      }

      if (isCmd && key === "r" && !e.shiftKey) {
        e.preventDefault();
        void revertCurrentFile();
        return;
      }

      if (isCmd && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
        return;
      }

      if (isCmd && /^([1-4])$/.test(e.key) && currentFile) {
        const shortcutModes = ["form", "structure", "raw", "diff"] as const;
        const nextMode = shortcutModes[Number(e.key) - 1];
        const canSwitch = isEditorModeAvailable({
          mode: nextMode,
          format: currentFile.format,
          hasConfigData: Boolean(configData),
          configRootKind,
        });

        if (canSwitch) {
          e.preventDefault();
          setEditorMode(nextMode);
        }
        return;
      }

      if (isCmd && key === "f" && editorActions.find) {
        e.preventDefault();
        editorActions.find();
        return;
      }

      if (isCmd && key === "z") {
        if (editableTarget && editorMode !== "raw") {
          return;
        }

        const action = e.shiftKey ? editorActions.redo : editorActions.undo;
        if (action) {
          e.preventDefault();
          action();
        }
        return;
      }

      if (!isCmd && !e.altKey && !e.ctrlKey && !editableTarget && e.key === "?") {
        e.preventDefault();
        setShortcutOverlayOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    configData,
    configRootKind,
    currentFile,
    editorActions,
    editorMode,
    handleOpenFile,
    setEditorMode,
    setSettingsOpen,
    setShortcutOverlayOpen,
    settingsOpen,
    shortcutOverlayOpen,
  ]);

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
      <ShortcutOverlay />
      <SettingsDialog />
      <div className="app-topbar-shell shrink-0">
        <div className="app-topbar-panel">
          <FileOpener />
          <ModeTabs />
          <div className="toolbar-cluster toolbar-cluster-end">
            <AppUtilityControls />
            {currentFile && <SaveControls />}
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
