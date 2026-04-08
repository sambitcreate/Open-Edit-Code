import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultPreferences } from "@/lib/preferences";
import { useAppStore } from "@/lib/state/store";
import { ModeTabs } from "./ModeTabs";

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
    backups: [],
    isLoadingBackups: false,
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    preferences: createDefaultPreferences(),
    ...overrides,
  });
}

describe("ModeTabs", () => {
  beforeEach(() => {
    resetStore();
  });

  it("disables visual editors for array-root JSON content", () => {
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
    expect(screen.getByRole("button", { name: "Structure" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Raw" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Diff" })).toBeEnabled();
  });
});
