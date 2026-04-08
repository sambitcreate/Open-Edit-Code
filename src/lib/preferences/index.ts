import { supportsVisualEditing } from "@/lib/parse";
import type {
  AppPreferences,
  BackupRetentionPreferences,
  ConfigRootKind,
  DefaultOpenMode,
  EditorMode,
  EditorPreferences,
  FileFormat,
  JsonFormatPreferences,
  ThemeMode,
  ThemePreference,
} from "@/types";

type PreferencesInput = {
  themePreference?: ThemePreference;
  editor?: Partial<EditorPreferences>;
  backupRetention?: Partial<BackupRetentionPreferences>;
  defaultOpenMode?: DefaultOpenMode;
  formatDefaults?: {
    json?: Partial<JsonFormatPreferences>;
    jsonc?: Partial<JsonFormatPreferences>;
  };
};

const MIN_EDITOR_FONT_SIZE = 11;
const MAX_EDITOR_FONT_SIZE = 24;
const MIN_EDITOR_TAB_SIZE = 2;
const MAX_EDITOR_TAB_SIZE = 8;
const MIN_BACKUP_RETENTION_VALUE = 1;
const MAX_BACKUP_COUNT = 250;
const MAX_BACKUP_AGE_DAYS = 365;

export const PREFERENCES_STORAGE_KEY = "config-studio-preferences";

export function createDefaultPreferences(): AppPreferences {
  return {
    themePreference: "system",
    editor: {
      fontSize: 13,
      tabSize: 2,
      wordWrap: true,
      showLineNumbers: true,
    },
    backupRetention: {
      mode: "count",
      value: 25,
    },
    defaultOpenMode: "auto",
    formatDefaults: {
      json: {
        indentSize: 2,
        sortKeys: false,
      },
      jsonc: {
        indentSize: 2,
        sortKeys: false,
      },
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampNumber(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const candidate = Number.isFinite(value) ? Number(value) : fallback;
  return clamp(Math.round(candidate), min, max);
}

export function normalizeEditorPreferences(
  value: Partial<EditorPreferences> | undefined,
  fallback: EditorPreferences = createDefaultPreferences().editor
): EditorPreferences {
  return {
    fontSize: clampNumber(value?.fontSize, fallback.fontSize, MIN_EDITOR_FONT_SIZE, MAX_EDITOR_FONT_SIZE),
    tabSize: clampNumber(value?.tabSize, fallback.tabSize, MIN_EDITOR_TAB_SIZE, MAX_EDITOR_TAB_SIZE),
    wordWrap: value?.wordWrap ?? fallback.wordWrap,
    showLineNumbers: value?.showLineNumbers ?? fallback.showLineNumbers,
  };
}

export function normalizeBackupRetentionPreferences(
  value: Partial<BackupRetentionPreferences> | undefined,
  fallback: BackupRetentionPreferences = createDefaultPreferences().backupRetention
): BackupRetentionPreferences {
  const mode = value?.mode === "age" ? "age" : value?.mode === "count" ? "count" : fallback.mode;
  const max = mode === "age" ? MAX_BACKUP_AGE_DAYS : MAX_BACKUP_COUNT;

  return {
    mode,
    value: clampNumber(value?.value, fallback.value, MIN_BACKUP_RETENTION_VALUE, max),
  };
}

export function normalizeJsonFormatPreferences(
  value: Partial<JsonFormatPreferences> | undefined,
  fallback: JsonFormatPreferences
): JsonFormatPreferences {
  return {
    indentSize: value?.indentSize === 4 ? 4 : value?.indentSize === 2 ? 2 : fallback.indentSize,
    sortKeys: value?.sortKeys ?? fallback.sortKeys,
  };
}

export function normalizePreferences(value: PreferencesInput | undefined): AppPreferences {
  const defaults = createDefaultPreferences();

  return {
    themePreference:
      value?.themePreference === "light" || value?.themePreference === "dark"
        ? value.themePreference
        : defaults.themePreference,
    editor: normalizeEditorPreferences(value?.editor, defaults.editor),
    backupRetention: normalizeBackupRetentionPreferences(
      value?.backupRetention,
      defaults.backupRetention
    ),
    defaultOpenMode: isDefaultOpenMode(value?.defaultOpenMode)
      ? value.defaultOpenMode
      : defaults.defaultOpenMode,
    formatDefaults: {
      json: normalizeJsonFormatPreferences(value?.formatDefaults?.json, defaults.formatDefaults.json),
      jsonc: normalizeJsonFormatPreferences(
        value?.formatDefaults?.jsonc,
        defaults.formatDefaults.jsonc
      ),
    },
  };
}

function isDefaultOpenMode(value: string | undefined): value is DefaultOpenMode {
  return value === "auto" || value === "form" || value === "structure" || value === "raw" || value === "diff";
}

export function resolveThemeMode(
  preference: ThemePreference,
  systemTheme: ThemeMode
): ThemeMode {
  return preference === "system" ? systemTheme : preference;
}

export function resolveEditorModeOnOpen({
  preferredMode,
  format,
  rootKind,
  hasData,
}: {
  preferredMode: DefaultOpenMode;
  format: FileFormat;
  rootKind: ConfigRootKind | null;
  hasData: boolean;
}): EditorMode {
  if (preferredMode !== "auto") {
    return isModeSupportedForFile(preferredMode, format, rootKind, hasData)
      ? preferredMode
      : "raw";
  }

  return hasData && rootKind === "object" && supportsVisualEditing(format)
    ? "form"
    : "raw";
}

function isModeSupportedForFile(
  mode: EditorMode,
  format: FileFormat,
  rootKind: ConfigRootKind | null,
  hasData: boolean
): boolean {
  if (mode === "raw" || mode === "diff") {
    return true;
  }

  return hasData && rootKind === "object" && supportsVisualEditing(format);
}

export function getJsonFormatPreferences(
  preferences: AppPreferences,
  format: FileFormat
): JsonFormatPreferences {
  return format === "jsonc"
    ? preferences.formatDefaults.jsonc
    : preferences.formatDefaults.json;
}
