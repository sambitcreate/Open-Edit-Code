import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/lib/state/store";
import { RawEditor } from "./RawEditor";

vi.mock("@monaco-editor/react", () => ({
  default: () => <div data-testid="monaco-editor" />,
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
    recentFiles: [],
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    jsoncCommentWarningAcceptedFor: null,
    ...overrides,
  });
}

describe("RawEditor", () => {
  beforeEach(() => {
    resetStore();
  });

  it("shows a roadmap note for raw-only YAML files", async () => {
    resetStore({
      currentFile: {
        path: "/tmp/config.yaml",
        content: "name: demo",
        format: "yaml",
        fileName: "config.yaml",
      },
      originalContent: "name: demo",
      rawContent: "name: demo",
      configData: null,
      configRootKind: null,
    });

    render(<RawEditor />);

    expect(await screen.findByText("YAML files stay in Raw mode for now")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Structured editing is not available yet for this format. Raw editing is fully supported today, and broader format support is planned."
      )
    ).toBeInTheDocument();
  });

  it("shows array-root guidance above the raw editor", async () => {
    resetStore({
      currentFile: {
        path: "/tmp/config.json",
        content: "[1,2,3]",
        format: "json",
        fileName: "config.json",
      },
      originalContent: "[1,2,3]",
      rawContent: "[1,2,3]",
      configData: { _root: [1, 2, 3] },
      configRootKind: "array",
    });

    render(<RawEditor />);

    expect(await screen.findByText("This file's root is an array")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Form mode only works with object-based JSON files. Use Raw or Structure view to inspect and edit array items."
      )
    ).toBeInTheDocument();
  });
});
