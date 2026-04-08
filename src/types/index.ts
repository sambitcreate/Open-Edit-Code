export type FileFormat = "json" | "jsonc" | "yaml" | "toml";

export type ConfigRootKind = "object" | "array";
export type ThemeMode = "light" | "dark";
export type ThemePreference = "system" | ThemeMode;

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
export type DefaultOpenMode = "auto" | EditorMode;
export type BackupRetentionMode = "count" | "age";

export interface EditorPreferences {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  showLineNumbers: boolean;
}

export interface BackupRetentionPreferences {
  mode: BackupRetentionMode;
  value: number;
}

export interface JsonFormatPreferences {
  indentSize: 2 | 4;
  sortKeys: boolean;
}

export interface AppPreferences {
  themePreference: ThemePreference;
  editor: EditorPreferences;
  backupRetention: BackupRetentionPreferences;
  defaultOpenMode: DefaultOpenMode;
  formatDefaults: {
    json: JsonFormatPreferences;
    jsonc: JsonFormatPreferences;
  };
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
  backups: BackupInfo[];
  isLoadingBackups: boolean;
  isSaving: boolean;
  lastSaveResult: SaveResult | null;
  preferences: AppPreferences;
  jsoncCommentWarningAcceptedFor: string | null;
}
