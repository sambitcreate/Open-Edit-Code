import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultPreferences } from "@/lib/preferences";
import { useAppStore } from "@/lib/state/store";
import { ModeTabs } from "./ModeTabs";

const { mockConfirm } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  confirm: mockConfirm,
}));

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
    editorMode: "raw",
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
    jsoncCommentWarningAcceptedFor: null,
    shortcutOverlayOpen: false,
    settingsOpen: false,
    editorActions: {},
    ...overrides,
  });
}

describe("ModeTabs", () => {
  beforeEach(() => {
    mockConfirm.mockReset();
    mockConfirm.mockResolvedValue(true);
    resetStore();
  });

  it("keeps form disabled but allows structure for array-root JSON content", () => {
    resetStore({
      currentFile: {
        path: "/tmp/config.json",
        content: "[1,2,3]",
        format: "json",
        fileName: "config.json",
      },
      configData: { _root: [1, 2, 3] },
      configRootKind: "array",
    });

    render(<ModeTabs />);

    expect(screen.getByRole("button", { name: "Form" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Structure" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Raw" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Diff" })).toBeEnabled();
  });

  it("warns before switching a commented JSONC file into form mode", async () => {
    resetStore({
      currentFile: {
        path: "/tmp/config.jsonc",
        content: ['{', '  // comment', '  "name": "demo"', '}'].join("\n"),
        format: "jsonc",
        fileName: "config.jsonc",
      },
      originalContent: ['{', '  // comment', '  "name": "demo"', '}'].join("\n"),
      rawContent: ['{', '  // comment', '  "name": "demo"', '}'].join("\n"),
      configData: { name: "demo" },
      configRootKind: "object",
      editorMode: "raw",
    });

    render(<ModeTabs />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Form" }));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        "This JSONC file contains comments. Form and Structure view do not preserve comments yet, so switching modes can remove them after an edit or save.",
        expect.objectContaining({
          title: "Comments may be removed",
          kind: "warning",
        })
      );
    });

    expect(useAppStore.getState()).toMatchObject({
      editorMode: "form",
      jsoncCommentWarningAcceptedFor: ['{', '  // comment', '  "name": "demo"', '}'].join("\n"),
    });
  });

  it("stays in raw mode when the JSONC warning is cancelled", async () => {
    mockConfirm.mockResolvedValue(false);
    resetStore({
      currentFile: {
        path: "/tmp/config.jsonc",
        content: ['{', '  // comment', '  "name": "demo"', '}'].join("\n"),
        format: "jsonc",
        fileName: "config.jsonc",
      },
      originalContent: ['{', '  // comment', '  "name": "demo"', '}'].join("\n"),
      rawContent: ['{', '  // comment', '  "name": "demo"', '}'].join("\n"),
      configData: { name: "demo" },
      configRootKind: "object",
      editorMode: "raw",
    });

    render(<ModeTabs />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Structure" }));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });

    expect(useAppStore.getState()).toMatchObject({
      editorMode: "raw",
      jsoncCommentWarningAcceptedFor: null,
    });
  });
});
