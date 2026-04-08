# Dark Mode + Color Audit

**Date:** 2026-04-08
**Status:** Approved for implementation

## Problem

1. The app has no dark mode. When macOS is in dark mode, embedded editor libraries (notably `vanilla-jsoneditor` in `StructureEditor.tsx`, and parts of Material UI used by `FormEditor.tsx`) auto-detect the system preference and flip to dark internally, while the surrounding app shell stays hard-coded light. Result: white text on white backgrounds in several places the user experiences as "can't see things properly".
2. Even in light mode, a large number of colors are hardcoded (hex, rgba) in `src/App.css` and in the injected MUI style block in `src/components/editors/FormEditor.tsx`. This makes any coordinated theming impossible and is inconsistent with the recent WCAG AA contrast effort (commits `016383b`..`9d5cd48`).

## Goals

- Introduce a dark theme that activates automatically from `prefers-color-scheme: dark`. No user-facing toggle, no persistence.
- Centralize all color usage behind CSS custom properties defined via Tailwind v4's `@theme` directive.
- Fix the white-on-white failures in the three embedded editor libraries (Monaco, vanilla-jsoneditor, Material UI via JSON Forms) so they follow the system theme in lockstep with the rest of the app.
- Preserve WCAG AA contrast ratios in both light and dark palettes, consistent with the existing contrast commit trail.
- Preserve the current "soft" visual language of the light theme and introduce a warm-dark palette — backgrounds closer to `#1a1815`, slightly warm-tinted surfaces, warm off-white text — for the dark theme.

## Non-Goals

- A user-facing theme toggle, localStorage persistence, or a "system / light / dark" tri-state control.
- Changes to the shape, spacing, or layout of any component beyond color.
- Restyling JSON Forms' field layouts or Material UI's component shapes. Only palette changes.
- Customizing Monaco syntax highlighting beyond switching between the built-in `vs` and `vs-dark` themes.
- Any changes to Rust code in `src-tauri/`.

## Design

### Token strategy

Tailwind v4's `@theme { ... }` block compiles to `:root { --color-…: … }`. We keep that block as the light-mode source of truth, and add a second `@media (prefers-color-scheme: dark)` block that overrides the same variables on `:root`.

```css
/* src/App.css */
@theme {
  /* LIGHT palette */
  --color-background: #f9f6f1;      /* warm off-white */
  --color-surface:    #ffffff;      /* cards, panels */
  --color-surface-2:  #f4efe7;      /* elevated / inset */
  --color-foreground: #1c1917;
  --color-muted-foreground: #6b645b;
  --color-border:     #e8e2d6;
  --color-input:      #ffffff;
  --color-overlay:    rgba(28, 25, 23, 0.45);

  --color-primary: #0077a8;
  --color-primary-foreground: #ffffff;
  --color-ring:    #0077a8;

  --color-danger:  #cc2d24;
  --color-warning: #b36800;
  --color-success: #1a7a30;

  /* Tonal cards (peach / mint / blue) — split into bg + fg + border */
  --color-tone-peach-bg:     #fff3e3;
  --color-tone-peach-bg-2:   #fde9cf;
  --color-tone-peach-fg:     #8a5520;
  --color-tone-peach-border: #f1dcbc;

  --color-tone-mint-bg:      #d8f6df;
  --color-tone-mint-bg-2:    #c7efd1;
  --color-tone-mint-fg:      #1a7a34;
  --color-tone-mint-border:  #b7e6c1;

  --color-tone-blue-bg:      #e4f1ff;
  --color-tone-blue-bg-2:    #d2e7ff;
  --color-tone-blue-fg:      #1a56b8;
  --color-tone-blue-border:  #c6ddf8;

  /* Elevation — single token, different values per theme */
  --shadow-elevation-1: 0 3px 6px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02);
  --shadow-elevation-2: 0 10px 28px rgba(28,28,30,0.06);
  --shadow-elevation-3: 0 14px 36px rgba(28,28,30,0.06);
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;

    --color-background: #1a1815;   /* warm charcoal */
    --color-surface:    #221f1b;
    --color-surface-2:  #2a2620;
    --color-foreground: #f2ece1;   /* warm off-white */
    --color-muted-foreground: #a59b8b;
    --color-border:     #332e27;
    --color-input:      #221f1b;
    --color-overlay:    rgba(0, 0, 0, 0.6);

    --color-primary: #4ba9d6;      /* lightened for 4.5:1 */
    --color-primary-foreground: #0d1215;
    --color-ring:    #4ba9d6;

    --color-danger:  #ff6b62;
    --color-warning: #e5a43d;
    --color-success: #52c476;

    --color-tone-peach-bg:     #2f251a;
    --color-tone-peach-bg-2:   #352a1e;
    --color-tone-peach-fg:     #e8b781;
    --color-tone-peach-border: #3d2e1f;

    --color-tone-mint-bg:      #1a2a1f;
    --color-tone-mint-bg-2:    #1f3124;
    --color-tone-mint-fg:      #8fd9a3;
    --color-tone-mint-border:  #2a3d30;

    --color-tone-blue-bg:      #1a2333;
    --color-tone-blue-bg-2:    #1f2a3d;
    --color-tone-blue-fg:      #92b8e8;
    --color-tone-blue-border:  #2a3548;

    --shadow-elevation-1: 0 3px 6px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25);
    --shadow-elevation-2: 0 10px 28px rgba(0,0,0,0.45);
    --shadow-elevation-3: 0 14px 36px rgba(0,0,0,0.55);
  }
}
```

