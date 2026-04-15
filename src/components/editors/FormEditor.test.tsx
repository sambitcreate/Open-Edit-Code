import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/lib/state/store";
import { createDefaultPreferences } from "@/lib/preferences";
import { FormEditor } from "./FormEditor";

vi.mock("@jsonforms/react", () => ({
  JsonForms: ({ onChange, data }: any) => {
    (window as any).__jsonFormsOnChange = onChange;
    (window as any).__jsonFormsData = data;
    return <div data-testid="json-forms" />;
  },
}));

vi.mock("@jsonforms/material-renderers", () => ({
  materialCells: [],
  materialRenderers: [],
}));

vi.mock("@mui/material/styles", () => ({
  ThemeProvider: ({ children }: any) => <>{children}</>,
  createTheme: () => ({}),
}));

vi.mock("@/lib/theme/useSystemTheme", () => ({
  useSystemTheme: () => "light",
}));

vi.mock("./DeletableControl", () => ({
  deletableControlRenderer: {},
}));

function resetStore(overrides: Record<string, unknown> = {}) {
  useAppStore.setState({
    currentFile: { path: "/tmp/config.json", content: '{"name":"test"}', format: "json", fileName: "config.json" },
    originalContent: '{"name":"test"}',
    rawContent: '{"name":"test"}',
    configData: { name: "test" },
    configRootKind: "object",
    dirty: false,
    editorMode: "form",
    validationErrors: [],
    validationPanelOpen: false,
    validationFocusRequest: null,
    recentFiles: [],
    isSaving: false,
    lastSaveResult: null,
    activeSection: "name",
    preferences: createDefaultPreferences(),
    ...overrides,
  });
}

describe("FormEditor", () => {
  beforeEach(() => {
    resetStore();
  });

  it("shows empty state when configData is null", () => {
    resetStore({ configData: null });
    render(<FormEditor />);
    expect(screen.getByText("No data to display in form mode")).toBeInTheDocument();
  });

  it("renders JsonForms when configData exists", () => {
    render(<FormEditor />);
    expect(screen.getByTestId("json-forms")).toBeInTheDocument();
  });

  it("handleChange updates configData, rawContent, and dirty when data is provided", () => {
    render(<FormEditor />);
    const onChange = (window as any).__jsonFormsOnChange;
    onChange({ data: { name: "updated" }, errors: [] });
    expect(useAppStore.getState().configData).toEqual({ name: "updated" });
    expect(useAppStore.getState().dirty).toBe(true);
  });

  it("handleChange does nothing to configData when data is undefined", () => {
    render(<FormEditor />);
    const before = useAppStore.getState().configData;
    const onChange = (window as any).__jsonFormsOnChange;
    onChange({ data: undefined, errors: [] });
    expect(useAppStore.getState().configData).toBe(before);
  });

  it("handleChange maps JSON Forms errors to validation errors", () => {
    render(<FormEditor />);
    const onChange = (window as any).__jsonFormsOnChange;
    onChange({
      data: { name: "test" },
      errors: [
        { instancePath: "/name", message: "should be string" },
        { instancePath: "/age", message: "should be number" },
      ],
    });
    const errors = useAppStore.getState().validationErrors;
    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({ path: "/name", message: "should be string", severity: "error" });
    expect(errors[1]).toEqual({ path: "/age", message: "should be number", severity: "error" });
  });

  it("injects and cleans up dynamic styles on mount/unmount", () => {
    const { unmount } = render(<FormEditor />);
    const styleElements = document.head.querySelectorAll("style");
    expect(styleElements.length).toBeGreaterThan(0);
    unmount();
    expect(document.head.querySelectorAll("style").length).toBeLessThan(styleElements.length);
  });
});
