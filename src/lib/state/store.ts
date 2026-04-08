import { create } from "zustand";
import type { ConfigRootKind, EditorMode, OpenFile, SaveResult, ValidationError } from "@/types";

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
