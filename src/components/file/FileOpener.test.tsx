import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/lib/state/store";
import { FileOpener } from "./FileOpener";

const { mockInvoke, mockConfirm, mockOpen, mockStat } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockConfirm: vi.fn(),
  mockOpen: vi.fn(),
  mockStat: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  confirm: mockConfirm,
  open: mockOpen,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  stat: mockStat,
}));

function resetStore(overrides: Partial<ReturnType<typeof useAppStore.getState>> = {}) {
  useAppStore.setState({
    currentFile: {
      path: "/tmp/current.json",
      content: '{"name":"before"}',
      format: "json",
      fileName: "current.json",
      lastModified: "2026-04-08T10:00:00.000Z",
      sizeBytes: 17,
      isReadOnly: false,
    },
    originalContent: '{"name":"before"}',
    rawContent: '{"name":"edited"}',
    configData: { name: "edited" },
    configRootKind: "object",
    dirty: true,
    editorMode: "form",
    validationErrors: [],
    recentFiles: [],
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    fileConflict: null,
    jsoncCommentWarningAcceptedFor: null,
    ...overrides,
  });
}

describe("FileOpener", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockConfirm.mockReset();
    mockOpen.mockReset();
    mockStat.mockReset();
    mockStat.mockResolvedValue({
      mtime: new Date("2026-04-08T10:00:00.000Z"),
      size: 17,
      readonly: false,
    });
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
      last_modified: "2026-04-08T10:02:00.000Z",
      readonly: false,
      size: 16,
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
        isReadOnly: false,
      },
      originalContent: '{"name":"after"}',
      rawContent: '{"name":"after"}',
      configData: { name: "after" },
      dirty: false,
    });
  });
});
