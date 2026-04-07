# Open Edit Code

Open Edit Code is a desktop configuration editor built with Tauri, React, and TypeScript. It opens local config files, parses them on-device, and lets you inspect or edit content through multiple views aimed at structured configuration work.

## Current Capabilities

- Open local `json`, `jsonc`, `yaml`, `yml`, and `toml` files through the native file picker
- Parse JSON and JSONC content into editable in-memory state
- Switch between form, structure, raw, and diff-oriented editor modes
- Save changes back to disk through the Tauri backend
- Create timestamped backups before overwriting an existing file
- Restore from saved backup files through the Rust command layer

## Stack

- Tauri 2 for the desktop shell and native file operations
- React 19 + TypeScript for the UI
- Zustand for app state
- JSON Forms + Material renderers for schema-driven editing
- Vite for local development and builds

## Project Structure

```text
src/          React UI, editor components, parsing, validation, and state
src-tauri/    Rust commands, Tauri config, and desktop packaging assets
public/       Static frontend assets
```

## Development

Prerequisites:

- Node.js 20+
- Rust toolchain
- Tauri system dependencies for your platform

Commands:

```bash
npm install
npm run dev
npm run build
npm run tauri -- dev
```

## Notes

- YAML and TOML detection already exists, but full parsing support is still marked as coming soon in the frontend parser.
- The Tauri backend currently exposes `open_file`, `save_file`, `list_backups`, `restore_backup`, and `validate_json`.
