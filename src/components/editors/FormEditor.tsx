import { JsonForms } from "@jsonforms/react";
import { materialCells, materialRenderers } from "@jsonforms/material-renderers";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { getJsonFormatPreferences } from "@/lib/preferences";
import { useAppStore } from "@/lib/state/store";
import { buildSchemaFromData, buildUiSchemaFromData, getDataSections } from "@/lib/schema";
import { serializeJson } from "@/lib/parse";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";
import { deletableControlRenderer } from "./DeletableControl";
import { useEffect, useCallback, useMemo } from "react";

export function FormEditor() {
  const themeMode = useSystemTheme();
  const muiTheme = useMemo(
    () => createTheme({ palette: { mode: themeMode } }),
    [themeMode]
  );
  const { configData, activeSection, setConfigData, setRawContent, setDirty, originalContent, currentFile, configRootKind, preferences } = useAppStore();
  const renderers = useMemo(
    () => [...materialRenderers, deletableControlRenderer],
    []
  );
  const schema = useMemo(() => (configData ? buildSchemaFromData(configData) : null), [configData]);
  const sections = useMemo(() => getDataSections(configData), [configData]);
  const uischema = useMemo(
    () => (configData ? buildUiSchemaFromData(configData, activeSection) : null),
    [activeSection, configData]
  );

  const handleChange = useCallback(
    ({ data }: { data: Record<string, unknown> }) => {
      if (data !== undefined) {
        setConfigData(data);
        const serialized = serializeJson(
          data,
          configRootKind ?? "object",
          getJsonFormatPreferences(preferences, currentFile?.format ?? "json")
        );
        setRawContent(serialized);
        setDirty(serialized !== originalContent);
      }
    },
    [configRootKind, currentFile?.format, originalContent, preferences, setConfigData, setDirty, setRawContent]
  );

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .jsonforms-group {
        margin-bottom: 1rem;
        padding: 1.1rem 1.15rem;
        border-radius: 24px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        box-shadow: var(--shadow-elevation-3);
      }
      .jsonforms-group label {
        font-weight: 600;
        font-size: 0.88rem;
        margin-bottom: 0.9rem;
        display: block;
        color: var(--color-foreground);
      }
      .jsonforms-group .group-items {
        display: grid;
        gap: 0.65rem;
      }
      /* Outer input container (the "pill") */
      [class*="MuiInputBase-root"],
      [class*="MuiOutlinedInput-root"] {
        color: var(--color-foreground) !important;
        border-radius: 14px !important;
        background: var(--color-surface-2) !important;
        box-shadow: var(--shadow-inset-1) !important;
      }
      /* The <input> element itself — transparent so the container shows */
      [class*="MuiInputBase-input"],
      [class*="MuiOutlinedInput-input"] {
        color: var(--color-foreground) !important;
        background: transparent !important;
        -webkit-text-fill-color: var(--color-foreground) !important;
        padding: 12px 14px !important;
        font-size: 0.88rem !important;
        caret-color: var(--color-primary) !important;
      }
      [class*="MuiInputBase-input"]::placeholder,
      [class*="MuiOutlinedInput-input"]::placeholder {
        color: var(--color-muted-foreground) !important;
        opacity: 1 !important;
      }
      /* Notched outline: keep transparent fill so it never covers the input text */
      [class*="MuiOutlinedInput-notchedOutline"] {
        background: transparent !important;
        box-shadow: none !important;
        border-color: color-mix(in srgb, var(--color-muted-foreground) 32%, transparent) !important;
        border-width: 1px !important;
        border-radius: 14px !important;
      }
      [class*="MuiOutlinedInput-root"]:hover [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: color-mix(in srgb, var(--color-muted-foreground) 55%, transparent) !important;
      }
      [class*="MuiOutlinedInput-root"][class*="Mui-focused"] [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: var(--color-ring) !important;
        border-width: 1.5px !important;
      }
      [class*="MuiInputLabel-root"] {
        color: var(--color-muted-foreground) !important;
        font-size: 0.82rem !important;
      }
      [class*="MuiInputLabel-root"][class*="Mui-focused"] {
        color: var(--color-primary) !important;
      }
      [class*="MuiSelect-select"] {
        color: var(--color-foreground) !important;
      }
      [class*="MuiMenuItem-root"] {
        color: var(--color-foreground) !important;
        padding: 8px 12px !important;
        font-size: 0.8125rem !important;
      }
      [class*="MuiPaper-root"] {
        background-color: var(--color-surface) !important;
        color: var(--color-foreground) !important;
        border-radius: 18px !important;
        box-shadow: var(--shadow-elevation-3) !important;
      }
      [class*="MuiCheckbox-root"] {
        color: var(--color-muted-foreground) !important;
        padding: 6px !important;
      }
      [class*="Mui-checked"] {
        color: var(--color-primary) !important;
      }
      [class*="MuiFormControlLabel-label"] {
        color: var(--color-foreground) !important;
        font-size: 0.8125rem !important;
      }
      [class*="MuiTypography-root"] {
        color: var(--color-foreground) !important;
      }
      [class*="MuiIconButton-root"] {
        color: var(--color-muted-foreground) !important;
      }
      .MuiButtonBase-root {
        color: var(--color-primary) !important;
        border-radius: 8px !important;
      }
      [class*="MuiFormControl-root"] {
        margin-bottom: 0.2rem !important;
      }
      .deletable-field-row {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        width: 100%;
      }
      .deletable-field-main {
        flex: 1 1 auto;
        min-width: 0;
      }
      .deletable-field-main [class*="MuiFormControl-root"] {
        width: 100% !important;
      }
      .deletable-field-remove {
        flex: 0 0 auto;
        margin-top: 10px !important;
        color: var(--color-muted-foreground) !important;
        border-radius: 12px !important;
        transition: color 0.16s ease, background 0.16s ease !important;
      }
      .deletable-field-remove:hover {
        color: var(--color-danger) !important;
        background: color-mix(in srgb, var(--color-danger) 10%, transparent) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!configData || !schema || !uischema) {
    return (
      <div className="editor-empty-state">
        <div className="editor-empty-card">
          No data to display in form mode
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="editor-scroll-shell">
        <div className="editor-form-wrap">
          <JsonForms
            schema={schema}
            uischema={uischema}
            data={configData}
            renderers={renderers}
            cells={materialCells}
            onChange={handleChange}
          />
          {sections.length === 0 && (
            <div className="editor-empty-card">No top-level fields available</div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}
