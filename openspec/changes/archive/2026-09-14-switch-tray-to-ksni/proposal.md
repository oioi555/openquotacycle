## Why

Linux tray clicks still go through libayatana-appindicator, patched via the `oioi555/tray-icon` fork, because that GTK backend never connected SNI `Activate`. Plasma already speaks StatusNotifierItem; ksni implements that protocol directly. The fork tracks Tauri's tray-icon 0.24 line and cannot take upstream tray-icon 0.25 (muda 0.20, renamed features). Quotracker is Linux-only, so the tray can leave Tauri's tray-icon crate.

## What Changes

- Replace the Tauri `TrayIcon` / libayatana path with a `ksni` StatusNotifierItem on Linux.
- Keep the static app icon and UI-driven tooltip, and expose a focused right-click menu (Overview / Timeline / Settings / About Quotracker / Quit).
- Drop `[patch.crates-io]` `oioi555/tray-icon` and the `tauri` `tray-icon` feature.
- **BREAKING** (packaging): remove `libayatana-appindicator` from Arch/deb runtime depends. GTK3/WebKitGTK remain for the window.
- Activation raise/toggle behavior is out of scope; a follow-up change will handle it.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `linux-window`: status-icon activation is the SNI `Activate` path (left-click shows/focuses the window); the tray is a StatusNotifierItem implemented with ksni, not libayatana/libappindicator.
- `arch-packaging`: the Arch package no longer depends on `libayatana-appindicator`.

## Impact

- `src-tauri/src/tray.rs`, `src-tauri/src/lib.rs` (handler + setup), `src-tauri/Cargo.toml` / `Cargo.lock`
- Frontend tray handle: `src/svelte/lib/backend.ts`, `src/svelte/controllers/tray-controller.svelte.ts` (+ contract tests)
- `src-tauri/capabilities/default.json` (drop `core:tray` / unused `core:menu` if menus move off Tauri)
- `src-tauri/tauri.conf.json` deb depends, `aur/PKGBUILD`, README/CI apt lists
- New crate: `ksni`. Remove git patch of `tray-icon`.
