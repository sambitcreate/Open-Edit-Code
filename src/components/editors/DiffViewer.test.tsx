import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/lib/state/store";
import { DiffViewer } from "./DiffViewer";

vi.mock("@monaco-editor/react", () => {
  const DiffEditor = ({ original, modified, language }: any) => (
    <div
      data-testid="diff-editor"
      data-language={language}
      data-original={original}
      data-modified={modified}
    />
  );
  return { DiffEditor };
});

function resetStore(overrides: Record<string, unknown> = {}) {
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
    editorActions: {},
    ...overrides,
  });
}

describe("DiffViewer", () => {
  beforeEach(() => {
    resetStore();
  });

  it("shows empty state when no content is loaded", () => {
    render(<DiffViewer />);
    expect(screen.getByText("Open a file to view diff")).toBeInTheDocument();
  });

  it("renders the diff editor when content exists", async () => {
    resetStore({
      originalContent: '{"old": true}',
      rawContent: '{"new": true}',
      currentFile: {
        path: "/tmp/config.json",
        content: '{"old": true}',
        format: "json",
        fileName: "config.json",
      },
    });

    render(<DiffViewer />);
    const editor = await screen.findByTestId("diff-editor", undefined, { timeout: 3000 });
    expect(editor).toHaveAttribute("data-original", '{"old": true}');
    expect(editor).toHaveAttribute("data-modified", '{"new": true}');
  });

  it("clears editorActions on unmount", () => {
    resetStore({ editorActions: { find: () => {} } });

    const { unmount } = render(<DiffViewer />);
    expect(useAppStore.getState().editorActions).toEqual({ find: expect.any(Function) });

    unmount();
    expect(useAppStore.getState().editorActions).toEqual({});
  });

  it.each([
    ["jsonc", "json"],
    ["json", "json"],
    ["toml", "ini"],
    ["yaml", "yaml"],
  ] as const)("maps format %s to language %s", async (format, expectedLang) => {
    resetStore({
      originalContent: "old",
      rawContent: "new",
      currentFile: {
        path: `/tmp/config.${format}`,
        content: "old",
        format,
        fileName: `config.${format}`,
      },
    });

    render(<DiffViewer />);
    const editor = await screen.findByTestId("diff-editor", undefined, { timeout: 3000 });
    expect(editor).toHaveAttribute("data-language", expectedLang);
  });
});
