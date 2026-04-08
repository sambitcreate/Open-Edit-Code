import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultPreferences } from "@/lib/preferences";
import { useAppStore } from "@/lib/state/store";
import { SettingsDrawer } from "./SettingsDrawer";

function resetStore() {
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
    preferences: createDefaultPreferences(),
  });
}

describe("SettingsDrawer", () => {
  beforeEach(() => {
    resetStore();
  });

  it("updates theme, editor, and backup preferences from the drawer controls", async () => {
    render(<SettingsDrawer open onClose={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Dark" }));
    fireEvent.change(screen.getByLabelText("Font size"), {
      target: { value: "16", valueAsNumber: 16 },
    });
    await user.click(screen.getByRole("button", { name: "Age" }));
    fireEvent.change(screen.getByLabelText("Delete backups older than this many days"), {
      target: { value: "14", valueAsNumber: 14 },
    });

    expect(useAppStore.getState().preferences).toMatchObject({
      themePreference: "dark",
      editor: {
        fontSize: 16,
      },
      backupRetention: {
        mode: "age",
        value: 14,
      },
    });
  });
});
