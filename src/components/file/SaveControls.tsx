import { invoke } from "@tauri-apps/api/core";
import { confirm, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { RotateCcw, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/state/store";
import {
  confirmDiscardUnsavedChanges,
  confirmOverwriteExternalChanges,
  getFileMetadata,
  loadFileIntoStore,
} from "@/lib/fileSession";
import {
  convertContent,
  detectFormat,
  hasJsoncComments,
  parseContent,
  prettifyContent,
  serializeJson,
  supportsStructuredEditing,
} from "@/lib/parse";
import { validateBasicJson } from "@/lib/validation";
import type { FileFormat, SaveResult } from "@/types";

type PreparedContentResult = {
  content: string;
  parsed: ReturnType<typeof parseContent> | null;
  stripsJsoncComments: boolean;
};

const saveDialogFilters = [
  { name: "JSON", extensions: ["json"] },
  { name: "JSONC", extensions: ["jsonc"] },
  { name: "YAML", extensions: ["yaml", "yml"] },
  { name: "TOML", extensions: ["toml"] },
];

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
    fileConflict,
    setIsSaving,
    setLastSaveResult,
    setDirty,
    setOriginalContent,
    setRawContent,
    setConfigData,
    setConfigRootKind,
    setValidationErrors,
    updateCurrentFile,
    setFileConflict,
  } = useAppStore();

  function getEditableContent() {
    return editorMode === "raw" || !configData
      ? rawContent
      : serializeJson(configData, configRootKind ?? "object");
  }

  function parseStructuredContent(content: string, format: FileFormat) {
    return supportsStructuredEditing(format)
      ? parseContent(content, format)
      : null;
  }

  function prepareContent(
    targetFormat: FileFormat,
    options?: { sortKeys?: boolean }
  ): PreparedContentResult {
    if (!currentFile) {
      return {
        content: "",
        parsed: null,
        stripsJsoncComments: false,
      };
    }

    const baseContent = getEditableContent();
    const usingRawContent = editorMode === "raw" || !configData;
    const sortKeys = options?.sortKeys ?? false;
    const needsTransform = sortKeys || targetFormat !== currentFile.format || !usingRawContent;

    if (!needsTransform) {
      return {
        content: baseContent,
        parsed: parseStructuredContent(baseContent, targetFormat),
        stripsJsoncComments: false,
      };
    }

    const sourceFormat: FileFormat = usingRawContent ? currentFile.format : "json";
    const transformed = targetFormat === sourceFormat
      ? prettifyContent(baseContent, sourceFormat, { sortKeys })
      : convertContent(baseContent, sourceFormat, targetFormat, { sortKeys });

    if (transformed.error) {
      throw new Error(transformed.error);
    }

    return {
      content: transformed.content,
      parsed: parseStructuredContent(transformed.content, targetFormat),
      stripsJsoncComments:
        currentFile.format === "jsonc"
        && hasJsoncComments(rawContent)
        && (targetFormat !== "jsonc" || sortKeys || !usingRawContent),
    };
  }

  function applySaveState(
    content: string,
    parsed: ReturnType<typeof parseContent> | null
  ) {
    setOriginalContent(content);
    setRawContent(content);
    setConfigData(parsed?.data ?? null);
    setConfigRootKind(parsed?.rootKind ?? null);
    setDirty(false);
    setValidationErrors(
      parsed?.error
        ? [{ path: "/", message: parsed.error, severity: "error" }]
        : []
    );
  }

  async function persistToPath(path: string, content: string, mode: "save" | "save-as") {
    if (!currentFile) {
      return null;
    }

    if (mode === "save") {
      return invoke<SaveResult>("save_file", {
        path,
        content,
      });
    }

    return invoke<SaveResult>("save_file_as", {
      sourcePath: currentFile.path,
      targetPath: path,
      content,
    });
  }

  async function maybeConfirmJsoncCommentLoss(stripsJsoncComments: boolean) {
    if (!stripsJsoncComments) {
      return true;
    }

    return confirm(
      "This JSONC content includes comments. Formatting or converting it here will remove those comments. Continue?"
      ,
      {
        title: "Comments may be removed",
        kind: "warning",
        okLabel: "Continue",
        cancelLabel: "Cancel",
      }
    );
  }

  async function handleSave() {
    if (!currentFile || currentFile.isReadOnly) return;

    let prepared: PreparedContentResult;
    try {
      prepared = prepareContent(currentFile.format);
    } catch (error) {
      setValidationErrors([{ path: "/", message: String(error), severity: "error" }]);
      return;
    }

    if (currentFile.format === "json") {
      const validation = validateBasicJson(prepared.content);

      if (!validation.valid) {
        setValidationErrors(
          validation.errors.map((e) => ({
            path: e.path,
            message: e.message,
            severity: "error" as const,
          }))
        );
        return;
      }
    }

    if (prepared.parsed?.error) {
      setValidationErrors([{ path: "/", message: prepared.parsed.error, severity: "error" }]);
      return;
    }

    if (fileConflict && !fileConflict.acknowledged) {
      const shouldOverwrite = await confirmOverwriteExternalChanges();
      if (!shouldOverwrite) {
        return;
      }
    }

    setIsSaving(true);
    try {
      const result = await persistToPath(currentFile.path, prepared.content, "save");
      setLastSaveResult(result);

      if (!result?.success) {
        return;
      }

      applySaveState(prepared.content, prepared.parsed);
      const metadata = await getFileMetadata(currentFile.path);
      updateCurrentFile({
        content: prepared.content,
        lastModified: metadata.lastModified,
        sizeBytes: metadata.sizeBytes,
        isReadOnly: metadata.isReadOnly,
      });
      setFileConflict(null);
    } catch (e) {
      setLastSaveResult({
        success: false,
        backup_path: null,
        error: String(e),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAs() {
    if (!currentFile) {
      return;
    }

    const targetPath = await saveDialog({
      defaultPath: currentFile.path,
      filters: saveDialogFilters,
    });

    if (!targetPath) {
      return;
    }

    const targetFormat = detectFormat(targetPath);
    let prepared: PreparedContentResult;
    try {
      prepared = prepareContent(targetFormat);
    } catch (error) {
      setValidationErrors([{ path: "/", message: String(error), severity: "error" }]);
      return;
    }

    const shouldContinue = await maybeConfirmJsoncCommentLoss(prepared.stripsJsoncComments);
    if (!shouldContinue) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await persistToPath(targetPath, prepared.content, "save-as");
      setLastSaveResult(result);

      if (!result?.success) {
        return;
      }

      await loadFileIntoStore(targetPath);
      setLastSaveResult(result);
    } catch (e) {
      setLastSaveResult({
        success: false,
        backup_path: null,
        error: String(e),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFormat() {
    if (!currentFile || !supportsStructuredEditing(currentFile.format)) {
      return;
    }

    let prepared: PreparedContentResult;
    try {
      prepared = prepareContent(currentFile.format, { sortKeys: true });
    } catch (error) {
      setValidationErrors([{ path: "/", message: String(error), severity: "error" }]);
      return;
    }

    const shouldContinue = await maybeConfirmJsoncCommentLoss(prepared.stripsJsoncComments);
    if (!shouldContinue) {
      return;
    }

    setRawContent(prepared.content);
    setConfigData(prepared.parsed?.data ?? null);
    setConfigRootKind(prepared.parsed?.rootKind ?? null);
    setValidationErrors([]);
    setDirty(prepared.content !== originalContent);
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
        {
          path: "/",
          message: parsed.error,
          severity: supportsStructuredEditing(currentFile.format) ? "error" : "warning",
        },
      ]);
    } else {
      setValidationErrors([]);
    }
    setDirty(false);
  }

  if (!currentFile) return null;

  return (
    <div className="toolbar-cluster toolbar-cluster-end">
      <button
        type="button"
        onClick={handleFormat}
        disabled={isSaving || !supportsStructuredEditing(currentFile.format)}
        aria-label="Format and prettify the current file"
        className={cn(
          "toolbar-button toolbar-button-secondary",
          (isSaving || !supportsStructuredEditing(currentFile.format)) && "toolbar-button-disabled"
        )}
        title={supportsStructuredEditing(currentFile.format) ? "Format / Prettify" : "Formatting is available for JSON and JSONC"}
      >
        Format
      </button>
      <button
        type="button"
        onClick={handleSaveAs}
        disabled={isSaving}
        aria-label="Save As"
        className={cn(
          "toolbar-button toolbar-button-secondary",
          isSaving && "toolbar-button-disabled"
        )}
        title="Save a copy to a new path or format"
      >
        Save As
      </button>
      <button
        type="button"
        onClick={handleRevert}
        disabled={!dirty || isSaving}
        aria-label="Revert changes"
        className={cn(
          "toolbar-button toolbar-button-secondary",
          (!dirty || isSaving) && "toolbar-button-disabled"
        )}
        title="Revert changes"
      >
        <RotateCcw className="w-4 h-4" />
        Revert
      </button>
      <button
        id="save-btn"
        type="button"
        onClick={handleSave}
        disabled={!dirty || isSaving || currentFile.isReadOnly}
        aria-label={currentFile.isReadOnly ? "Save disabled because the file is read only" : "Save"}
        className={cn(
          "toolbar-button toolbar-button-primary",
          (!dirty || isSaving || currentFile.isReadOnly) && "toolbar-button-disabled"
        )}
        title={currentFile.isReadOnly ? "This file is read only. Use Save As to export a copy." : "Save (Cmd+S)"}
      >
        {isSaving && <span className="toolbar-spinner" aria-hidden="true" />}
        {!isSaving && <Save className="w-4 h-4" />}
        {isSaving ? "Saving..." : currentFile.isReadOnly ? "Read only" : "Save"}
      </button>
    </div>
  );
}
