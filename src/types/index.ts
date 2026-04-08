export type FileFormat = "json" | "jsonc" | "yaml" | "toml";

export type ConfigRootKind = "object" | "array";

export interface OpenFile {
  path: string;
  content: string;
  format: FileFormat;
  fileName: string;
}

export interface SaveResult {
  success: boolean;
  backup_path: string | null;
  error: string | null;
}

export interface BackupInfo {
  path: string;
  timestamp: string;
  original_path: string;
}

export interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export type EditorMode = "form" | "structure" | "raw" | "diff";

export interface EditorPreferences {
  rawWordWrap: boolean;
  rawLineNumbers: boolean;
  diffSideBySide: boolean;
}

export interface EditorActions {
  find?: () => void;
  undo?: () => void;
  redo?: () => void;
}

export interface AppState {
  currentFile: OpenFile | null;
  originalContent: string;
  rawContent: string;
  configData: Record<string, unknown> | null;
  configRootKind: ConfigRootKind | null;
  dirty: boolean;
  editorMode: EditorMode;
  validationErrors: ValidationError[];
  recentFiles: string[];
  isSaving: boolean;
  lastSaveResult: SaveResult | null;
  shortcutOverlayOpen: boolean;
  settingsOpen: boolean;
  editorPreferences: EditorPreferences;
}
