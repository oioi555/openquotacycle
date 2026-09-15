## Why

Closing the main window terminates the whole app, killing the tray icon and all background usage refresh with it. Real resident behavior (close = hide, app keeps running until Quit is chosen) is the baseline users expect from a tray app, and is the prerequisite for further 魔改造 work.

## What Changes

- Intercept main-window close: `CloseRequested` now hides the window instead of allowing app exit (all platforms).
- The app stays fully running while hidden: tray icon, menu, global shortcut, background refresh keep working.
- Tray menu already provides the required paths — "Show Stats" shows/focuses the window and "Quit" exits; no new menu items.
- Make the global-shortcut handler a true toggle: hide the window when it is visible, show it otherwise (currently it can only show).
- No changes to quit semantics: `quit` in the tray menu still calls `app_handle.exit(0)`, and no `ExitRequested` prevention is added.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `linux-window`: main-window close now hides the window and keeps the app resident; global shortcut toggles visibility instead of only showing.

## Impact

- `src-tauri/src/lib.rs`: add `.on_window_event` on the builder to prevent close and hide the main window.
- `src-tauri/src/panel.rs`: `toggle_panel` checks `is_visible()` before showing.
- `src-tauri/src/tray.rs`: no changes (left-click show and Quit menu already correct).
- Risk to verify during implementation: hidden-window timer throttling (WebKitGTK/WebView2/WKWebView) affecting background usage refresh while hidden.