All values are tuned to WCAG AA (4.5:1 for normal text, 3:1 for non-text). The contrast targets match the rigor of the recent `016383b`..`9d5cd48` commit trail. Final per-pair contrast verification happens during implementation, not at design time — values above are the starting point and may shift slightly up or down to hit the ratio.

Setting `color-scheme: dark` on `:root` ensures native scrollbars, form controls, and selection highlights flip along with the custom palette.

### The `useSystemTheme` hook

New file: `src/lib/theme/useSystemTheme.ts`.

```ts
import { useEffect, useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark";

const mediaQuery = () =>
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

function subscribe(onChange: () => void) {
  const mq = mediaQuery();
  if (!mq) return () => {};
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot(): ThemeMode {
  return mediaQuery()?.matches ? "dark" : "light";
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

export function useSystemTheme(): ThemeMode {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("jse-theme-dark", theme === "dark");
  }, [theme]);

  return theme;
}
```

Responsibilities:
- Return `'light' | 'dark'` via `useSyncExternalStore` so React re-renders on system change.
- As a side-effect, set `document.documentElement.dataset.theme` for any CSS that needs to target `[data-theme="dark"]` (specifically the Monaco/jse editor override block in `App.css`).
- Toggle the `.jse-theme-dark` class on `<html>`, which is the class `vanilla-jsoneditor` reads from any ancestor.

The hook is called once at the top of `App.tsx` (for the side-effects) and re-used in each editor component that needs the string value.

### Editor library integration

**Monaco** — `RawEditor.tsx:88`, `DiffViewer.tsx:44`:
```tsx
const theme = useSystemTheme();
<MonacoEditor theme={theme === "dark" ? "vs-dark" : "vs"} ... />
```

**vanilla-jsoneditor** — `StructureEditor.tsx`:
No direct prop change. The `.jse-theme-dark` class toggled on `<html>` by the hook is picked up automatically by jse, which styles its internals with CSS variables scoped to that class. The editor override block in `App.css:612` is split so that Monaco and jse backgrounds use `var(--color-surface)` in light mode and a dark-mode variant under `@media (prefers-color-scheme: dark)`. Menu/status-bar borders likewise use tokens.

