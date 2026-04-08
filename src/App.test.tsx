import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useAppStore } from "@/lib/state/store";

const { mockOpenFileIntoStore, mockSaveCurrentFile, mockRevertCurrentFile } = vi.hoisted(() => ({
  mockOpenFileIntoStore: vi.fn(),
  mockSaveCurrentFile: vi.fn(),
  mockRevertCurrentFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onCloseRequested: vi.fn().mockResolvedValue(() => {}),
    close: vi.fn(),
  }),
}));

vi.mock("@/lib/theme/useSystemTheme", () => ({
  useSystemTheme: () => "light",
}));

vi.mock("@/lib/fileSession", () => ({
  confirmDiscardUnsavedChanges: vi.fn(),
  openFileIntoStore: mockOpenFileIntoStore,
}));

vi.mock("@/lib/fileActions", () => ({
  saveCurrentFile: mockSaveCurrentFile,
  revertCurrentFile: mockRevertCurrentFile,
}));

vi.mock("@/components/editors/FormEditor", () => ({
  FormEditor: () => <div>Form Editor</div>,
}));

vi.mock("@/components/editors/StructureEditor", () => ({
  StructureEditor: () => <div>Structure Editor</div>,
}));

vi.mock("@/components/editors/RawEditor", () => ({
  RawEditor: () => <div>Raw Editor</div>,
}));

vi.mock("@/components/editors/DiffViewer", () => ({
  DiffViewer: () => <div>Diff Viewer</div>,
}));

vi.mock("@/components/layout/SaveFeedbackToast", () => ({
  SaveFeedbackToast: () => null,
}));

function resetStore(overrides: Partial<ReturnType<typeof useAppStore.getState>> = {}) {
  useAppStore.setState({
    currentFile: {
      path: "/tmp/config.json",
      content: '{"name":"before"}',
      format: "json",
      fileName: "config.json",
    },
    originalContent: '{"name":"before"}',
    rawContent: '{"name":"before"}',
    configData: { name: "before" },
    configRootKind: "object",
    dirty: false,
    editorMode: "form",
    validationErrors: [],
    recentFiles: [],
    isSaving: false,
    lastSaveResult: null,
    activeSection: "name",
    shortcutOverlayOpen: false,
    settingsOpen: false,
    editorPreferences: {
      rawWordWrap: true,
      rawLineNumbers: true,
      diffSideBySide: true,
    },
    editorActions: {},
    ...overrides,
  });
}

describe("App shortcuts", () => {
  beforeEach(() => {
    mockOpenFileIntoStore.mockReset();
    mockSaveCurrentFile.mockReset();
    mockRevertCurrentFile.mockReset();
    resetStore();
  });

  it("opens the shortcut overlay with ?", () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "?", shiftKey: true });

    expect(screen.getByRole("dialog", { name: "Keyboard Shortcuts" })).toBeInTheDocument();
  });

  it("does not open the shortcut overlay while typing in an input", () => {
    render(<App />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: "?", shiftKey: true, bubbles: true });

    expect(screen.queryByRole("dialog", { name: "Keyboard Shortcuts" })).not.toBeInTheDocument();
    input.remove();
  });

  it("opens settings with Cmd+,", () => {
    render(<App />);

    fireEvent.keyDown(window, { key: ",", metaKey: true });

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });

  it("switches editor modes with Cmd+number when the mode is available", () => {
    render(<App />);

    fireEvent.keyDown(window, { key: "4", metaKey: true });

    expect(useAppStore.getState().editorMode).toBe("diff");
  });

  it("routes save, revert, and find shortcuts through shared actions", () => {
    const find = vi.fn();
    resetStore({
      editorMode: "raw",
      editorActions: { find },
    });

    render(<App />);

    fireEvent.keyDown(window, { key: "s", metaKey: true });
    fireEvent.keyDown(window, { key: "r", metaKey: true });
    fireEvent.keyDown(window, { key: "f", metaKey: true });

    expect(mockSaveCurrentFile).toHaveBeenCalledTimes(1);
    expect(mockRevertCurrentFile).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenCalledTimes(1);
  });
});
