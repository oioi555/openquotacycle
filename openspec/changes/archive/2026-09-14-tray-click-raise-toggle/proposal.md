## Why

Tray left-click already reaches SNI `Activate`, but an already-open window stays behind other apps. Tauri `set_focus` maps to GTK `present_with_time(GDK_CURRENT_TIME)` (timestamp 0). KWin treats that as unsolicited and refuses to raise. Electron apps raise because Chromium sends `_NET_ACTIVE_WINDOW` with a real X timestamp, and on Wayland they (or Plasma) use `xdg_activation_v1`. Plasma already calls `ProvideXdgActivationToken` immediately before `Activate`; ksni 0.3.6 dropped that method on the floor.

This is also a tray app: when the window is already the focused front window, a left-click should tuck it away (hide to tray, same as the close button), not no-op.

## What Changes

- Implement `ProvideXdgActivationToken` on the ksni tray and pass the token to `gtk_window_set_startup_id` before presenting.
- On X11, present with `gdk_x11_get_server_time` instead of timestamp 0.
- Left-click toggles: if the window is visible, unminimized, and focused, hide it (not WM minimize); otherwise show and raise.
- Menu items that restore the window still always show/raise (they consume the same token).
- Global shortcut keeps using the same toggle (visible+focused → hide).

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `linux-window`: status-icon left-click toggles visibility; restore from a covered or hidden window must raise and focus using the SNI activation token / X11 server time.

## Impact

- `src-tauri/vendor/ksni` (local patch)
- `src-tauri/src/panel.rs`, `src-tauri/src/tray.rs`, `src-tauri/Cargo.toml`
