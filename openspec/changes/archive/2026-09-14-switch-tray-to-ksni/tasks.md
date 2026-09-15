## 1. Dependencies and Tauri surface

- [x] 1.1 Add `ksni` (blocking) to `src-tauri/Cargo.toml`, drop `tauri` feature `tray-icon`, remove the `oioi555/tray-icon` `[patch.crates-io]` entry, run `cargo update -p ksni` as needed, and verify `cargo tree -p tray-icon` is gone and `cargo tree -p ksni` resolves.
- [x] 1.2 Remove `core:tray:default` from `src-tauri/capabilities/default.json`. Keep `core:menu:default` only if JS still builds Tauri menus; otherwise remove it. Verify the capability JSON still parses (`bun tauri --help` or schema is valid).

## 2. ksni tray host

- [x] 2.1 Replace `src-tauri/src/tray.rs` Tauri `TrayIconBuilder` with a `ksni` StatusNotifierItem: static app icon pixmap, `activate` → `panel::show_panel`, focused context menu (Overview / Timeline / Settings / About Quotracker / Quit). Verify `rtk cargo clippy --lib` and `cargo fmt --check`.
- [x] 2.2 Add `set_tray_tooltip` command, store the ksni `Handle`, register it in `generate_handler!`. Verify `rtk cargo test --lib` still passes (existing tests plus any new tooltip/handle unit tests that fit).

## 3. Frontend tooltip path

- [x] 3.1 Point `backend.ts` / `tray-controller` at `set_tray_tooltip` instead of `TrayIcon.getById`. Drop unused `TrayIcon` exports if nothing else needs them. Verify `backend.contract.test.ts` and tray-controller tests.

## 4. Packaging

- [x] 4.1 Remove `libayatana-appindicator` from `src-tauri/tauri.conf.json` deb depends, `aur/PKGBUILD` depends, README apt/pacman lists, and CI/publish apt install lines. Verify those files no longer mention ayatana/appindicator.

## 5. Validation

- [x] 5.1 Run `bun run test`, `bun run typecheck`, `rtk cargo test --lib`, and `openspec validate switch-tray-to-ksni --strict`. All green.
- [x] 5.2 Manual check on KDE: left-click shows/focuses the window (no menu), right-click menu works including Quit, tooltip updates after a probe, `ldd` on the binary does not list libayatana-appindicator.
