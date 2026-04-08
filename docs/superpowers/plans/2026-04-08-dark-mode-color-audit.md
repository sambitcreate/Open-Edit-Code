# Dark Mode + Color Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce system-driven dark mode and replace all hardcoded colors in the app with tokens, fixing white-on-white failures in embedded editor libraries.

**Architecture:** Tailwind v4 `@theme` block holds the light palette; a `@media (prefers-color-scheme: dark) { :root { ... } }` block overrides the same CSS variables for dark mode. All hardcoded hex/rgba in `src/App.css` and `src/components/editors/FormEditor.tsx` get replaced with `var(--color-*)` references. A new `useSystemTheme` hook syncs Monaco, vanilla-jsoneditor, and Material UI with the system preference.

**Tech Stack:** Tailwind v4, React 19, TypeScript, Vitest, Material UI (via JSON Forms), Monaco editor, vanilla-jsoneditor.

**Design spec:** `docs/superpowers/specs/2026-04-08-dark-mode-color-audit-design.md`

---

## File Structure

**Modified files:**
- `src/App.css` — extend `@theme` with new tokens, replace all hardcoded colors with tokens, add `@media (prefers-color-scheme: dark)` override block.
- `src/components/editors/FormEditor.tsx` — tokenize the inline MUI style block, wrap `<JsonForms>` in a MUI `ThemeProvider` driven by `useSystemTheme()`.
- `src/components/editors/RawEditor.tsx` — consume `useSystemTheme()` and pass `"vs"` or `"vs-dark"` to Monaco.
- `src/components/editors/DiffViewer.tsx` — same Monaco theme flip as RawEditor.
- `src/App.tsx` — call `useSystemTheme()` once at the top so its DOM side-effects (`data-theme`, `.jse-theme-dark`) run.

**New files:**
- `src/lib/theme/useSystemTheme.ts` — `useSyncExternalStore`-based hook that returns `'light' | 'dark'` and sets `document.documentElement.dataset.theme` + toggles `.jse-theme-dark`.
- `src/lib/theme/useSystemTheme.test.ts` — Vitest unit test that stubs `window.matchMedia` and asserts the hook returns the expected mode and sets the DOM attributes.

**Unchanged:** All Rust code in `src-tauri/`. All other components (`Sidebar.tsx`, `ModeTabs.tsx`, `StatusBar.tsx`, `WelcomeScreen.tsx`, `FileOpener.tsx`, `SaveControls.tsx`, `StructureEditor.tsx`). Tailwind utility classes like `text-danger` continue to work because they resolve to `var(--color-danger)` via `@theme`.

---

## Task 1: Add new tokens to `@theme` (no behavior change)

**Files:**
- Modify: `src/App.css:3-27` (the `@theme` block)

- [ ] **Step 1: Open `src/App.css` and replace the current `@theme` block**

Current `@theme` block at lines 3-27:

```css
@theme {
  --color-background: #f5f5f7;
  --color-foreground: #1c1c1e;
  --color-card: #ffffff;
  --color-card-foreground: #1c1c1e;
  --color-popover: #ffffff;
  --color-popover-foreground: #1c1c1e;
  --color-primary: #0077a8;
  --color-primary-foreground: #ffffff;
  --color-secondary: #ececf1;
  --color-secondary-foreground: #1c1c1e;
  --color-muted: #ececf1;
  --color-muted-foreground: #6e6e73;
  --color-accent: #f6f6f8;
  --color-accent-foreground: #1c1c1e;
  --color-border: #e5e5ea;
  --color-input: #ffffff;
  --color-ring: #0077a8;
  --color-sidebar: #ffffff;
  --color-sidebar-foreground: #4b4b52;
  --color-sidebar-accent: #f7f7fa;
  --color-danger: #cc2d24;
  --color-warning: #b36800;
  --color-success: #1a7a30;
}
```

Replace it with this expanded block (keeps all existing values, adds new tokens):

```css
@theme {
  /* Core surfaces */
  --color-background: #f9f6f1;
  --color-background-2: #f2ede4;
  --color-surface: #ffffff;
  --color-surface-2: #f4efe7;
  --color-foreground: #1c1917;
  --color-muted-foreground: #6b645b;
  --color-border: #e8e2d6;
  --color-input: #ffffff;
  --color-overlay: rgba(28, 25, 23, 0.45);

  /* Legacy aliases (kept to avoid breaking Tailwind utilities elsewhere) */
  --color-card: #ffffff;
  --color-card-foreground: #1c1917;
  --color-popover: #ffffff;
  --color-popover-foreground: #1c1917;
  --color-secondary: #f4efe7;
  --color-secondary-foreground: #1c1917;
  --color-muted: #f4efe7;
  --color-accent: #f4efe7;
  --color-accent-foreground: #1c1917;
  --color-sidebar: #ffffff;
  --color-sidebar-foreground: #4b4b52;
  --color-sidebar-accent: #f4efe7;

  /* Primary + semantic */
  --color-primary: #0077a8;
  --color-primary-foreground: #ffffff;
  --color-ring: #0077a8;
  --color-danger: #cc2d24;
  --color-warning: #b36800;
  --color-success: #1a7a30;

  /* Tonal cards — peach */
  --color-tone-peach-bg: #fff3e3;
  --color-tone-peach-bg-2: #fde9cf;
  --color-tone-peach-fg: #8a5520;
  --color-tone-peach-border: #f1dcbc;

  /* Tonal cards — mint */
  --color-tone-mint-bg: #d8f6df;
  --color-tone-mint-bg-2: #c7efd1;
  --color-tone-mint-fg: #1a7a34;
  --color-tone-mint-border: #b7e6c1;

  /* Tonal cards — blue */
  --color-tone-blue-bg: #e4f1ff;
  --color-tone-blue-bg-2: #d2e7ff;
  --color-tone-blue-fg: #1a56b8;
  --color-tone-blue-border: #c6ddf8;
}
```

