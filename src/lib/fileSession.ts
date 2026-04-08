import { invoke } from "@tauri-apps/api/core";
import { confirm, open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { resolveEditorModeOnOpen } from "@/lib/preferences";
import { detectFormat, getFileName, parseContent, supportsStructuredEditing, supportsVisualEditing } from "@/lib/parse";
import { useAppStore } from "@/lib/state/store";
import type { OpenFile } from "@/types";

const configFileDialogOptions = {
  multiple: false,
  filters: [
    {
      name: "Config Files",
      extensions: ["json", "jsonc", "yaml", "yml", "toml"],
    },
  ],
};

export async function confirmDiscardUnsavedChanges(message?: string) {
  return confirm(
    message ?? "You have unsaved changes. Discard them and continue?",
    {
      title: "Unsaved changes",
      kind: "warning",
      okLabel: "Discard changes",
      cancelLabel: "Keep editing",
    }
  );
}

export async function loadFileIntoStore(filePath: string) {
  const store = useAppStore.getState();

  try {
    const result = await invoke<OpenFile>("open_file", { path: filePath });
    const format = detectFormat(filePath);
    const parsed = parseContent(result.content, format);

    if (parsed.error) {
      store.setValidationErrors([
        {
          path: "/",
          message: parsed.error,
          severity: supportsStructuredEditing(format) ? "error" : "warning",
        },
      ]);
      store.setConfigData(null);
      store.setConfigRootKind(null);
    } else {
      store.setConfigData(parsed.data);
      store.setConfigRootKind(parsed.rootKind);
      store.setValidationErrors([]);
    }

    store.setLastSaveResult(null);
    store.setCurrentFile({
      path: filePath,
      content: result.content,
      format,
      fileName: getFileName(filePath),
    });
    store.setOriginalContent(result.content);
    store.setRawContent(result.content);
    store.setDirty(false);
    store.setEditorMode(
      resolveEditorModeOnOpen({
        preferredMode: store.preferences.defaultOpenMode,
        format,
        rootKind: parsed.rootKind,
        hasData: Boolean(parsed.data) && (supportsVisualEditing(format) || parsed.rootKind === "array"),
      })
    );

    return true;
  } catch (error) {
    store.setValidationErrors([
      { path: "/", message: String(error), severity: "error" },
    ]);
    return false;
  }
}

export async function openFileIntoStore() {
  const selected = await dialogOpen(configFileDialogOptions);
  if (!selected) {
    return false;
  }

  return openRecentFileIntoStore(selected as string);
}

export async function openRecentFileIntoStore(filePath: string) {
  const { dirty } = useAppStore.getState();

  if (dirty) {
    const shouldDiscard = await confirmDiscardUnsavedChanges(
      "You have unsaved changes. Discard them and open another file?"
    );

    if (!shouldDiscard) {
      return false;
    }
  }

  return loadFileIntoStore(filePath);
}

export async function reopenMostRecentFileIntoStore() {
  const { currentFile, recentFiles } = useAppStore.getState();
  const nextPath = recentFiles.find((path) => path !== currentFile?.path) ?? recentFiles[0];

  if (!nextPath) {
    return false;
  }

  return openRecentFileIntoStore(nextPath);
}
