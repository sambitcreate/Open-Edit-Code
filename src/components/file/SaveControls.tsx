import { invoke } from "@tauri-apps/api/core";
import { getJsonFormatPreferences } from "@/lib/preferences";
import { useAppStore } from "@/lib/state/store";
import { refreshBackupsForCurrentFile } from "@/lib/backups";
import { confirmDiscardUnsavedChanges } from "@/lib/fileSession";
import { parseContent, serializeJson, supportsStructuredEditing } from "@/lib/parse";
import { validateBasicJson } from "@/lib/validation";
import { createValidationError } from "@/lib/validation/utils";
import type { SaveResult } from "@/types";
import { Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { BackupsMenu } from "@/components/file/BackupsMenu";

export function SaveControls() {
  const {
    currentFile,
    configData,
    originalContent,
    rawContent,
    configRootKind,
    dirty,
    isSaving,
    editorMode,
    setIsSaving,
    setLastSaveResult,
    setDirty,
    setOriginalContent,
    setRawContent,
    setConfigData,
    setConfigRootKind,
    setValidationErrors,
    preferences,
  } = useAppStore();

  async function handleSave() {
    if (!currentFile) return;

    const contentToSave =
      editorMode === "raw" || !configData
        ? rawContent
        : serializeJson(
            configData,
            configRootKind ?? "object",
            getJsonFormatPreferences(preferences, currentFile.format)
          );

    if (currentFile.format === "json") {
      const validation = validateBasicJson(contentToSave);

      if (!validation.valid) {
        setValidationErrors(
          validation.errors.map((error) => ({
            path: error.path,
            message: error.message,
            severity: "error" as const,
            line: error.line,
            column: error.column,
          }))
        );
        return;
      }
    }

    if (currentFile.format === "jsonc") {
      const parsed = parseContent(contentToSave, currentFile.format);
      if (parsed.error) {
        setValidationErrors([createValidationError("/", parsed.error, "error", contentToSave)]);
        return;
      }
    }

    setIsSaving(true);
    try {
      const result = await invoke<SaveResult>("save_file", {
        path: currentFile.path,
        content: contentToSave,
        backupRetention: preferences.backupRetention,
      });

      setLastSaveResult(result);
      if (result.success) {
        const parsed = supportsStructuredEditing(currentFile.format)
          ? parseContent(contentToSave, currentFile.format)
          : { data: null, error: null, rootKind: null };

        setOriginalContent(contentToSave);
        setRawContent(contentToSave);
        setConfigData(parsed.data);
        setConfigRootKind(parsed.rootKind);
        setDirty(false);
        if (parsed.error) {
          setValidationErrors([createValidationError("/", parsed.error, "error", contentToSave)]);
        } else {
          setValidationErrors([]);
        }
        await refreshBackupsForCurrentFile();
      }
    } catch (error) {
      setLastSaveResult({
        success: false,
        backup_path: null,
        error: String(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevert() {
    if (!currentFile || !dirty) return;

    const shouldDiscard = await confirmDiscardUnsavedChanges(
      "Discard your unsaved changes and restore the last saved version?"
    );

    if (!shouldDiscard) {
      return;
    }

    const parsed = parseContent(originalContent, currentFile.format);

    setRawContent(originalContent);
    setConfigData(parsed.data);
    setConfigRootKind(parsed.rootKind);
    if (parsed.error) {
      setValidationErrors([
        createValidationError(
          "/",
          parsed.error,
          supportsStructuredEditing(currentFile.format) ? "error" : "warning",
          originalContent
        ),
      ]);
    } else {
      setValidationErrors([]);
    }
    setDirty(false);
  }

  if (!currentFile) return null;

  return (
    <div className="toolbar-cluster toolbar-cluster-end">
      <BackupsMenu />
      <button
        onClick={() => {
          void handleRevert();
        }}
        disabled={!dirty}
        className={cn("toolbar-button toolbar-button-secondary", dirty ? "" : "toolbar-button-disabled")}
        title="Revert changes (Cmd+R)"
      >
        <RotateCcw className="w-4 h-4" />
        Revert
      </button>
      <button
        id="save-btn"
        onClick={() => {
          void handleSave();
        }}
        disabled={!dirty || isSaving}
        className={cn(
          "toolbar-button toolbar-button-primary",
          dirty && !isSaving ? "" : "toolbar-button-disabled"
        )}
        title="Save (Cmd+S)"
      >
        <Save className="w-4 h-4" />
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