- [ ] **Step 2: Verify build still works**

Run: `npm run build`
Expected: Build succeeds. No visual change yet because nothing consumes the new tokens.

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "style: expand theme tokens for dark mode migration

Add surface, overlay, and tonal card tokens; split hardcoded
palette values into typed token groups. No visual change yet."
```

---

## Task 2: Sweep `src/App.css` to use tokens

**Files:**
- Modify: `src/App.css:35-688` (every rule with hardcoded colors)

- [ ] **Step 1: Replace the `html, body, #root` block**

Current (lines 35-46):

```css
html,
body,
#root {
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(180deg, #f9f9fb 0%, #f2f2f7 100%);
  color: var(--color-foreground);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Replace with:

```css
html,
body,
#root {
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(180deg, var(--color-background) 0%, var(--color-background-2) 100%);
  color: var(--color-foreground);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 2: Replace `.app-topbar-panel`**

Current:

```css
.app-topbar-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 12px 14px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(229, 229, 234, 0.9);
  box-shadow: 0 10px 28px rgba(28, 28, 30, 0.06);
  flex-wrap: wrap;
}
```

Replace with:

```css
.app-topbar-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 12px 14px;
  border-radius: 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 10px 28px var(--color-overlay);
  flex-wrap: wrap;
}
```

- [ ] **Step 3: Replace `.app-main`**

Current:

```css
.app-main {
  min-width: 0;
  min-height: 0;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(229, 229, 234, 0.92);
  box-shadow: 0 14px 36px rgba(28, 28, 30, 0.06);
  overflow: hidden;
}
```

Replace with:

```css
.app-main {
  min-width: 0;
  min-height: 0;
  border-radius: 28px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 14px 36px var(--color-overlay);
  overflow: hidden;
}
```

- [ ] **Step 4: Replace `.toolbar-button, .raised-button` background**

Current:

```css
.toolbar-button,
.raised-button {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f7f9 100%);
  color: var(--color-foreground);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
}
```

Replace with:

```css
.toolbar-button,
.raised-button {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-2) 100%);
  color: var(--color-foreground);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 10px var(--color-overlay), 0 1px 3px var(--color-overlay);
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
}
```

- [ ] **Step 5: Replace `.mode-tabs-shell`**

Current:

```css
.mode-tabs-shell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 20px;
  background: #f3f3f7;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.06);
}
```

Replace with:

```css
.mode-tabs-shell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 20px;
  background: var(--color-surface-2);
  box-shadow: inset 0 1px 3px var(--color-overlay);
}
```

- [ ] **Step 6: Replace `.mode-tab-button-active`**

Current:

```css
.mode-tab-button-active {
  color: var(--color-foreground);
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}
```

Replace with:

```css
.mode-tab-button-active {
  color: var(--color-foreground);
  background: var(--color-surface);
  box-shadow: 0 2px 6px var(--color-overlay);
}
```

- [ ] **Step 7: Replace `.file-chip, .status-pill`**

Current:

```css
.file-chip,
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 14px;
  background: #f7f7fa;
  color: #5b5b62;
  font-size: 12px;
  border: 1px solid #ececf1;
}
```

Replace with:

```css
.file-chip,
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 14px;
  background: var(--color-surface-2);
  color: var(--color-muted-foreground);
  font-size: 12px;
  border: 1px solid var(--color-border);
}
```

- [ ] **Step 8: Replace `.sidebar-shell`**

Current:

```css
.sidebar-shell {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(229, 229, 234, 0.92);
  box-shadow: 0 14px 36px rgba(28, 28, 30, 0.06);
}
```

Replace with:

```css
.sidebar-shell {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 28px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 14px 36px var(--color-overlay);
}
```

- [ ] **Step 9: Replace `.sidebar-title`**

Current:

```css
.sidebar-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5f5f66;
}
```

Replace with:

```css
.sidebar-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted-foreground);
}
```

- [ ] **Step 10: Replace `.sidebar-item` shadow**

Current:

```css
.sidebar-item {
  width: 100%;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 14px;
  border-radius: 16px;
  text-align: left;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02);
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
}

.sidebar-item:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03);
}
```

Replace with:

```css
.sidebar-item {
  width: 100%;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 14px;
  border-radius: 16px;
  text-align: left;
  box-shadow: 0 3px 6px var(--color-overlay), 0 1px 2px var(--color-overlay);
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
}

.sidebar-item:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px var(--color-overlay), 0 1px 3px var(--color-overlay);
}
```

- [ ] **Step 11: Replace `.sidebar-item-leading`**

Current:

```css
.sidebar-item-leading {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: #2b2b31;
  font-size: 14px;
  font-weight: 500;
}
```

Replace with:

```css
.sidebar-item-leading {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: var(--color-foreground);
  font-size: 14px;
  font-weight: 500;
}
```

- [ ] **Step 12: Replace tonal card rules (peach, mint, blue)**

Current:

```css
.sidebar-item-peach,
.task-item-peach {
  background: linear-gradient(180deg, #fff3e3 0%, #fde9cf 100%);
  color: #8a5520;
}

.sidebar-item-mint,
.task-item-mint {
  background: linear-gradient(180deg, #d8f6df 0%, #c7efd1 100%);
  color: #1a7a34;
}

.sidebar-item-blue,
.task-item-blue {
  background: linear-gradient(180deg, #e4f1ff 0%, #d2e7ff 100%);
  color: #1a56b8;
}
```

