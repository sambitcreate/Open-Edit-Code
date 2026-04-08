import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultPreferences } from "@/lib/preferences";
import { useAppStore } from "@/lib/state/store";
import { SaveFeedbackToast } from "./SaveFeedbackToast";

function resetStore(overrides: Partial<ReturnType<typeof useAppStore.getState>> = {}) {
  useAppStore.setState({
    currentFile: {
      path: "/tmp/config.json",
      content: "{}",
      format: "json",
      fileName: "config.json",
    },
    originalContent: "{}",
    rawContent: "{}",
    configData: {},
    configRootKind: "object",
    dirty: false,
    editorMode: "form",
    validationErrors: [],
    validationPanelOpen: false,
    validationFocusRequest: null,
    recentFiles: [],
    backups: [],
    isLoadingBackups: false,
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    preferences: createDefaultPreferences(),
    shortcutOverlayOpen: false,
    settingsOpen: false,
    editorActions: {},
    jsoncCommentWarningAcceptedFor: null,
    ...overrides,
  });
}

describe("SaveFeedbackToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("shows a save confirmation with the backup path", async () => {
    render(<SaveFeedbackToast />);

    await act(async () => {
      useAppStore.getState().setLastSaveResult({
        success: true,
        backup_path: "/tmp/backups/config.json_20260101_000000.bak",
        error: null,
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent("Saved config.json");
    expect(screen.getByText(/Backup created at \/tmp\/backups\/config\.json_20260101_000000\.bak/)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(7000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows save failures as alerts", async () => {
    render(<SaveFeedbackToast />);

    await act(async () => {
      useAppStore.getState().setLastSaveResult({
        success: false,
        backup_path: null,
        error: "Failed to replace original file: permission denied",
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t save config.json");
    expect(screen.getByText("Failed to replace original file: permission denied")).toBeInTheDocument();
  });
});
