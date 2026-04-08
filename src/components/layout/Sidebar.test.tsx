import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/lib/state/store";
import type { DataSection } from "@/lib/schema";
import { Sidebar } from "./Sidebar";

const sections: DataSection[] = [
  { id: "$schema", label: "$schema", kind: "value", tone: "peach" },
  { id: "mcp", label: "mcp", kind: "object", tone: "mint" },
  { id: "plugin", label: "plugin", kind: "array", tone: "blue" },
];

describe("Sidebar", () => {
  beforeEach(() => {
    useAppStore.setState({
      currentFile: {
        path: "/tmp/opencode.json",
        content: "{}",
        format: "json",
        fileName: "opencode.json",
      },
      originalContent: "{}",
      rawContent: "{}",
      configData: {},
      configRootKind: "object",
      dirty: false,
      editorMode: "form",
      validationErrors: [],
      recentFiles: [],
      isSaving: false,
      lastSaveResult: null,
      activeSection: "mcp",
    });
  });

  it("renders real top-level keys instead of placeholder sections", () => {
    render(<Sidebar sections={sections} />);

    expect(screen.getByRole("button", { name: "$schema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "mcp" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "plugin" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "General" })).not.toBeInTheDocument();
  });
});