Replace with:

```css
.sidebar-item-peach,
.task-item-peach {
  background: linear-gradient(180deg, var(--color-tone-peach-bg) 0%, var(--color-tone-peach-bg-2) 100%);
  color: var(--color-tone-peach-fg);
  border: 1px solid var(--color-tone-peach-border);
}

.sidebar-item-mint,
.task-item-mint {
  background: linear-gradient(180deg, var(--color-tone-mint-bg) 0%, var(--color-tone-mint-bg-2) 100%);
  color: var(--color-tone-mint-fg);
  border: 1px solid var(--color-tone-mint-border);
}

.sidebar-item-blue,
.task-item-blue {
  background: linear-gradient(180deg, var(--color-tone-blue-bg) 0%, var(--color-tone-blue-bg-2) 100%);
  color: var(--color-tone-blue-fg);
  border: 1px solid var(--color-tone-blue-border);
}
```

- [ ] **Step 13: Replace `.sidebar-item-active` and `.sidebar-footer`**

Current:

```css
.sidebar-item-active {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03);
}

.sidebar-footer {
  padding: 12px 14px;
  border-radius: 18px;
  background: #f7f7fa;
  border: 1px solid #ececf1;
}

.sidebar-footer-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8e8e93;
}

.sidebar-footer-path {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: #5b5b62;
  word-break: break-word;
}
```

Replace with:

```css
.sidebar-item-active {
  box-shadow: 0 8px 16px var(--color-overlay), 0 1px 3px var(--color-overlay);
}

.sidebar-footer {
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.sidebar-footer-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted-foreground);
}

.sidebar-footer-path {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--color-muted-foreground);
  word-break: break-word;
}
```

- [ ] **Step 14: Replace `.welcome-card, .editor-empty-card`, `.welcome-drag-indicator`, `.welcome-avatar`, `.welcome-inset-card`**

Current:

```css
.welcome-card,
.editor-empty-card {
  width: 100%;
  border-radius: 28px;
  background: rgba(247, 247, 250, 0.96);
  border: 1px solid rgba(229, 229, 234, 0.92);
  box-shadow: 0 12px 30px rgba(28, 28, 30, 0.05);
}
```

Replace with:

```css
.welcome-card,
.editor-empty-card {
  width: 100%;
  border-radius: 28px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  box-shadow: 0 12px 30px var(--color-overlay);
}
```

Current:

```css
.welcome-drag-indicator {
  width: 40px;
  height: 5px;
  margin: 0 auto;
  border-radius: 999px;
  background: #d6d6db;
}
```

Replace with:

```css
.welcome-drag-indicator {
  width: 40px;
  height: 5px;
  margin: 0 auto;
  border-radius: 999px;
  background: var(--color-border);
}
```

Current:

```css
.welcome-avatar {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #ffffff;
  color: var(--color-primary);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}
```

Replace with:

```css
.welcome-avatar {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: 0 4px 10px var(--color-overlay);
}
```

Current:

```css
.welcome-inset-card {
  border-radius: 22px;
  background: #ffffff;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}
```

Replace with:

```css
.welcome-inset-card {
  border-radius: 22px;
  background: var(--color-surface);
  box-shadow: inset 0 2px 4px var(--color-overlay);
}
```

- [ ] **Step 15: Replace `.task-item`, `.task-text`, and the three `.task-icon-*` / `.task-circle-*` colors**

Current:

```css
.task-item {
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-radius: 18px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02);
}
```

Replace with:

```css
.task-item {
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-radius: 18px;
  box-shadow: 0 3px 6px var(--color-overlay), 0 1px 2px var(--color-overlay);
}
```

Current:

```css
.task-text {
  flex: 1;
  color: #1c1c1e;
  font-size: 15px;
  font-weight: 500;
}

.task-icon-peach,
.task-circle-peach {
  color: #8a5520;
}

.task-icon-mint,
.task-circle-mint {
  color: #1a7a34;
}

.task-icon-blue,
.task-circle-blue {
  color: #1a56b8;
}
```

Replace with:

```css
.task-text {
  flex: 1;
  color: var(--color-foreground);
  font-size: 15px;
  font-weight: 500;
}

.task-icon-peach,
.task-circle-peach {
  color: var(--color-tone-peach-fg);
}

.task-icon-mint,
.task-circle-mint {
  color: var(--color-tone-mint-fg);
}

.task-icon-blue,
.task-circle-blue {
  color: var(--color-tone-blue-fg);
}
```

- [ ] **Step 16: Replace `.statusbar-shell`, `.status-pill-warning`, `.status-kbd`**

Current:

```css
.statusbar-shell {
  min-height: 48px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(229, 229, 234, 0.9);
  box-shadow: 0 8px 24px rgba(28, 28, 30, 0.04);
  overflow: hidden;
}
```

Replace with:

```css
.statusbar-shell {
  min-height: 48px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 8px 24px var(--color-overlay);
  overflow: hidden;
}
```

Current:

```css
.status-pill-warning {
  color: #915100;
}
```

Replace with:

```css
.status-pill-warning {
  color: var(--color-warning);
}
```

Current:

```css
.status-kbd {
  padding: 4px 8px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #ececf1;
  color: #5b5b62;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

Replace with:

```css
.status-kbd {
  padding: 4px 8px;
  border-radius: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-muted-foreground);
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

- [ ] **Step 17: Replace `.editor-panel-card` and its embedded editor overrides**

Current:

