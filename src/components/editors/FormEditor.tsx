import { JsonForms } from "@jsonforms/react";
import { materialCells, materialRenderers } from "@jsonforms/material-renderers";
import { useAppStore } from "@/lib/state/store";
import { defaultConfigSchema, defaultUiSchema } from "@/lib/schema";
import { useEffect, useCallback } from "react";

export function FormEditor() {
  const { configData, setConfigData, setDirty, originalContent } = useAppStore();

  const handleChange = useCallback(
    ({ data }: { data: Record<string, unknown> }) => {
      if (data !== undefined) {
        setConfigData(data);
        const serialized = JSON.stringify(data, null, 2);
        setDirty(serialized !== originalContent);
      }
    },
    [setConfigData, setDirty, originalContent]
  );

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .jsonforms-group {
        margin-bottom: 1.25rem;
        padding: 1rem;
        border-radius: 12px;
        background-color: var(--color-card);
        box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.05), 0px 0px 1px rgba(0, 0, 0, 0.04);
      }
      .jsonforms-group label {
        font-weight: 600;
        font-size: 0.8125rem;
        margin-bottom: 0.75rem;
        display: block;
        color: var(--color-foreground);
      }
      .jsonforms-group .group-items {
        padding-left: 0.75rem;
        border-left: 2px solid var(--color-border);
      }
      [class*="MuiInput-root"], [class*="MuiOutlinedInput"] {
        color: var(--color-foreground) !important;
        border-color: var(--color-border) !important;
        border-radius: 8px !important;
      }
      [class*="MuiInputBase-input"] {
        color: var(--color-foreground) !important;
        padding: 8px 12px !important;
        font-size: 0.8125rem !important;
      }
      [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: var(--color-border) !important;
        border-radius: 8px !important;
      }
      [class*="MuiOutlinedInput-root"]:hover [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: var(--color-primary) !important;
      }
      [class*="MuiOutlinedInput-root.Mui-focused"] [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: var(--color-primary) !important;
        border-width: 2px !important;
      }
      [class*="MuiInputLabel-root"] {
        color: var(--color-muted-foreground) !important;
        font-size: 0.8125rem !important;
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
        border-radius: 8px !important;
        box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1) !important;
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
        margin-bottom: 0.5rem !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!configData) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="neu-card p-6 text-center text-muted-foreground text-sm">
          No data to display in form mode
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <JsonForms
          schema={defaultConfigSchema}
          uischema={defaultUiSchema}
          data={configData}
          renderers={materialRenderers}
          cells={materialCells}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
