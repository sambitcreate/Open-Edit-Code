import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultPreferences } from "@/lib/preferences";
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
      validationPanelOpen: false,
      validationFocusRequest: null,
      recentFiles: [],
      backups: [],
      isLoadingBackups: false,
      isSaving: false,
      lastSaveResult: null,
      activeSection: "mcp",
      preferences: createDefaultPreferences(),
    });
  });

  it("renders real top-level keys instead of placeholder sections", () => {
    render(<Sidebar sections={sections} />);

    expect(screen.getByRole("button", { name: "$schema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "mcp" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "plugin" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "General" })).not.toBeInTheDocument();
  });

  it("returns null when no currentFile", () => {
    useAppStore.setState({ currentFile: null });
    const { container } = render(<Sidebar sections={sections} />);
    expect(container.firstChild).toBeNull();
  });

  it("sets active section on button click", async () => {
    render(<Sidebar sections={sections} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "plugin" }));
    expect(useAppStore.getState().activeSection).toBe("plugin");
  });
});
