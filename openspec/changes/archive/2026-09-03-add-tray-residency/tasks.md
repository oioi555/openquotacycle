## 1. Close-to-hide (resident close)

- [x] 1.1 In `src-tauri/src/lib.rs`, add `.on_window_event` to the builder: on `WindowEvent::CloseRequested` for the window labeled `main`, call `api.prevent_close()` and `window.hide()`. Verify with `rtk cargo clippy` and `cargo fmt --check`.
- [x] 1.2 Manual check with `bun tauri dev`: closing the window with the WM close button hides it, the tray icon stays visible, and the process keeps running (e.g. `pgrep tuxmeter`).

## 2. Visibility toggle

- [x] 2.1 In `src-tauri/src/panel.rs`, change `toggle_panel` to hide the window when it is visible, and show/unminimize/focus it when hidden. `show_panel` stays show-only. Verify with `rtk cargo clippy`.
- [x] 2.2 Manual check with `bun tauri dev`: pressing the global toggle shortcut twice in a row hides the window, then shows and focuses it again.

## 3. Quit and geometry regressions

- [x] 3.1 Verify tray menu "Quit" fully exits the app: tray icon disappears and the process is gone; then relaunching restores the previously saved window geometry (window-state plugin still saves on real exit).

## 4. Background work while hidden

- [x] 4.1 With the window hidden past a refresh interval, confirm usage refresh still fires (tray icon / stored usage updates, visible in debug logs) and data is current after re-showing the window. If hidden-window throttling prevents it, stop and report instead of adding workarounds.

## 5. Final verification

- [x] 5.1 Run `bun run test` and `rtk cargo clippy` clean, then walk through the `linux-window` delta spec scenarios (close→hide, quit→exit, shortcut toggle) end to end.

## 6. Fixes from first manual test round

- [x] 6.1 In `src-tauri/src/panel.rs`, remember `outer_position()` before hide (skipped while maximized) in a module-level `Mutex<Option<(i32, i32)>>`, and re-apply it via `set_position` in `show_panel` after showing; call the remember helper from the close handler in `lib.rs`. Verify with `rtk cargo clippy` and `cargo fmt --check`.
- [x] 6.2 In `src-tauri/src/tray.rs`, add "Show Window" as the first tray menu item calling `panel::show_panel` (no navigation), since the libayatana backend never delivers tray click events on Linux and the menu is the only restore path there. Verify with `rtk cargo clippy`.
- [x] 6.3 Manual check: hide the window while it sits at the left screen edge, restore via the tray menu → the window reappears at the remembered position, not centered.

## 7. Tray left-click activation (tray-icon patch)

- [x] 7.1 Fork tray-icon v0.24.1 to `oioi555/tray-icon` (branch `tray-activate-linux`): connect the libayatana `activate` GObject signal and forward it as a left-button `TrayIconEvent::Click`; verified with `cargo check` in the fork.
- [x] 7.2 Add `[patch.crates-io]` to `src-tauri/Cargo.toml` pointing at the fork; verify `cargo tree -p tray-icon` resolves to `oioi555/tray-icon#tray-activate-linux` and `rtk cargo clippy --lib` passes with no new warnings.
- [x] 7.3 Manual check on KDE: left-clicking the tray icon now shows the main window (no context menu), and right-click still opens the tray menu.
