import { useEffect, useCallback, useMemo } from "react";
import { JsonForms } from "@jsonforms/react";
import { materialCells, materialRenderers } from "@jsonforms/material-renderers";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/state/store";
import { buildSchemaFromData, buildUiSchemaFromData, getDataSections } from "@/lib/schema";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";
import { deletableControlRenderer } from "./DeletableControl";

export function FormEditor() {
  const themeMode = useSystemTheme();
  const muiTheme = useMemo(
    () => createTheme({ palette: { mode: themeMode } }),
    [themeMode]
  );
  const { configData, activeSection, currentFile, setConfigData, setRawContent, setDirty, originalContent } = useAppStore();
  const renderers = useMemo(
    () => [...materialRenderers, deletableControlRenderer],
    []
  );
  const schema = useMemo(() => (configData ? buildSchemaFromData(configData) : null), [configData]);
  const sections = useMemo(() => getDataSections(configData), [configData]);
  const activeSectionLabel = useMemo(
    () => sections.find((section) => section.id === activeSection)?.label ?? sections[0]?.label ?? "Form",
    [activeSection, sections]
  );
  const uischema = useMemo(
    () => (configData ? buildUiSchemaFromData(configData, activeSection) : null),
    [activeSection, configData]
  );
  const isEmptyFile = Boolean(currentFile && !currentFile.content.trim());
  const isLargeFile = Boolean(currentFile && currentFile.content.length > 750_000);

  const handleChange = useCallback(
    ({ data }: { data: Record<string, unknown> }) => {
      if (data !== undefined) {
        setConfigData(data);
        const serialized = JSON.stringify(data, null, 2);
        setRawContent(serialized);
        setDirty(serialized !== originalContent);
      }
    },
    [setConfigData, setDirty, setRawContent, originalContent]
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
      [class*="MuiInputBase-root"],
      [class*="MuiOutlinedInput-root"] {
        color: var(--color-foreground) !important;
        border-radius: 14px !important;
        background: var(--color-surface-2) !important;
        box-shadow: var(--shadow-inset-1) !important;
      }
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
      <div className="editor-scroll-shell">
        <div className="editor-form-wrap">
          <header className="editor-form-header">
            <div>
              <h2 className="editor-section-heading">Form / {activeSectionLabel}</h2>
              <p className="editor-section-breadcrumb">
                {currentFile?.fileName ?? "No file"} {activeSection ? `· ${activeSection}` : ""}
              </p>
            </div>
          </header>
          <div className="editor-empty-state">
            <div className="editor-empty-card">
              No data to display in form mode
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="editor-scroll-shell">
        <div className="editor-form-wrap">
          <header className="editor-form-header">
            <div>
              <h2 className="editor-section-heading">Form / {activeSectionLabel}</h2>
              <p className="editor-section-breadcrumb">
                {currentFile?.fileName ?? "No file"} {activeSection ? `· ${activeSection}` : ""}
              </p>
            </div>
            <div className="editor-context-stack">
              {isEmptyFile && (
                <div className="editor-context-banner">
                  This file is empty, so there is nothing to render yet.
                </div>
              )}
              {isLargeFile && (
                <div className={cn("editor-context-banner", "editor-context-banner-warning")}>
                  Large file detected. Structured editing may take a moment to update.
                </div>
              )}
            </div>
          </header>
          {sections.length === 0 ? (
            <div className="editor-empty-state">
              <div className="editor-empty-card">
                <div className="editor-empty-title">No fields in this object yet</div>
                <p className="editor-empty-copy">
                  Add a key in Raw or Structure view to start building out the form.
                </p>
              </div>
            </div>
          ) : (
            <JsonForms
              schema={schema}
              uischema={uischema}
              data={configData}
              renderers={renderers}
              cells={materialCells}
              onChange={handleChange}
            />
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}