**Material UI (via JSON Forms)** — `FormEditor.tsx`:
Wrap `<JsonForms>` in a MUI `ThemeProvider` with `createTheme({ palette: { mode: theme } })`. The existing inline style block (`FormEditor.tsx:28`) is rewritten to use `var(--color-*)` tokens — this means MUI's own internal components get their dark/light mode from the ThemeProvider, and the visual overrides follow the CSS variables. Hardcoded whites like `rgba(255,255,255,0.96)` for `MuiInput` backgrounds become `var(--color-input)`.

### App.css sweep

All hardcoded colors in `src/App.css` are replaced with tokens. Representative substitutions:

| Rule | Before | After |
|---|---|---|
| `html, body` background | `linear-gradient(180deg, #f9f9fb 0%, #f2f2f7 100%)` | `var(--color-background)` |
| `.app-topbar-panel` bg | `rgba(255, 255, 255, 0.82)` | `var(--color-surface)` + `var(--color-border)` |
| `.app-main` bg | `rgba(255, 255, 255, 0.88)` | `var(--color-surface)` |
| `.sidebar-shell` bg | `rgba(255, 255, 255, 0.88)` | `var(--color-surface)` |
| `.mode-tabs-shell` bg | `#f3f3f7` | `var(--color-surface-2)` |
| `.mode-tab-button-active` bg | `#ffffff` | `var(--color-surface)` |
| `.toolbar-button` bg gradient | `linear-gradient(180deg, #ffffff 0%, #f7f7f9 100%)` | `linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-2) 100%)` |
| `.file-chip`, `.status-pill` | `#f7f7fa` / `#ececf1` / `#5b5b62` | `var(--color-surface-2)` / `var(--color-border)` / `var(--color-muted-foreground)` |
| `.sidebar-item-peach` gradient | hardcoded peach gradient | `linear-gradient(180deg, var(--color-tone-peach-bg), var(--color-tone-peach-bg-2))` + `color: var(--color-tone-peach-fg)` |
| `.sidebar-item-mint` | same pattern | mint tokens |
| `.sidebar-item-blue` | same pattern | blue tokens |
| `.task-item-*` | same pattern | same tokens (class pairs already share values) |
| `.welcome-card` bg | `rgba(247, 247, 250, 0.96)` | `var(--color-surface-2)` |
| `.welcome-inset-card` bg | `#ffffff` | `var(--color-surface)` |
| `.welcome-drag-indicator` | `#d6d6db` | `var(--color-border)` |
| `.welcome-avatar` bg | `#ffffff` | `var(--color-surface)` |
| `.status-kbd` | `#ffffff` / `#ececf1` / `#5b5b62` | `var(--color-surface)` / `var(--color-border)` / `var(--color-muted-foreground)` |
| `.editor-panel-card` bg + overrides | hardcoded `#ffffff` / `#f7f7fa` / `#ececf1` | `var(--color-surface)` / `var(--color-surface-2)` / `var(--color-border)` |
| `.sidebar-footer` bg/border | `#f7f7fa` / `#ececf1` | `var(--color-surface-2)` / `var(--color-border)` |
| `.sidebar-title` color | `#5f5f66` | `var(--color-muted-foreground)` |
| `.task-text` color | `#1c1c1e` | `var(--color-foreground)` |
| `.status-pill-warning` color | `#915100` | derived from `--color-warning` (light) or `--color-warning-foreground` pair |
| All `box-shadow` values | literal `rgba(...)` | `var(--shadow-elevation-*)` |

Fallback inline shadows that don't fit the 3-tier elevation scale keep their literal rgba but get a dark-mode sibling rule.

### Component sweep

- `src/components/editors/FormEditor.tsx`: inline injected style block converted token-for-token. MUI `ThemeProvider` wraps the `<JsonForms>` render.
- `src/components/editors/RawEditor.tsx`, `DiffViewer.tsx`: consume `useSystemTheme()`, pass computed Monaco theme.
- `src/components/editors/StructureEditor.tsx`: no direct change — picks up the `.jse-theme-dark` class set by the hook's side-effect.
- `src/App.tsx`: call `useSystemTheme()` once at the top so the side-effect runs.
- No other components are changed. Any Tailwind utility referencing `text-danger`, `text-success`, `text-warning` already maps through the token via Tailwind v4 and automatically follows the theme.

