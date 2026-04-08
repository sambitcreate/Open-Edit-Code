import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultPreferences } from "@/lib/preferences";
import { useAppStore } from "./store";

function resetStore() {
  useAppStore.setState({
    currentFile: null,
    originalContent: "",
    rawContent: "",
    configData: null,
    configRootKind: null,
    dirty: false,
    editorMode: "form",
    validationErrors: [],
    recentFiles: [],
    backups: [],
    isLoadingBackups: false,
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    preferences: createDefaultPreferences(),
  });
}

describe("useAppStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("deduplicates and promotes recently opened files", () => {
    const store = useAppStore.getState();

    store.setCurrentFile({
      path: "/tmp/first.json",
      content: "{}",
      format: "json",
      fileName: "first.json",
    });

    store.setCurrentFile({
      path: "/tmp/second.json",
      content: "{}",
      format: "json",
      fileName: "second.json",
    });

    store.setCurrentFile({
      path: "/tmp/first.json",
      content: "{}",
      format: "json",
      fileName: "first.json",
    });

    expect(useAppStore.getState().recentFiles).toEqual([
      "/tmp/first.json",
      "/tmp/second.json",
    ]);
  });

  it("caps recent files at ten entries", () => {
    const store = useAppStore.getState();

    for (let index = 0; index < 12; index++) {
      store.addRecentFile(`/tmp/file-${index}.json`);
    }

    expect(useAppStore.getState().recentFiles).toHaveLength(10);
    expect(useAppStore.getState().recentFiles[0]).toBe("/tmp/file-11.json");
    expect(useAppStore.getState().recentFiles[9]).toBe("/tmp/file-2.json");
  });

  it("resets file-specific state without clearing recents", () => {
    useAppStore.setState({
      currentFile: {
        path: "/tmp/config.json",
        content: "{}",
        format: "json",
        fileName: "config.json",
      },
      originalContent: "{}",
      rawContent: '{"name":"edited"}',
      configData: { name: "edited" },
      configRootKind: "object",
      dirty: true,
      validationErrors: [{ path: "/", message: "bad", severity: "error" }],
      recentFiles: ["/tmp/config.json"],
      backups: [{ path: "/tmp/backup", timestamp: "20260101_000000", original_path: "/tmp/config.json" }],
      lastSaveResult: { success: true, backup_path: "/tmp/backup", error: null },
      preferences: createDefaultPreferences(),
    });

    useAppStore.getState().resetFile();

    expect(useAppStore.getState()).toMatchObject({
      currentFile: null,
      originalContent: "",
      rawContent: "",
      configData: null,
      configRootKind: null,
      dirty: false,
      validationErrors: [],
      backups: [],
      lastSaveResult: null,
      recentFiles: ["/tmp/config.json"],
    });
  });

  it("updates preferences without disturbing file state", () => {
    const store = useAppStore.getState();

    store.updateEditorPreferences({ fontSize: 16, tabSize: 4 });
    store.setThemePreference("dark");
    store.setDefaultOpenMode("diff");

    expect(useAppStore.getState()).toMatchObject({
      currentFile: null,
      preferences: {
        themePreference: "dark",
        defaultOpenMode: "diff",
        editor: {
          fontSize: 16,
          tabSize: 4,
        },
      },
    });
  });
});
