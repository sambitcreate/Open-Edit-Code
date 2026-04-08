import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/lib/state/store";
import { SaveControls } from "./SaveControls";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

const { mockConfirm, mockSaveDialog } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
  mockSaveDialog: vi.fn(),
}));

const { mockStat } = vi.hoisted(() => ({
  mockStat: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  confirm: mockConfirm,
  open: vi.fn(),
  save: mockSaveDialog,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  stat: mockStat,
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
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    fileConflict: null,
    jsoncCommentWarningAcceptedFor: null,
    ...overrides,
  });
}

function buildOpenFile(path: string, format: "json" | "jsonc" | "yaml" | "toml", content: string) {
  return {
    path,
    content,
    format,
    fileName: path.split("/").pop() ?? path,
    lastModified: "2026-04-08T10:00:00.000Z",
    sizeBytes: content.length,
    isReadOnly: false,
  } as const;
}

describe("SaveControls", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockConfirm.mockReset();
    mockSaveDialog.mockReset();
    mockStat.mockReset();
    mockConfirm.mockResolvedValue(true);
    mockStat.mockResolvedValue({
      mtime: new Date("2026-04-08T10:05:00.000Z"),
      size: 20,
      readonly: false,
    });
    resetStore();
  });

  it("blocks saving invalid raw JSON and surfaces an error", async () => {
    resetStore({
      currentFile: buildOpenFile("/tmp/config.json", "json", '{"name":"before"}'),
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

  it("saves serialized structured JSON, updates metadata, and clears dirty state", async () => {
    mockInvoke.mockResolvedValue({
      success: true,
      backup_path: "/tmp/config.json_20260101_000000.bak",
      error: null,
    });

    resetStore({
      currentFile: buildOpenFile("/tmp/config.json", "json", '{"name":"before"}'),
      originalContent: '{"name":"before"}',
      rawContent: '{"name":"before"}',
      configData: { name: "after" },
      configRootKind: "object",
      dirty: true,
      editorMode: "form",
    });

    render(<SaveControls />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("save_file", {
        path: "/tmp/config.json",
        content: ["{", '  "name": "after"', "}"].join("\n"),
      });
    });

    expect(useAppStore.getState()).toMatchObject({
      originalContent: ["{", '  "name": "after"', "}"].join("\n"),
      rawContent: ["{", '  "name": "after"', "}"].join("\n"),
      configData: { name: "after" },
      dirty: false,
      validationErrors: [],
      lastSaveResult: {
        success: true,
        backup_path: "/tmp/config.json_20260101_000000.bak",
        error: null,
      },
      currentFile: {
        lastModified: "2026-04-08T10:05:00.000Z",
        isReadOnly: false,
      },
    });
  });

  it("uses Save As to export to a new path and reopen that file", async () => {
    mockSaveDialog.mockResolvedValue("/tmp/export.jsonc");
    mockInvoke.mockImplementation(async (command, args) => {
      if (command === "save_file_as") {
        expect(args).toMatchObject({
          sourcePath: "/tmp/config.json",
          targetPath: "/tmp/export.jsonc",
          content: ["{", '  "name": "after"', "}"].join("\n"),
        });
        return {
          success: true,
          backup_path: null,
          error: null,
        };
      }

      if (command === "open_file") {
        return {
          path: "/tmp/export.jsonc",
          content: ["{", '  "name": "after"', "}"].join("\n"),
          format: "jsonc",
          last_modified: "2026-04-08T10:06:00.000Z",
          readonly: false,
          size: 21,
        };
      }

      return {
        success: true,
        backup_path: null,
        error: null,
      };
    });

    mockStat.mockResolvedValue({
      mtime: new Date("2026-04-08T10:06:00.000Z"),
      size: 21,
      readonly: false,
    });

    resetStore({
      currentFile: buildOpenFile("/tmp/config.json", "json", '{"name":"before"}'),
      originalContent: '{"name":"before"}',
      rawContent: '{"name":"before"}',
      configData: { name: "after" },
      configRootKind: "object",
      dirty: true,
      editorMode: "form",
    });

    render(<SaveControls />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Save As" }));

    await waitFor(() => {
      expect(useAppStore.getState().currentFile).toMatchObject({
        path: "/tmp/export.jsonc",
        fileName: "export.jsonc",
      });
    });
  });

  it("disables overwrite save for read-only files", () => {
    resetStore({
      currentFile: {
        ...buildOpenFile("/tmp/config.json", "json", '{"name":"before"}'),
        isReadOnly: true,
      },
      dirty: true,
    });

    render(<SaveControls />);

    expect(screen.getByRole("button", { name: "Save disabled because the file is read only" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save As" })).toBeEnabled();
  });

  it("reverts to the original raw content and preserves warning severity for yaml", async () => {
    resetStore({
      currentFile: buildOpenFile("/tmp/config.yaml", "yaml", "name: before"),
      originalContent: "name: before",
      rawContent: "name: [",
      configData: null,
      configRootKind: null,
      dirty: true,
      editorMode: "raw",
      validationErrors: [{ path: "/", message: "broken", severity: "warning" }],
    });

    render(<SaveControls />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Revert changes" }));

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
          message: "YAML structured editing is not available yet. Raw mode is safest for now, and richer support is planned.",
          severity: "warning",
        },
      ],
    });
  });
});
