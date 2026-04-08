import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultPreferences } from "@/lib/preferences";
import { useAppStore } from "@/lib/state/store";
import { FileOpener } from "./FileOpener";

const { mockInvoke, mockConfirm, mockOpen } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockConfirm: vi.fn(),
  mockOpen: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  confirm: mockConfirm,
  open: mockOpen,
}));

function resetStore(overrides: Partial<ReturnType<typeof useAppStore.getState>> = {}) {
  useAppStore.setState({
    currentFile: {
      path: "/tmp/current.json",
      content: '{"name":"before"}',
      format: "json",
      fileName: "current.json",
    },
    originalContent: '{"name":"before"}',
    rawContent: '{"name":"edited"}',
    configData: { name: "edited" },
    configRootKind: "object",
    dirty: true,
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

describe("FileOpener", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockConfirm.mockReset();
    mockOpen.mockReset();
    resetStore();
  });

  it("keeps the current file when opening another file is cancelled at the discard prompt", async () => {
    mockOpen.mockResolvedValue("/tmp/next.json");
    mockConfirm.mockResolvedValue(false);

    render(<FileOpener />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Open File" }));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        "You have unsaved changes. Discard them and open another file?",
        expect.objectContaining({
          title: "Unsaved changes",
          kind: "warning",
        })
      );
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(useAppStore.getState()).toMatchObject({
      currentFile: {
        path: "/tmp/current.json",
        fileName: "current.json",
      },
      dirty: true,
    });
  });

  it("replaces a dirty file after discard is confirmed", async () => {
    mockOpen.mockResolvedValue("/tmp/next.json");
    mockConfirm.mockResolvedValue(true);
    mockInvoke.mockResolvedValue({
      path: "/tmp/next.json",
      content: '{"name":"after"}',
      format: "json",
    });

    render(<FileOpener />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Open File" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("open_file", { path: "/tmp/next.json" });
    });

    expect(useAppStore.getState()).toMatchObject({
      currentFile: {
        path: "/tmp/next.json",
        fileName: "next.json",
      },
      originalContent: '{"name":"after"}',
      rawContent: '{"name":"after"}',
      configData: { name: "after" },
      dirty: false,
    });
  });

  it("opens a recent file from the recent-files menu", async () => {
    mockConfirm.mockResolvedValue(true);
    mockInvoke.mockResolvedValue({
      path: "/tmp/older.json",
      content: '{"name":"older"}',
      format: "json",
    });

    resetStore({
      dirty: false,
      recentFiles: ["/tmp/current.json", "/tmp/older.json"],
    });

    render(<FileOpener />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Recent files/i })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: /Recent files/i }));
    await user.click(screen.getByRole("button", { name: /older\.json/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("open_file", { path: "/tmp/older.json" });
    });

    expect(useAppStore.getState().currentFile?.path).toBe("/tmp/older.json");
  });

  it("uses the preferred default editor mode when the opened file supports it", async () => {
    mockOpen.mockResolvedValue("/tmp/next.json");
    mockConfirm.mockResolvedValue(true);
    mockInvoke.mockResolvedValue({
      path: "/tmp/next.json",
      content: '{"name":"after"}',
      format: "json",
    });

    resetStore({
      preferences: {
        ...createDefaultPreferences(),
        defaultOpenMode: "diff",
      },
    });

    render(<FileOpener />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Open File" }));

    await waitFor(() => {
      expect(useAppStore.getState().editorMode).toBe("diff");
    });
  });
});
