import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createDefaultPreferences,
  normalizeBackupRetentionPreferences,
  normalizeEditorPreferences,
  normalizeJsonFormatPreferences,
  normalizePreferences,
  PREFERENCES_STORAGE_KEY,
} from "@/lib/preferences";
import type {
  AppPreferences,
  BackupInfo,
  BackupRetentionPreferences,
  ConfigRootKind,
  DefaultOpenMode,
  EditorMode,
  EditorPreferences,
  FileFormat,
  OpenFile,
  SaveResult,
  ThemePreference,
  ValidationError,
} from "@/types";

interface AppStore {
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
  activeSection: string;
  preferences: AppPreferences;

  setCurrentFile: (file: OpenFile) => void;
  setOriginalContent: (content: string) => void;
  setRawContent: (content: string) => void;
  setConfigData: (data: Record<string, unknown> | null) => void;
  setConfigRootKind: (kind: ConfigRootKind | null) => void;
  setDirty: (dirty: boolean) => void;
  setEditorMode: (mode: EditorMode) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  addRecentFile: (path: string) => void;
  setBackups: (backups: BackupInfo[]) => void;
  setIsLoadingBackups: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setLastSaveResult: (result: SaveResult | null) => void;
  setActiveSection: (section: string) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  updateEditorPreferences: (updates: Partial<EditorPreferences>) => void;
  setBackupRetention: (retention: Partial<BackupRetentionPreferences>) => void;
  setDefaultOpenMode: (mode: DefaultOpenMode) => void;
  updateFormatDefaults: (
    format: Extract<FileFormat, "json" | "jsonc">,
    updates: Partial<AppPreferences["formatDefaults"]["json"]>
  ) => void;
  resetFile: () => void;
}

function createInitialState() {
  return {
    currentFile: null,
    originalContent: "",
    rawContent: "",
    configData: null,
    configRootKind: null,
    dirty: false,
    editorMode: "form" as EditorMode,
    validationErrors: [],
    recentFiles: [],
    backups: [],
    isLoadingBackups: false,
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    preferences: createDefaultPreferences(),
  };
}

const memoryStorage = new Map<string, string>();

function getPersistStorage() {
  if (
    typeof window !== "undefined" &&
    window.localStorage &&
    typeof window.localStorage.getItem === "function" &&
    typeof window.localStorage.setItem === "function" &&
    typeof window.localStorage.removeItem === "function"
  ) {
    return window.localStorage;
  }

  return {
    getItem: (name: string) => memoryStorage.get(name) ?? null,
    setItem: (name: string, value: string) => {
      memoryStorage.set(name, value);
    },
    removeItem: (name: string) => {
      memoryStorage.delete(name);
    },
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...createInitialState(),

      setCurrentFile: (file) =>
        set((state) => {
          const recent = state.recentFiles.filter((p) => p !== file.path);
          return {
            currentFile: file,
            recentFiles: [file.path, ...recent].slice(0, 10),
          };
        }),

      setOriginalContent: (content) => set({ originalContent: content }),

      setRawContent: (content) => set({ rawContent: content }),

      setConfigData: (data) => set({ configData: data }),

      setConfigRootKind: (configRootKind) => set({ configRootKind }),

      setDirty: (dirty) => set({ dirty }),

      setEditorMode: (mode) => set({ editorMode: mode }),

      setValidationErrors: (errors) => set({ validationErrors: errors }),

      addRecentFile: (path) =>
        set((state) => {
          const recent = state.recentFiles.filter((p) => p !== path);
          return { recentFiles: [path, ...recent].slice(0, 10) };
        }),

      setBackups: (backups) => set({ backups }),

      setIsLoadingBackups: (isLoadingBackups) => set({ isLoadingBackups }),

      setIsSaving: (saving) => set({ isSaving: saving }),

      setLastSaveResult: (result) => set({ lastSaveResult: result }),

      setActiveSection: (section) => set({ activeSection: section }),

      setThemePreference: (themePreference) =>
        set((state) => ({
          preferences: normalizePreferences({
            ...state.preferences,
            themePreference,
          }),
        })),

      updateEditorPreferences: (updates) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            editor: normalizeEditorPreferences(updates, state.preferences.editor),
          },
        })),

      setBackupRetention: (retention) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            backupRetention: normalizeBackupRetentionPreferences(
              retention,
              state.preferences.backupRetention
            ),
          },
        })),

      setDefaultOpenMode: (mode) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            defaultOpenMode: mode,
          },
        })),

      updateFormatDefaults: (format, updates) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            formatDefaults: {
              ...state.preferences.formatDefaults,
              [format]: normalizeJsonFormatPreferences(
                updates,
                state.preferences.formatDefaults[format]
              ),
            },
          },
        })),

      resetFile: () =>
        set({
          currentFile: null,
          originalContent: "",
          rawContent: "",
          configData: null,
          configRootKind: null,
          dirty: false,
          validationErrors: [],
          backups: [],
          isLoadingBackups: false,
          lastSaveResult: null,
          activeSection: "",
        }),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(getPersistStorage),
      partialize: (state) => ({
        preferences: state.preferences,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppStore> | undefined;

        return {
          ...currentState,
          preferences: normalizePreferences(persisted?.preferences),
        };
      },
    }
  )
);