```css
.editor-panel-card {
  height: 100%;
  width: 100%;
  border-radius: 24px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(229, 229, 234, 0.92);
  box-shadow: 0 10px 28px rgba(28, 28, 30, 0.05);
}

.editor-panel-card .monaco-editor,
.editor-panel-card .monaco-editor-background,
.editor-panel-card .margin,
.editor-panel-card .monaco-diff-editor,
.editor-panel-card .editor-original-margin,
.editor-panel-card .editor-modified-margin,
.editor-panel-card .jse-main,
.editor-panel-card .jse-navigation-bar,
.editor-panel-card .jse-contents,
.editor-panel-card .cm-editor,
.editor-panel-card .cm-scroller {
  background: #ffffff !important;
}

.editor-panel-card .jse-menu {
  background: #f7f7fa !important;
  border-bottom: 1px solid #ececf1 !important;
}

.editor-panel-card .jse-status-bar,
.editor-panel-card .jse-navigation-bar {
  border-color: #ececf1 !important;
}
```

Replace with:

```css
.editor-panel-card {
  height: 100%;
  width: 100%;
  border-radius: 24px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 10px 28px var(--color-overlay);
}

.editor-panel-card .monaco-editor,
.editor-panel-card .monaco-editor-background,
.editor-panel-card .margin,
.editor-panel-card .monaco-diff-editor,
.editor-panel-card .editor-original-margin,
.editor-panel-card .editor-modified-margin,
.editor-panel-card .jse-main,
.editor-panel-card .jse-navigation-bar,
.editor-panel-card .jse-contents,
.editor-panel-card .cm-editor,
.editor-panel-card .cm-scroller {
  background: var(--color-surface) !important;
}

.editor-panel-card .jse-menu {
  background: var(--color-surface-2) !important;
  border-bottom: 1px solid var(--color-border) !important;
}

.editor-panel-card .jse-status-bar,
.editor-panel-card .jse-navigation-bar {
  border-color: var(--color-border) !important;
}
```

Note: the selector list is identical to the original, just with tokens instead of hex. Because `--color-surface` flips under the `@media (prefers-color-scheme: dark)` block (added in Task 4), the background automatically becomes dark in dark mode without needing per-selector splits. The `.jse-theme-dark` class toggled on `<html>` by `useSystemTheme` handles JSE's internal text colors independently.

- [ ] **Step 18: Build and visually verify light mode is unchanged**

Run: `npm run build`
Expected: Build succeeds.

Run: `npm run dev` and open the app. Visual check: light mode should look identical to before — warm off-white background, white panels, colored sidebar tiles. No regressions.

- [ ] **Step 19: Run existing tests**

Run: `npm test`
Expected: All existing tests pass (ModeTabs, Sidebar, SaveControls, parse, store, etc.). Color changes shouldn't affect test output.

- [ ] **Step 20: Commit**

```bash
git add src/App.css
git commit -m "style: sweep App.css to use theme tokens

Replace all hardcoded hex/rgba in App.css with var(--color-*)
references. Split editor panel overrides so JSE internals can
win specificity under .jse-theme-dark. Light mode unchanged."
```

---

## Task 3: Sweep `FormEditor.tsx` inline MUI style block

**Files:**
- Modify: `src/components/editors/FormEditor.tsx:28-122`

- [ ] **Step 1: Replace the injected style block**

Current (lines 28-122 — the `useEffect` that creates the `<style>` element):

```tsx
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .jsonforms-group {
        margin-bottom: 1rem;
        padding: 1.1rem 1.15rem;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.84);
        border: 1px solid rgba(226, 226, 232, 0.9);
        box-shadow: 0 18px 40px rgba(34, 34, 46, 0.06), 0 2px 6px rgba(34, 34, 46, 0.04);
      }
      .jsonforms-group label {
        font-weight: 600;
        font-size: 0.88rem;
        margin-bottom: 0.9rem;
        display: block;
        color: var(--color-foreground);
      }
      .jsonforms-group .group-items {
        display: grid;
        gap: 0.65rem;
      }
      [class*="MuiInput-root"], [class*="MuiOutlinedInput"] {
        color: var(--color-foreground) !important;
        border-radius: 20px !important;
        background: rgba(255, 255, 255, 0.96) !important;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06) !important;
      }
      [class*="MuiInputBase-input"] {
        color: var(--color-foreground) !important;
        padding: 12px 14px !important;
        font-size: 0.88rem !important;
      }
      [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: rgba(0, 0, 0, 0) !important;
        border-radius: 20px !important;
      }
      [class*="MuiOutlinedInput-root"]:hover [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: rgba(0, 0, 0, 0) !important;
      }
      [class*="MuiOutlinedInput-root.Mui-focused"] [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: rgba(48, 167, 255, 0.35) !important;
        border-width: 1.5px !important;
      }
      [class*="MuiInputLabel-root"] {
        color: var(--color-muted-foreground) !important;
        font-size: 0.82rem !important;
      }
      [class*="MuiInputLabel-root.Mui-focused"] {
        color: var(--color-primary) !important;
      }
      [class*="MuiSelect-select"] {
        color: var(--color-foreground) !important;
      }
      [class*="MuiMenuItem-root"] {
        color: var(--color-foreground) !important;
        padding: 8px 12px !important;
        font-size: 0.8125rem !important;
      }
      [class*="MuiPaper-root"] {
        background-color: var(--color-card) !important;
        color: var(--color-foreground) !important;
        border-radius: 18px !important;
        box-shadow: 0 20px 44px rgba(34, 34, 46, 0.12) !important;
      }
      [class*="MuiCheckbox-root"] {
        color: var(--color-muted-foreground) !important;
        padding: 6px !important;
      }
      [class*="Mui-checked"] {
        color: var(--color-primary) !important;
      }
      [class*="MuiFormControlLabel-label"] {
        color: var(--color-foreground) !important;
        font-size: 0.8125rem !important;
      }
      [class*="MuiTypography-root"] {
        color: var(--color-foreground) !important;
      }
      [class*="MuiIconButton-root"] {
        color: var(--color-muted-foreground) !important;
      }
      .MuiButtonBase-root {
        color: var(--color-primary) !important;
        border-radius: 8px !important;
      }
      [class*="MuiFormControl-root"] {
        margin-bottom: 0.2rem !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
```

