import { JsonForms } from "@jsonforms/react";
import { materialCells, materialRenderers } from "@jsonforms/material-renderers";
import { useAppStore } from "@/lib/state/store";
import { buildSchemaFromData, buildUiSchemaFromData, getDataSections } from "@/lib/schema";
import { useEffect, useCallback, useMemo } from "react";

export function FormEditor() {
  const { configData, activeSection, setConfigData, setRawContent, setDirty, originalContent } = useAppStore();
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
        background: rgba(255, 255, 255, 0.84);
        border: 1px solid rgba(226, 226, 232, 0.9);
        box-shadow: 0 18px 40px rgba(34, 34, 46, 0.06), 0 2px 6px rgba(34, 34, 46, 0.04);
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
      [class*="MuiInput-root"], [class*="MuiOutlinedInput"] {
        color: var(--color-foreground) !important;
        border-radius: 20px !important;
        background: rgba(255, 255, 255, 0.96) !important;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06) !important;
      }
      [class*="MuiInputBase-input"] {
        color: var(--color-foreground) !important;
        padding: 12px 14px !important;
        font-size: 0.88rem !important;
      }
      [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: rgba(0, 0, 0, 0) !important;
        border-radius: 20px !important;
      }
      [class*="MuiOutlinedInput-root"]:hover [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: rgba(0, 0, 0, 0) !important;
      }
      [class*="MuiOutlinedInput-root.Mui-focused"] [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: rgba(48, 167, 255, 0.35) !important;
        border-width: 1.5px !important;
      }
      [class*="MuiInputLabel-root"] {
        color: var(--color-muted-foreground) !important;
        font-size: 0.82rem !important;
      }
      [class*="MuiInputLabel-root.Mui-focused"] {
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
        background-color: var(--color-card) !important;
        color: var(--color-foreground) !important;
        border-radius: 18px !important;
        box-shadow: 0 20px 44px rgba(34, 34, 46, 0.12) !important;
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
    <div className="editor-scroll-shell">
      <div className="editor-form-wrap">
        <JsonForms
          schema={schema}
          uischema={uischema}
          data={configData}
          renderers={materialRenderers}
          cells={materialCells}
          onChange={handleChange}
        />
        {sections.length === 0 && (
          <div className="editor-empty-card">No top-level fields available</div>
        )}
      </div>
    </div>
  );
}
