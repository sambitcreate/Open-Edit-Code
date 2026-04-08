import { invoke } from "@tauri-apps/api/core";
import { confirmDiscardUnsavedChanges } from "@/lib/fileSession";
import { parseContent, serializeJson, supportsStructuredEditing } from "@/lib/parse";
import { validateBasicJson } from "@/lib/validation";
import { useAppStore } from "@/lib/state/store";
import type { SaveResult } from "@/types";

export async function saveCurrentFile() {
  const store = useAppStore.getState();
  const {
    currentFile,
    configData,
    rawContent,
    configRootKind,
    editorMode,
  } = store;

  if (!currentFile) {
    return false;
  }

  const contentToSave = editorMode === "raw" || !configData
    ? rawContent
    : serializeJson(configData, configRootKind ?? "object");

  if (currentFile.format === "json") {
    const validation = validateBasicJson(contentToSave);

    if (!validation.valid) {
      store.setValidationErrors(
        validation.errors.map((error) => ({
          path: error.path,
          message: error.message,
          severity: "error" as const,
        }))
      );
      return false;
    }
  }

  if (currentFile.format === "jsonc") {
    const parsed = parseContent(contentToSave, currentFile.format);
    if (parsed.error) {
      store.setValidationErrors([
        { path: "/", message: parsed.error, severity: "error" },
      ]);
      return false;
    }
  }

  store.setIsSaving(true);
  try {
    const result = await invoke<SaveResult>("save_file", {
      path: currentFile.path,
      content: contentToSave,
    });

    store.setLastSaveResult(result);
    if (!result.success) {
      return false;
    }

    const parsed = supportsStructuredEditing(currentFile.format)
      ? parseContent(contentToSave, currentFile.format)
      : { data: null, error: null, rootKind: null };

    store.setOriginalContent(contentToSave);
    store.setRawContent(contentToSave);
    store.setConfigData(parsed.data);
    store.setConfigRootKind(parsed.rootKind);
    store.setDirty(false);

    if (parsed.error) {
      store.setValidationErrors([
        { path: "/", message: parsed.error, severity: "error" },
      ]);
    } else {
      store.setValidationErrors([]);
    }

    return true;
  } catch (error) {
    store.setLastSaveResult({
      success: false,
      backup_path: null,
      error: String(error),
    });
    return false;
  } finally {
    store.setIsSaving(false);
  }
}

export async function revertCurrentFile() {
  const store = useAppStore.getState();
  const {
    currentFile,
    dirty,
    originalContent,
  } = store;

  if (!currentFile || !dirty) {
    return false;
  }

  const shouldDiscard = await confirmDiscardUnsavedChanges(
    "Discard your unsaved changes and restore the last saved version?"
  );

  if (!shouldDiscard) {
    return false;
  }

  const parsed = parseContent(originalContent, currentFile.format);

  store.setRawContent(originalContent);
  store.setConfigData(parsed.data);
  store.setConfigRootKind(parsed.rootKind);

  if (parsed.error) {
    store.setValidationErrors([
      {
        path: "/",
        message: parsed.error,
        severity: supportsStructuredEditing(currentFile.format) ? "error" : "warning",
      },
    ]);
  } else {
    store.setValidationErrors([]);
  }

  store.setDirty(false);
  return true;
}