Replace the `style.textContent` value (keep the `useEffect` wrapper and `document.head` lifecycle as-is) with a token-driven version:

```tsx
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .jsonforms-group {
        margin-bottom: 1rem;
        padding: 1.1rem 1.15rem;
        border-radius: 24px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        box-shadow: 0 18px 40px var(--color-overlay), 0 2px 6px var(--color-overlay);
      }
      .jsonforms-group label {
        font-weight: 600;
        font-size: 0.88rem;
        margin-bottom: 0.9rem;
        display: block;
        color: var(--color-foreground);
      }
      .jsonforms-group .group-items {
        display: grid;
        gap: 0.65rem;
      }
      [class*="MuiInput-root"], [class*="MuiOutlinedInput"] {
        color: var(--color-foreground) !important;
        border-radius: 20px !important;
        background: var(--color-input) !important;
        box-shadow: inset 0 2px 4px var(--color-overlay) !important;
      }
      [class*="MuiInputBase-input"] {
        color: var(--color-foreground) !important;
        padding: 12px 14px !important;
        font-size: 0.88rem !important;
      }
      [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: transparent !important;
        border-radius: 20px !important;
      }
      [class*="MuiOutlinedInput-root"]:hover [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: transparent !important;
      }
      [class*="MuiOutlinedInput-root.Mui-focused"] [class*="MuiOutlinedInput-notchedOutline"] {
        border-color: var(--color-ring) !important;
        border-width: 1.5px !important;
      }
      [class*="MuiInputLabel-root"] {
        color: var(--color-muted-foreground) !important;
        font-size: 0.82rem !important;
      }
      [class*="MuiInputLabel-root.Mui-focused"] {
        color: var(--color-primary) !important;
      }
      [class*="MuiSelect-select"] {
        color: var(--color-foreground) !important;
      }
      [class*="MuiMenuItem-root"] {
        color: var(--color-foreground) !important;
        padding: 8px 12px !important;
        font-size: 0.8125rem !important;
      }
      [class*="MuiPaper-root"] {
        background-color: var(--color-surface) !important;
        color: var(--color-foreground) !important;
        border-radius: 18px !important;
        box-shadow: 0 20px 44px var(--color-overlay) !important;
      }
      [class*="MuiCheckbox-root"] {
        color: var(--color-muted-foreground) !important;
        padding: 6px !important;
      }
      [class*="Mui-checked"] {
        color: var(--color-primary) !important;
      }
      [class*="MuiFormControlLabel-label"] {
        color: var(--color-foreground) !important;
        font-size: 0.8125rem !important;
      }
      [class*="MuiTypography-root"] {
        color: var(--color-foreground) !important;
      }
      [class*="MuiIconButton-root"] {
        color: var(--color-muted-foreground) !important;
      }
      .MuiButtonBase-root {
        color: var(--color-primary) !important;
        border-radius: 8px !important;
      }
      [class*="MuiFormControl-root"] {
        margin-bottom: 0.2rem !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/editors/FormEditor.tsx
git commit -m "style: tokenize MUI override block in FormEditor

Replace hardcoded rgba/hex values in the injected style block
with var(--color-*) references. Light mode unchanged."
```

---

## Task 4: Add dark-mode token overrides

**Files:**
- Modify: `src/App.css` (add new `@media` block)

- [ ] **Step 1: Append the dark-mode override block**

Insert this block immediately after the `@theme { ... }` block (right before the `*` selector at what was originally line 29). The block overrides every token for dark mode.

```css
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;

    /* Core surfaces */
    --color-background: #1a1815;
    --color-background-2: #17150f;
    --color-surface: #221f1b;
    --color-surface-2: #2a2620;
    --color-foreground: #f2ece1;
    --color-muted-foreground: #a59b8b;
    --color-border: #332e27;
    --color-input: #221f1b;
    --color-overlay: rgba(0, 0, 0, 0.55);

    /* Elevation shadow scale — heavier in dark mode for parity */
    --shadow-elevation-1: 0 3px 6px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.25);
    --shadow-elevation-2: 0 10px 28px rgba(0, 0, 0, 0.45);
    --shadow-elevation-3: 0 14px 36px rgba(0, 0, 0, 0.55);
    --shadow-inset-1: inset 0 1px 3px rgba(0, 0, 0, 0.35);

    /* Legacy aliases */
    --color-card: #221f1b;
    --color-card-foreground: #f2ece1;
    --color-popover: #221f1b;
    --color-popover-foreground: #f2ece1;
    --color-secondary: #2a2620;
    --color-secondary-foreground: #f2ece1;
    --color-muted: #2a2620;
    --color-accent: #2a2620;
    --color-accent-foreground: #f2ece1;
    --color-sidebar: #221f1b;
    --color-sidebar-foreground: #c7bdac;
    --color-sidebar-accent: #2a2620;

    /* Primary + semantic (lightened for AA contrast on dark surfaces) */
    --color-primary: #4ba9d6;
    --color-primary-foreground: #0d1215;
    --color-ring: #4ba9d6;
    --color-danger: #ff6b62;
    --color-warning: #e5a43d;
    --color-success: #52c476;

    /* Tonal cards — dusty peach */
    --color-tone-peach-bg: #2f251a;
    --color-tone-peach-bg-2: #352a1e;
    --color-tone-peach-fg: #e8b781;
    --color-tone-peach-border: #3d2e1f;

    /* Tonal cards — deep jade */
    --color-tone-mint-bg: #1a2a1f;
    --color-tone-mint-bg-2: #1f3124;
    --color-tone-mint-fg: #8fd9a3;
    --color-tone-mint-border: #2a3d30;

    /* Tonal cards — navy */
    --color-tone-blue-bg: #1a2333;
    --color-tone-blue-bg-2: #1f2a3d;
    --color-tone-blue-fg: #92b8e8;
    --color-tone-blue-border: #2a3548;
  }

  /* Collapse the html/body gradient to a flat dark background */
  html,
  body,
  #root {
    background: var(--color-background);
  }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Manual visual verification**

Set macOS System Settings → Appearance → Dark.
Run: `npm run dev`
Visual check: The shell, sidebar, topbar, status bar, buttons, and tonal cards should all flip to warm dark. Embedded editors (Monaco, vanilla-jsoneditor, MUI form) will still be light — that's expected; they're wired in Task 5.

Set macOS appearance back to Light.
Visual check: The shell should return to the original warm light palette, visually indistinguishable from before Task 4.

- [ ] **Step 4: Verify WCAG AA contrast for primary text pairs**

Use browser devtools → pick the `body` foreground and background in each mode.
Expected pairs (light / dark) targeting ≥ 4.5:1:
- `#1c1917` on `#f9f6f1` (light body)
- `#f2ece1` on `#1a1815` (dark body)
- `#6b645b` on `#f9f6f1` (light muted)
- `#a59b8b` on `#1a1815` (dark muted)