## Implementation order (6 commits)

Ordered so every intermediate state is coherent in light mode; dark mode is "switched on" at commit 4, after the sweep has made all surfaces token-driven.

1. **Add tokens** — extend `@theme` with new tokens (`--color-surface`, `--color-surface-2`, `--color-overlay`, tonal split, `--shadow-elevation-*`). No behavior change; values are all current light-mode values.
2. **Sweep `App.css`** — replace all hardcoded hex/rgba with tokens. Single commit covering ~20 rules. Light mode looks identical; dark mode still inactive.
3. **Sweep `FormEditor.tsx` inline style** — tokenize the injected MUI overrides. Light mode still identical.
4. **Add dark-mode overrides** — `@media (prefers-color-scheme: dark) { :root { ... } }` block with tuned warm-dark values. Dark mode now works for all shell chrome; embedded editor libraries may still be out of sync.
5. **Add `useSystemTheme` hook + wire editors** — new file, Monaco theme flip in `RawEditor.tsx` + `DiffViewer.tsx`, MUI `ThemeProvider` in `FormEditor.tsx`, `.jse-theme-dark` class toggle via the hook, call the hook once in `App.tsx`.
6. **Verify** — run `npm run build` and `npm test`. Add a focused unit test for `useSystemTheme`.

## Testing

- `npm run build` must pass (Vite + TypeScript strict).
- `npm test` must pass existing Vitest suite (ModeTabs, Sidebar, SaveControls).
- New test: `src/lib/theme/useSystemTheme.test.ts` — stub `window.matchMedia` to return `{ matches: true }`, assert the hook returns `'dark'` and sets `document.documentElement.dataset.theme`. Stub a change event, assert the hook updates.
- Manual visual verification in both modes via `npm run dev` with system appearance flipped: open a JSON file, cycle through Form / Structure / Raw / Diff modes, verify no white-on-white, verify text contrast is visibly strong in both modes.
- `npm run tauri -- dev` smoke test in one mode to confirm the embedded app picks up the media query inside the Tauri webview.

## Risks & trade-offs

- **Tailwind v4 `@theme` override inside `@media`**: Tailwind v4 does not support nesting `@theme` inside `@media`. The design works around this by using a plain `:root` selector inside the media query, which overrides the CSS variables written by `@theme` normally through the cascade. This is the documented Tailwind v4 pattern.
- **MUI ThemeProvider churn**: adding a ThemeProvider in `FormEditor.tsx` introduces a new import surface. Mitigated by keeping it local to that one component. The mode follows `useSystemTheme()` so there's no state coordination risk.
- **Monaco theme flip jank**: Monaco re-renders when the `theme` prop changes. This is visibly a quick flash but is the same behavior every Monaco-in-React app has. Acceptable.
- **vanilla-jsoneditor dark class**: relies on the library's documented `.jse-theme-dark` selector. If a future version renames this class, the structure editor reverts to its auto-detected default, which is acceptable graceful degradation.
- **Contrast values**: the dark palette values above are a starting point. Each text/background pair must be verified against WCAG AA during implementation. If any pair falls short, the fix is to nudge the foreground lighter or the background darker — no structural change.
- **Body gradient**: the current light mode has a subtle `#f9f9fb → #f2f2f7` gradient on `html, body`. Light mode keeps a gradient expressed in tokens (`var(--color-background) → var(--color-surface-2)`). Dark mode collapses to a solid `var(--color-background)` — warm charcoal gradients look muddy and add no value.

## Out of scope (reiterated)

- User-facing theme toggle, persistence, or Cmd+Shift+L shortcut.
- Custom Monaco syntax color themes beyond `vs` / `vs-dark`.
- Restructuring JSON Forms field rendering.
- Any change to the Tauri Rust layer.
- Refactoring component structure or introducing new abstractions beyond `useSystemTheme`.
