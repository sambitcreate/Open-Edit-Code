import { describe, expect, it } from "vitest";
import {
  createDefaultPreferences,
  normalizePreferences,
  resolveEditorModeOnOpen,
  resolveThemeMode,
} from "./index";

describe("preferences helpers", () => {
  it("keeps defaults stable when no persisted preferences exist", () => {
    expect(normalizePreferences(undefined)).toEqual(createDefaultPreferences());
  });

  it("clamps persisted editor and backup values into supported ranges", () => {
    expect(
      normalizePreferences({
        editor: { fontSize: 99, tabSize: 1 },
        backupRetention: { mode: "age", value: 999 },
      })
    ).toMatchObject({
      editor: {
        fontSize: 24,
        tabSize: 2,
      },
      backupRetention: {
        mode: "age",
        value: 365,
      },
    });
  });

  it("resolves theme overrides against the system theme", () => {
    expect(resolveThemeMode("system", "dark")).toBe("dark");
    expect(resolveThemeMode("light", "dark")).toBe("light");
  });

  it("uses the requested open mode when the file supports it", () => {
    expect(
      resolveEditorModeOnOpen({
        preferredMode: "diff",
        format: "json",
        rootKind: "object",
        hasData: true,
      })
    ).toBe("diff");

    expect(
      resolveEditorModeOnOpen({
        preferredMode: "form",
        format: "json",
        rootKind: "object",
        hasData: true,
      })
    ).toBe("form");
  });

  it("falls back to raw when the preferred mode cannot handle the opened file", () => {
    expect(
      resolveEditorModeOnOpen({
        preferredMode: "form",
        format: "yaml",
        rootKind: null,
        hasData: false,
      })
    ).toBe("raw");

    expect(
      resolveEditorModeOnOpen({
        preferredMode: "auto",
        format: "json",
        rootKind: "array",
        hasData: true,
      })
    ).toBe("raw");
  });
});
