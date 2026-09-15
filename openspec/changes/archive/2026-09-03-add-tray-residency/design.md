## Context

`src-tauri/src/lib.rs` builds the app with `tauri::Builder::default()` and runs it with `.run(|_, _| {})` — no window-event handling exists, so Tauri's default applies: closing the last window exits the app and destroys the tray. Everything else needed for residency already exists: `panel::show_panel` (show/unminimize/focus), a tray left-click handler that calls it, and tray menu items "Show Stats" (show + navigate home) and "Quit" (`app_handle.exit(0)`). Window geometry is persisted by `tauri-plugin-window-state`.

## Goals / Non-Goals

**Goals:**
- Close = hide; app keeps running until the user explicitly quits via the tray menu.
- Global shortcut becomes a real visibility toggle.
- No regressions to geometry persistence or the quit path.

**Non-Goals:**
- No "close to tray" setting or preference UI — residency is always on (simplicity first).
- No moving background refresh to Rust-side timers unless hidden-window throttling is actually observed (see Risks).
- No single-instance handling for relaunch-while-resident.

## Decisions

- **Intercept close on the builder**: add `.on_window_event` handling `WindowEvent::CloseRequested` → `api.prevent_close()` + `window.hide()`, filtered to the `main` window label. This is the single integration point; `tray.rs` stays untouched.
  - Alternative: a per-window close listener registered in setup — more code, same effect.
- **All platforms, one code path**: macOS and Windows get the same close-to-hide behavior. Platform-conditional residency would add branches for no user value.
- **Quit stays exactly as-is**: no `RunEvent::ExitRequested` prevention, so `app_handle.exit(0)` from the tray menu and SIGTERM both still terminate the process. The app can never become unkillable from a bug in the hide path.
- **Toggle via `is_visible()`**: `panel::toggle_panel` shows when hidden (or minimized), hides when visible. The tray left-click handler keeps calling `show_panel` (click-to-show only, matching the existing `linux-window` spec).
- **Geometry persistence unchanged**: the window-state plugin saves on real exit (RunEvent::Exit), which still happens via tray Quit. Hide alone does not write state; restoring on next launch reads the last saved geometry. Verified in tasks.

### Revision (after first manual test round)

- **Tray left-click is dead code on Linux — confirmed**: the `tray-icon` crate's GTK/libayatana backend never connects to the appindicator `activate` signal and emits no `TrayIconEvent`s at all (verified in the crate source; the app log shows zero click events across its full history while menu events log fine). On this stack the tray **menu is the only click surface**. Therefore: add a plain "Show Window" item as the first menu entry (show/focus, no navigation). The `on_tray_icon_event` handler stays for Windows/macOS. The main `linux-window` spec's "Status icon activation" scenario only ever applies where the desktop actually delivers click events.
- **KWin re-places re-mapped windows (X11)**: `hide()` unmaps the X11 window; when it is mapped again, KWin applies its placement policy (centered), losing the pre-hide position. Fix: remember `outer_position()` in the close handler (skipped while maximized) and re-apply it with `set_position` after every show. On Wayland `set_position` is a client-side no-op, so this is harmless there.

### Revision 2 (tray left-click activation)

Plasma's source shows left click calls the SNI `Activate` DBus method unless `ItemIsMenu` is true — and libayatana doesn't even implement `ItemIsMenu` (so Plasma would send Activate), but libayatana emits the `activate` GObject signal only when a handler is connected and otherwise returns a DBus error explicitly so panels "fall back to showing the context menu" (the observed behavior). Decision (user choice B): patch `tray-icon` instead of replacing it with `ksni` — fork v0.24.1 to `oioi555/tray-icon` (branch `tray-activate-linux`), connect the `activate` signal, and forward it as a left-button `TrayIconEvent::Click`; wired in via `[patch.crates-io]`. This keeps tauri's dynamic tray-icon plumbing intact. The fork must track upstream `tray-icon` versions tauri depends on; revisited if tauri bumps the minor version.

## Risks / Trade-offs

- [Hidden-window timer throttling may delay JS-driven refresh ticks on some platforms (WKWebView/WebView2 throttle background windows; WebKitGTK generally does not)] → verify refresh fires while hidden on Linux during implementation; if throttling appears on other platforms, move the tick to Rust in a follow-up change rather than speculatively now.
- [Users may expect the X button to actually exit] → tray "Quit" is the documented exit; consistent with mainstream tray apps (Discord, Slack). Same trade-off those apps accept.
- [Second launch while resident opens a second instance] → out of scope; noted as follow-up candidate.

## Open Questions

None.
