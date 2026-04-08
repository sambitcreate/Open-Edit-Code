import { invoke } from "@tauri-apps/api/core";
import { confirm, open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { stat } from "@tauri-apps/plugin-fs";
import { detectFormat, getFileName, parseContent, supportsStructuredEditing, supportsVisualEditing } from "@/lib/parse";
import { useAppStore } from "@/lib/state/store";
import type { FileStatus, OpenFile } from "@/types";

type TauriOpenFileResult = {
  path: string;
  content: string;
  format: string;
  last_modified?: string | null;
  readonly?: boolean;
  size?: number;
};

type TauriFileStatusResult = {
  path: string;
  format: string;
  exists: boolean;
  changed: boolean;
  last_modified?: string | null;
  readonly?: boolean;
  size?: number | null;
};

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

export async function confirmOverwriteExternalChanges(message?: string) {
  return confirm(
    message ?? "This file changed on disk after you opened it. Overwrite those changes with your version?",
    {
      title: "File changed on disk",
      kind: "warning",
      okLabel: "Keep mine",
      cancelLabel: "Review first",
    }
  );
}

export async function getFileMetadata(filePath: string) {
  try {
    const info = await stat(filePath);

    return {
      lastModified: info.mtime ? info.mtime.toISOString() : null,
      sizeBytes: info.size ?? null,
      isReadOnly: info.readonly,
    };
  } catch {
    return {
      lastModified: null,
      sizeBytes: null,
      isReadOnly: false,
    };
  }
}

export async function getCurrentFileStatus(
  filePath: string,
  baseline?: Pick<OpenFile, "lastModified" | "sizeBytes">
): Promise<FileStatus> {
  try {
    const status = await invoke<TauriFileStatusResult>("get_file_status", {
      path: filePath,
      lastModified: baseline?.lastModified ?? null,
      size: baseline?.sizeBytes ?? null,
    });

    return {
      path: status.path,
      format: detectFormat(filePath),
      exists: status.exists,
      changed: status.changed,
      lastModified: status.last_modified ?? null,
      isReadOnly: Boolean(status.readonly),
      sizeBytes: status.size ?? null,
    };
  } catch {
    const metadata = await getFileMetadata(filePath);

    return {
      path: filePath,
      format: detectFormat(filePath),
      exists: metadata.lastModified !== null || metadata.sizeBytes !== null,
      changed:
        (baseline?.lastModified ?? null) !== metadata.lastModified ||
        (baseline?.sizeBytes ?? null) !== metadata.sizeBytes,
      lastModified: metadata.lastModified,
      isReadOnly: metadata.isReadOnly,
      sizeBytes: metadata.sizeBytes,
    };
  }
}

export async function loadFileIntoStore(filePath: string) {
  const store = useAppStore.getState();

  try {
    const result = await invoke<TauriOpenFileResult>("open_file", { path: filePath });
    const format = detectFormat(filePath);
    const parsed = parseContent(result.content, format);
    const metadata = await getFileMetadata(filePath);

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
      lastModified: result.last_modified ?? metadata.lastModified,
      sizeBytes: result.size ?? metadata.sizeBytes,
      isReadOnly: result.readonly ?? metadata.isReadOnly,
    });
    store.setOriginalContent(result.content);
    store.setRawContent(result.content);
    store.setDirty(false);
    store.setEditorMode(
      parsed.data && parsed.rootKind === "object" && supportsVisualEditing(format)
        ? "form"
        : "raw"
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

  const filePath = selected as string;
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
