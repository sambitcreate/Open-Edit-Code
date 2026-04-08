# Config Studio

A macOS desktop app for editing local config files without touching raw JSON.
Open a file, edit it through structured forms or a tree view, validate before saving, and restore from backups — all on-device.

> Built with Tauri 2, React 19, and TypeScript.

---

## Download

Grab the latest `.dmg` from [**Releases**](https://github.com/sambitcreate/Open-Edit-Code/releases).

Mount it, drag **Config Studio** to Applications, then right-click → **Open** the first time to clear Gatekeeper (the app is not yet notarized).

---

## What it does

| Feature | Details |
|---|---|
| **File formats** | JSON, JSONC, YAML, TOML (open/detect all; full parse/edit on JSON + JSONC) |
| **Form mode** | Schema-driven form UI — edit config like app preferences |
| **Structure mode** | JSON tree/table editor for nested data and bulk edits |
| **Raw mode** | Monaco-powered source editor with syntax highlighting |
| **Diff mode** | Side-by-side view of original vs. current changes |
| **Safe save** | Validates → backs up original → atomic write |
| **Backup & restore** | Timestamped backups per file; restore from the sidebar |
| **Recent files** | Quick reopen from the welcome screen |
| **Settings** | Font size, tab size, word wrap, line numbers, backup retention, default open mode, indent style, theme |

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+O` | Open a config file |
| `Cmd+S` | Save the current file |
| `Cmd+R` | Revert to last saved version |
| `Cmd+1` | Switch to Form mode |
| `Cmd+2` | Switch to Structure mode |
| `Cmd+3` | Switch to Raw mode |
| `Cmd+4` | Switch to Diff mode |
| `Cmd+F` | Find (in Raw and Diff editors) |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+,` | Open Settings |
| `?` | Open shortcut reference |
| `Esc` | Close dialogs and overlays |

---

## Project structure

```
src/                  React UI
  components/
    editors/          Form, Structure, Raw, Diff editor panels
    file/             File open, save, and status controls
    forms/            Schema-driven form renderers
    layout/           App shell, toolbar, settings, shortcuts overlay
  lib/
    parse/            JSON/JSONC/YAML/TOML detection and parsing
    schema/           JSON Schema inference
    validation/       AJV-based validation
    diff/             Diff computation
    state/            Zustand store
    preferences/      Settings normalization and persistence
    theme/            Light/dark theme resolution
  types/              Shared TypeScript types

src-tauri/            Rust backend
  src/
    commands.rs       Tauri commands: open, save, backup, restore, validate
    main.rs           App entry point
```

---

## Development

### Prerequisites

- **Node.js** 20+
- **Rust** toolchain — install via [rustup](https://rustup.rs)
- **Tauri system dependencies** — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform (macOS needs Xcode Command Line Tools)

### Setup

```bash
git clone https://github.com/sambitcreate/Open-Edit-Code.git
cd Open-Edit-Code
npm install
```

### Run in development

```bash
npm run tauri -- dev
```

This starts the Vite dev server and launches the Tauri window with hot reload.

### Run tests

```bash
npm test           # web + Rust tests
npm run test:web   # Vitest only
npm run test:rust  # cargo test only
```

### Build a release `.app` + `.dmg`

```bash
# Generate icons from a 1024x1024 source image
npx tauri icon path/to/icon.png

# Build
npm run tauri build
```

Output lands in `src-tauri/target/release/bundle/`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