If any pair falls short, nudge the foreground lighter (dark mode) or darker (light mode) in `src/App.css` and rebuild.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/App.css
git commit -m "feat: add prefers-color-scheme dark mode palette

Override every CSS variable under @media (prefers-color-scheme: dark)
with a warm-dark palette (warm charcoal surfaces, warm off-white
text, muted tonal cards). Set color-scheme: dark for native controls.
Shell chrome now follows system theme; embedded editor libraries
still pending in the next commit."
```

---

## Task 5: Add `useSystemTheme` hook with failing test

**Files:**
- Create: `src/lib/theme/useSystemTheme.ts`
- Create: `src/lib/theme/useSystemTheme.test.ts`

- [ ] **Step 1: Create the test directory and write the failing test first**

Run: `mkdir -p src/lib/theme`

Create `src/lib/theme/useSystemTheme.test.ts`:

```ts
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSystemTheme } from "./useSystemTheme";

type MediaQueryListener = (event: MediaQueryListEvent) => void;

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<MediaQueryListener>();
  const mql = {
    matches: initial,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: string, listener: MediaQueryListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaQueryListener) => {
      listeners.delete(listener);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  } as unknown as MediaQueryList & {
    setMatches: (value: boolean) => void;
  };

  (mql as unknown as { setMatches: (value: boolean) => void }).setMatches = (value: boolean) => {
    (mql as unknown as { matches: boolean }).matches = value;
    listeners.forEach((listener) =>
      listener({ matches: value } as MediaQueryListEvent)
    );
  };

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mql)
  );
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => mql),
  });

  return mql as MediaQueryList & { setMatches: (value: boolean) => void };
}

