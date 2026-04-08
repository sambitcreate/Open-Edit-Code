# Contributing to Config Studio

Thanks for your interest. Here's how to get set up and contribute.

---

## Prerequisites

- **Node.js** 20+
- **Rust** toolchain via [rustup](https://rustup.rs)
- **Tauri system dependencies** — [platform prerequisites](https://v2.tauri.app/start/prerequisites/)

On macOS, install Xcode Command Line Tools if you haven't:

```bash
xcode-select --install
```

---

## Setup

```bash
git clone https://github.com/sambitcreate/Open-Edit-Code.git
cd Open-Edit-Code
npm install
```

---

## Development workflow

Start the dev server:

```bash
npm run tauri -- dev
```

The Vite frontend reloads on save. Rust changes require a restart.

---

## Tests

```bash
npm test           # full suite (web + Rust)
npm run test:web   # Vitest (React, lib, parsing, state)
npm run test:rust  # cargo test (file ops, backup, validation)
```

All tests must pass before opening a PR.

---

## Project layout

```
src/components/    UI panels and controls
src/lib/           App logic — parsing, validation, state, preferences
src/types/         Shared TypeScript types
src-tauri/src/     Rust commands for file I/O, backup, and atomic save
```

Key files:

| File | Purpose |
|---|---|
| `src/lib/state/store.ts` | Central Zustand store |
| `src/lib/parse/` | Format detection and parsing |
| `src/lib/preferences/index.ts` | Settings normalization |
| `src-tauri/src/commands.rs` | All Tauri commands exposed to the frontend |

---

## Submitting changes

1. Fork the repo and create a branch from `main`.
2. Make your changes with tests where appropriate.
3. Run `npm test` — all tests must pass.
4. Open a pull request with a clear description of what changed and why.

---

## Guidelines

- Keep the Rust save pipeline safe: backup before write, atomic rename, never silently corrupt.
- Prefer editing existing files over adding new ones.
- Don't add error handling for scenarios that can't happen.
- Match the existing code style — no linter is enforced, but consistency matters.

---

## License

By contributing, you agree your contributions are licensed under the [Apache 2.0 License](LICENSE).
