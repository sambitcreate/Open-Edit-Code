import { beforeEach, describe, expect, it } from "vitest";
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
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    fileConflict: null,
    jsoncCommentWarningAcceptedFor: null,
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
      lastModified: null,
      sizeBytes: 2,
      isReadOnly: false,
    });

    store.setCurrentFile({
      path: "/tmp/second.json",
      content: "{}",
      format: "json",
      fileName: "second.json",
      lastModified: null,
      sizeBytes: 2,
      isReadOnly: false,
    });

    store.setCurrentFile({
      path: "/tmp/first.json",
      content: "{}",
      format: "json",
      fileName: "first.json",
      lastModified: null,
      sizeBytes: 2,
      isReadOnly: false,
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
        lastModified: null,
        sizeBytes: 2,
        isReadOnly: false,
      },
      originalContent: "{}",
      rawContent: '{"name":"edited"}',
      configData: { name: "edited" },
      configRootKind: "object",
      dirty: true,
      validationErrors: [{ path: "/", message: "bad", severity: "error" }],
      recentFiles: ["/tmp/config.json"],
      lastSaveResult: { success: true, backup_path: "/tmp/backup", error: null },
      fileConflict: {
        onDiskModifiedAt: "2026-04-08T10:00:00.000Z",
        detectedAt: "2026-04-08T10:05:00.000Z",
        acknowledged: false,
      },
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
      lastSaveResult: null,
      fileConflict: null,
      recentFiles: ["/tmp/config.json"],
    });
  });
});
