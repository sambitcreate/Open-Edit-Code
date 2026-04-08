import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultPreferences } from "@/lib/preferences";
import { useAppStore } from "@/lib/state/store";
import { SaveControls } from "./SaveControls";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

const { mockConfirm } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  confirm: mockConfirm,
  open: vi.fn(),
}));

function resetStore(overrides: Partial<ReturnType<typeof useAppStore.getState>> = {}) {
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
    ...overrides,
  });
}

describe("SaveControls", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockConfirm.mockReset();
    mockConfirm.mockResolvedValue(true);
    resetStore();
  });

  it("blocks saving invalid raw JSON and surfaces an error", async () => {
    resetStore({
      currentFile: {
        path: "/tmp/config.json",
        content: '{"name":"before"}',
        format: "json",
        fileName: "config.json",
      },
      originalContent: '{"name":"before"}',
      rawContent: '{"name":',
      configData: { name: "before" },
      configRootKind: "object",
      dirty: true,
      editorMode: "raw",
    });

    render(<SaveControls />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(useAppStore.getState().validationErrors).toMatchObject([
      { path: "/", severity: "error" },
    ]);
  });

  it("saves serialized structured JSON and clears dirty state", async () => {
    mockInvoke.mockResolvedValue({
      success: true,
      backup_path: "/tmp/config.json_20260101_000000.bak",
      error: null,
    });

    resetStore({
      currentFile: {
        path: "/tmp/config.json",
        content: '{"name":"before"}',
        format: "json",
        fileName: "config.json",
      },
      originalContent: '{"name":"before"}',
      rawContent: '{"name":"before"}',
      configData: { name: "after" },
      configRootKind: "object",
      dirty: true,
      editorMode: "form",
      preferences: {
        ...createDefaultPreferences(),
        backupRetention: {
          mode: "count",
          value: 12,
        },
        formatDefaults: {
          json: {
            indentSize: 4,
            sortKeys: true,
          },
          jsonc: {
            indentSize: 2,
            sortKeys: false,
          },
        },
      },
    });

    render(<SaveControls />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("save_file", {
        path: "/tmp/config.json",
        content: ["{", '    "name": "after"', "}"].join("\n"),
        backupRetention: {
          mode: "count",
          value: 12,
        },
      });
    });

    expect(useAppStore.getState()).toMatchObject({
      originalContent: ["{", '    "name": "after"', "}"].join("\n"),
      rawContent: ["{", '    "name": "after"', "}"].join("\n"),
      configData: { name: "after" },
      dirty: false,
      validationErrors: [],
      lastSaveResult: {
        success: true,
        backup_path: "/tmp/config.json_20260101_000000.bak",
        error: null,
      },
    });
  });

  it("preserves array-root JSON when structured content is saved", async () => {
    mockInvoke.mockResolvedValue({
      success: true,
      backup_path: "/tmp/config.json_20260101_000000.bak",
      error: null,
    });

    resetStore({
      currentFile: {
        path: "/tmp/config.json",
        content: "[1]",
        format: "json",
        fileName: "config.json",
      },
      originalContent: "[1]",
      rawContent: "[1]",
      configData: { _root: [1, 2, 3] },
      configRootKind: "array",
      dirty: true,
      editorMode: "form",
      preferences: {
        ...createDefaultPreferences(),
        formatDefaults: {
          json: {
            indentSize: 4,
            sortKeys: false,
          },
          jsonc: {
            indentSize: 2,
            sortKeys: false,
          },
        },
      },
    });

    render(<SaveControls />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("save_file", {
        path: "/tmp/config.json",
        content: ["[", "    1,", "    2,", "    3", "]"].join("\n"),
        backupRetention: {
          mode: "count",
          value: 25,
        },
      });
    });

    expect(useAppStore.getState()).toMatchObject({
      originalContent: ["[", "    1,", "    2,", "    3", "]"].join("\n"),
      rawContent: ["[", "    1,", "    2,", "    3", "]"].join("\n"),
      configRootKind: "array",
      dirty: false,
    });
  });

  it("reverts to the original raw content and preserves warning severity for yaml", async () => {
    resetStore({
      currentFile: {
        path: "/tmp/config.yaml",
        content: "name: before",
        format: "yaml",
        fileName: "config.yaml",
      },
      originalContent: "name: before",
      rawContent: "name: [",
      configData: null,
      configRootKind: null,
      dirty: true,
      editorMode: "raw",
      validationErrors: [{ path: "/", message: "broken", severity: "warning" }],
    });

    render(<SaveControls />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Revert" }));

    expect(mockConfirm).toHaveBeenCalledWith(
      "Discard your unsaved changes and restore the last saved version?",
      expect.objectContaining({
        title: "Unsaved changes",
        kind: "warning",
      })
    );

    expect(useAppStore.getState()).toMatchObject({
      rawContent: "name: before",
      configData: null,
      dirty: false,
      validationErrors: [
        {
          path: "/",
          message: "YAML structured editing is not available yet. Raw mode is still available.",
          severity: "warning",
        },
      ],
    });
  });

  it("keeps edited content when the revert discard prompt is cancelled", async () => {
    mockConfirm.mockResolvedValue(false);

    resetStore({
      currentFile: {
        path: "/tmp/config.yaml",
        content: "name: before",
        format: "yaml",
        fileName: "config.yaml",
      },
      originalContent: "name: before",
      rawContent: "name: changed",
      configData: null,
      configRootKind: null,
      dirty: true,
      editorMode: "raw",
    });

    render(<SaveControls />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Revert" }));

    expect(useAppStore.getState()).toMatchObject({
      rawContent: "name: changed",
      dirty: true,
    });
  });
});