describe("useSystemTheme", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "";
    document.documentElement.classList.remove("jse-theme-dark");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 'light' when the media query does not match", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useSystemTheme());
    expect(result.current).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.classList.contains("jse-theme-dark")).toBe(false);
  });

  it("returns 'dark' when the media query matches", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useSystemTheme());
    expect(result.current).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("jse-theme-dark")).toBe(true);
  });

  it("updates when the system preference changes", () => {
    const mql = stubMatchMedia(false);
    const { result } = renderHook(() => useSystemTheme());
    expect(result.current).toBe("light");

    act(() => {
      mql.setMatches(true);
    });

    expect(result.current).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("jse-theme-dark")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/theme/useSystemTheme.test.ts`
Expected: FAIL — module `./useSystemTheme` not found.

- [ ] **Step 3: Create the hook implementation**

Create `src/lib/theme/useSystemTheme.ts`:

```ts
import { useEffect, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark";

function getMediaQueryList(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia("(prefers-color-scheme: dark)");
}

function subscribe(onChange: () => void): () => void {
  const mql = getMediaQueryList();
  if (!mql) {
    return () => {};
  }
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): ThemeMode {
  return getMediaQueryList()?.matches ? "dark" : "light";
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

export function useSystemTheme(): ThemeMode {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("jse-theme-dark", theme === "dark");
  }, [theme]);

  return theme;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/theme/useSystemTheme.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: All tests pass (existing + new).

- [ ] **Step 6: Commit**

```bash
git add src/lib/theme/useSystemTheme.ts src/lib/theme/useSystemTheme.test.ts
git commit -m "feat: add useSystemTheme hook

Returns 'light' | 'dark' from prefers-color-scheme, subscribes
to changes via useSyncExternalStore, and syncs document root
dataset.theme and .jse-theme-dark class as a side-effect."
```

---

## Task 6: Wire `useSystemTheme` into App + editors

**Files:**
- Modify: `src/App.tsx:1-4` (imports) and the `App` function body
- Modify: `src/components/editors/RawEditor.tsx:1-10` (imports) and `:88` (Monaco `theme` prop)
- Modify: `src/components/editors/DiffViewer.tsx:1-10` (imports) and `:44` (Monaco `theme` prop)
- Modify: `src/components/editors/FormEditor.tsx:1-5` (imports) and the `return` block to wrap `<JsonForms>` in `<ThemeProvider>`

- [ ] **Step 1: Wire the hook into `App.tsx`**

Current top of `src/App.tsx` (lines 1-29):

```tsx
import { useEffect, useCallback, useMemo } from "react";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useAppStore } from "@/lib/state/store";
import { detectFormat, getFileName, parseContent, supportsStructuredEditing, supportsVisualEditing } from "@/lib/parse";
import { getDataSections } from "@/lib/schema";
import type { OpenFile } from "@/types";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { ModeTabs } from "@/components/layout/ModeTabs";
import { StatusBar } from "@/components/layout/StatusBar";
import { WelcomeScreen } from "@/components/layout/WelcomeScreen";
import { FileOpener } from "@/components/file/FileOpener";
import { SaveControls } from "@/components/file/SaveControls";
import { FormEditor } from "@/components/editors/FormEditor";
import { RawEditor } from "@/components/editors/RawEditor";
import { StructureEditor } from "@/components/editors/StructureEditor";
import { DiffViewer } from "@/components/editors/DiffViewer";

function App() {
  const {
    currentFile,
    configData,
    configRootKind,
    editorMode,
    activeSection,
    setActiveSection,
  } = useAppStore();
```

Add the import on a new line after the `@/lib/utils` import and call the hook at the top of the `App` function body. Replace the block above with:

```tsx
import { useEffect, useCallback, useMemo } from "react";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useAppStore } from "@/lib/state/store";
import { detectFormat, getFileName, parseContent, supportsStructuredEditing, supportsVisualEditing } from "@/lib/parse";
import { getDataSections } from "@/lib/schema";
import type { OpenFile } from "@/types";
import { cn } from "@/lib/utils";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";
import { Sidebar } from "@/components/layout/Sidebar";
import { ModeTabs } from "@/components/layout/ModeTabs";
import { StatusBar } from "@/components/layout/StatusBar";
import { WelcomeScreen } from "@/components/layout/WelcomeScreen";
import { FileOpener } from "@/components/file/FileOpener";
import { SaveControls } from "@/components/file/SaveControls";
import { FormEditor } from "@/components/editors/FormEditor";
import { RawEditor } from "@/components/editors/RawEditor";
import { StructureEditor } from "@/components/editors/StructureEditor";
import { DiffViewer } from "@/components/editors/DiffViewer";

function App() {
  useSystemTheme();

  const {
    currentFile,
    configData,
    configRootKind,
    editorMode,
    activeSection,
    setActiveSection,
  } = useAppStore();
```

The hook is called for its DOM side-effects (`data-theme`, `.jse-theme-dark`); the returned value is not used here.

- [ ] **Step 2: Wire Monaco theme in `RawEditor.tsx`**

Current top of `src/components/editors/RawEditor.tsx` (lines 1-17) and the Monaco JSX at line 83-99:

```tsx
import { lazy, Suspense, useCallback } from "react";
import { useAppStore } from "@/lib/state/store";
import { parseContent, supportsStructuredEditing } from "@/lib/parse";

const MonacoEditor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.default })));

export function RawEditor() {
  const {
    rawContent,
    setRawContent,
    setConfigData,
    setConfigRootKind,
    setDirty,
    originalContent,
    currentFile,
    setValidationErrors,
  } = useAppStore();
```

Add the import and hook call. Replace imports + component top with:

```tsx
import { lazy, Suspense, useCallback } from "react";
import { useAppStore } from "@/lib/state/store";
import { parseContent, supportsStructuredEditing } from "@/lib/parse";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";

const MonacoEditor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.default })));

export function RawEditor() {
  const theme = useSystemTheme();
  const {
    rawContent,
    setRawContent,
    setConfigData,
    setConfigRootKind,
    setDirty,
    originalContent,
    currentFile,
    setValidationErrors,
  } = useAppStore();
```

Then replace the `theme="vs"` line in the `<MonacoEditor>` JSX. Current:

```tsx
          <MonacoEditor
            height="100%"
            defaultLanguage={editorLanguage}
            value={rawContent}
            onChange={handleChange}
            theme="vs"
            options={{
```

Replace with:

```tsx
          <MonacoEditor
            height="100%"
            defaultLanguage={editorLanguage}
            value={rawContent}
            onChange={handleChange}
            theme={theme === "dark" ? "vs-dark" : "vs"}
            options={{
```

- [ ] **Step 3: Wire Monaco theme in `DiffViewer.tsx`**

Current top of `src/components/editors/DiffViewer.tsx` (lines 1-10):

```tsx
import { lazy, Suspense } from "react";
import { useAppStore } from "@/lib/state/store";

const MonacoDiffEditor = lazy(() =>
  import("@monaco-editor/react").then((m) => ({ default: m.DiffEditor }))
);

export function DiffViewer() {
  const { originalContent, rawContent, currentFile } = useAppStore();
```

Replace with:

```tsx
import { lazy, Suspense } from "react";
import { useAppStore } from "@/lib/state/store";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";

const MonacoDiffEditor = lazy(() =>
  import("@monaco-editor/react").then((m) => ({ default: m.DiffEditor }))
);

export function DiffViewer() {
  const theme = useSystemTheme();
  const { originalContent, rawContent, currentFile } = useAppStore();
```

Then replace the `theme="vs"` line in the `<MonacoDiffEditor>` JSX. Current:

```tsx
          <MonacoDiffEditor
            height="100%"
            original={originalContent}
            modified={rawContent}
            language={editorLanguage}
            theme="vs"
            options={{
```

Replace with:

```tsx
          <MonacoDiffEditor
            height="100%"
            original={originalContent}
            modified={rawContent}
            language={editorLanguage}
            theme={theme === "dark" ? "vs-dark" : "vs"}
            options={{
```

- [ ] **Step 4: Wrap `FormEditor.tsx` in a MUI ThemeProvider**

Current top of `src/components/editors/FormEditor.tsx` (lines 1-6):

```tsx
import { JsonForms } from "@jsonforms/react";
import { materialCells, materialRenderers } from "@jsonforms/material-renderers";
import { useAppStore } from "@/lib/state/store";
import { buildSchemaFromData, buildUiSchemaFromData, getDataSections } from "@/lib/schema";
import { useEffect, useCallback, useMemo } from "react";

export function FormEditor() {
```

Replace with:

```tsx
import { JsonForms } from "@jsonforms/react";
import { materialCells, materialRenderers } from "@jsonforms/material-renderers";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useAppStore } from "@/lib/state/store";
import { buildSchemaFromData, buildUiSchemaFromData, getDataSections } from "@/lib/schema";
import { useSystemTheme } from "@/lib/theme/useSystemTheme";
import { useEffect, useCallback, useMemo } from "react";

export function FormEditor() {
  const themeMode = useSystemTheme();
  const muiTheme = useMemo(
    () => createTheme({ palette: { mode: themeMode } }),
    [themeMode]
  );
```

The `@mui/material/styles` module is already available because `@jsonforms/material-renderers` depends on it — no package.json change needed.

Then update the bottom of the component. Current `return` block (lines 134-150):

```tsx
  return (
    <div className="editor-scroll-shell">
      <div className="editor-form-wrap">
        <JsonForms
          schema={schema}
          uischema={uischema}
          data={configData}
          renderers={materialRenderers}
          cells={materialCells}
          onChange={handleChange}
        />
        {sections.length === 0 && (
          <div className="editor-empty-card">No top-level fields available</div>
        )}
      </div>
    </div>
  );
```

Replace with:

```tsx
  return (
    <ThemeProvider theme={muiTheme}>
      <div className="editor-scroll-shell">
        <div className="editor-form-wrap">
          <JsonForms
            schema={schema}
            uischema={uischema}
            data={configData}
            renderers={materialRenderers}
            cells={materialCells}
            onChange={handleChange}
          />
          {sections.length === 0 && (
            <div className="editor-empty-card">No top-level fields available</div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
```

- [ ] **Step 5: Verify `@mui/material/styles` is resolvable**

Run: `ls node_modules/@mui/material/styles/index.js 2>/dev/null && echo OK || echo MISSING`
Expected: `OK`. Confirms that `@mui/material` is installed transitively via `@jsonforms/material-renderers`.

If the output is `MISSING`, add MUI explicitly before continuing:

```bash
npm install @mui/material @emotion/react @emotion/styled
```

Otherwise skip the install. Then run `npx tsc --noEmit` to confirm the `ThemeProvider` / `createTheme` imports type-check:

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: Build succeeds. TypeScript compiles cleanly.

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: All tests pass. The existing ModeTabs / Sidebar / SaveControls tests should be unaffected because the hook only touches `document.documentElement`, not any rendered component under test.

- [ ] **Step 8: Manual verification in both modes**

Set macOS System Settings → Appearance → Dark.
Run: `npm run dev`
Open a sample JSON file (e.g. `src-tauri/tauri.conf.json`).
Check each mode:
  - **Form** tab: MUI inputs render with dark backgrounds and light text. No white-on-white.
  - **Structure** tab: vanilla-jsoneditor renders with dark surface, readable text. The `.jse-theme-dark` class is active on `<html>`.
  - **Raw** tab: Monaco uses `vs-dark`, dark editor background, light code text.
  - **Diff** tab: Monaco diff uses `vs-dark`, both sides dark.

Flip macOS appearance to Light (without restarting dev server).
Check each mode again:
  - All four editors flip to light themes without requiring a page reload. The `.jse-theme-dark` class is removed from `<html>`.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/components/editors/RawEditor.tsx src/components/editors/DiffViewer.tsx src/components/editors/FormEditor.tsx
git commit -m "feat: sync Monaco/JSE/MUI editors with system theme

Call useSystemTheme in App.tsx for DOM side-effects. Pass
Monaco vs/vs-dark theme in RawEditor and DiffViewer. Wrap
JsonForms in a MUI ThemeProvider that mirrors the hook's mode.
Fixes white-on-white when macOS is in dark mode."
```

---

## Task 7: Final verification

**Files:** none

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 2: Full test suite (web)**

Run: `npm run test:web`
Expected: All Vitest tests pass.

- [ ] **Step 3: Full test suite (Rust)**

Run: `npm run test:rust`
Expected: All cargo tests pass. This should be unaffected by the change but is part of the project's `npm test` suite.

- [ ] **Step 4: Inspect git log**

Run: `git log --oneline -10`
Expected: A tidy sequence of commits — `expand theme tokens`, `sweep App.css`, `tokenize MUI overrides`, `add dark palette`, `add useSystemTheme hook`, `sync editors with system theme`.

- [ ] **Step 5: Visual smoke test**

Run: `npm run dev`
Manual steps:
1. Open the app in light mode. Confirm every surface renders correctly (topbar, sidebar, welcome screen, file chip, status pill, tonal cards).
2. Open a JSON file, cycle through Form / Structure / Raw / Diff. Confirm text is readable in all four modes.
3. Flip macOS to dark mode without closing the app. Confirm every surface flips within one frame, no white-on-white anywhere, tonal cards render as warm dusty amber / deep jade / navy.
4. Open a TOML or YAML file (raw mode only). Confirm Monaco flips.

- [ ] **Step 6: No commit for this task**

This task is a verification gate, not a code change.
