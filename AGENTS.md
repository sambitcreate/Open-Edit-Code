# AGENTS.md

## Purpose

This repository contains a Tauri desktop app for editing local configuration files through structured and raw views.

## Tech Summary

- Frontend: React 19, TypeScript, Vite
- Desktop shell: Tauri 2
- State: Zustand
- Form rendering: JSON Forms with Material renderers
- Native layer: Rust in `src-tauri/`

## Working Rules

- Keep generated output and dependency folders out of commits.
- Prefer small, reviewable commits with direct commit messages.
- Use `apply_patch` for targeted edits when working through Codex.
- Preserve the current visual language unless a task explicitly asks for redesign.
- Avoid destructive Git commands unless the user explicitly asks for them.

## Useful Commands

```bash
npm run dev
npm run build
npm run tauri -- dev
```

## Areas To Check Before Editing

- `src/App.tsx` for app shell flow and keyboard shortcuts
- `src/lib/state/store.ts` for shared UI state
- `src/lib/parse/index.ts` for file-format detection and parsing behavior
- `src-tauri/src/commands.rs` for file IO, backups, and validation commands
