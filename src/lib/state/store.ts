import { create } from "zustand";
import type {
  ConfigRootKind,
  EditorActions,
  EditorMode,
  EditorPreferences,
  OpenFile,
  SaveResult,
  ValidationError,
} from "@/types";

const EDITOR_PREFERENCES_STORAGE_KEY = "config-studio.editor-preferences";

export const defaultEditorPreferences: EditorPreferences = {
  rawWordWrap: true,
  rawLineNumbers: true,
  diffSideBySide: true,
};

function loadEditorPreferences(): EditorPreferences {
  if (typeof window === "undefined") {
    return defaultEditorPreferences;
  }

  try {
    const raw = window.localStorage.getItem(EDITOR_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return defaultEditorPreferences;
    }

    const parsed = JSON.parse(raw) as Partial<EditorPreferences>;
    return {
      ...defaultEditorPreferences,
      ...parsed,
    };
  } catch {
    return defaultEditorPreferences;
  }
}

function persistEditorPreferences(preferences: EditorPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      EDITOR_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    );
  } catch {
    // Ignore storage failures so the editor remains usable in restricted contexts.
  }
}

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
  isSaving: boolean;
  lastSaveResult: SaveResult | null;
  activeSection: string;
  shortcutOverlayOpen: boolean;
  settingsOpen: boolean;
  editorPreferences: EditorPreferences;
  editorActions: EditorActions;

  setCurrentFile: (file: OpenFile) => void;
  setOriginalContent: (content: string) => void;
  setRawContent: (content: string) => void;
  setConfigData: (data: Record<string, unknown> | null) => void;
  setConfigRootKind: (kind: ConfigRootKind | null) => void;
  setDirty: (dirty: boolean) => void;
  setEditorMode: (mode: EditorMode) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  addRecentFile: (path: string) => void;
  setIsSaving: (saving: boolean) => void;
  setLastSaveResult: (result: SaveResult | null) => void;
  setActiveSection: (section: string) => void;
  setShortcutOverlayOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setEditorPreferences: (preferences: Partial<EditorPreferences>) => void;
  resetEditorPreferences: () => void;
  setEditorActions: (actions: EditorActions) => void;
  resetFile: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentFile: null,
  originalContent: "",
  rawContent: "",
  configData: null,
  configRootKind: null,
  dirty: false,
  editorMode: "form",
  validationErrors: [],
  recentFiles: [],
  isSaving: false,
  lastSaveResult: null,
  activeSection: "",
  shortcutOverlayOpen: false,
  settingsOpen: false,
  editorPreferences: loadEditorPreferences(),
  editorActions: {},

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

  setIsSaving: (saving) => set({ isSaving: saving }),

  setLastSaveResult: (result) => set({ lastSaveResult: result }),

  setActiveSection: (section) => set({ activeSection: section }),

  setShortcutOverlayOpen: (shortcutOverlayOpen) => set({ shortcutOverlayOpen }),

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  setEditorPreferences: (preferences) =>
    set((state) => {
      const nextPreferences = {
        ...state.editorPreferences,
        ...preferences,
      };
      persistEditorPreferences(nextPreferences);
      return { editorPreferences: nextPreferences };
    }),

  resetEditorPreferences: () => {
    persistEditorPreferences(defaultEditorPreferences);
    set({ editorPreferences: defaultEditorPreferences });
  },

  setEditorActions: (editorActions) => set({ editorActions }),

  resetFile: () =>
    set({
      currentFile: null,
      originalContent: "",
      rawContent: "",
      configData: null,
      configRootKind: null,
      dirty: false,
      validationErrors: [],
      lastSaveResult: null,
      activeSection: "",
    }),
}));
