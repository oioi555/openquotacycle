# Design: Switch to native Linux window

## Context

Tuxmeter previously implemented its main UI as a custom tray panel: hidden at startup, frameless, transparent, non-resizable, manually positioned near the tray icon, auto-hidden on focus loss, and resized from frontend content.

This is fragile on Linux because tray/status-icon implementations do not consistently provide click events or geometry, and window managers handle frameless popup-like windows differently.

## Approach

Make the main UI a standard Linux desktop window.

- Use native decorations.
- Make the window resizable.
- Show the window at startup.
- Use a normal default size.
- Treat tray/status-icon activation as “show and focus window”.
- Remove panel-only behaviors instead of preserving compatibility shims.

## Implementation Notes

### Rust

- Simplify `src-tauri/src/panel.rs` to locate, show, and focus the main window.
- Remove Tauri commands that only existed for panel lifecycle:
  - `init_panel`
  - `hide_panel`
- Change tray left-click handling to call `panel::show_panel` instead of toggling panel visibility or positioning near tray geometry.
- Update global shortcut text from panel toggling to window showing.

### Frontend

- Remove frontend-driven window sizing.
- Remove Escape-to-hide behavior.
- Remove focus-restoration logic specific to hidden panel reopening.
- Remove tray arrow and transparent panel styling.
- Keep navigation/about event handling.

### Configuration

- Update the main window in `tauri.conf.json` to be visible, decorated, resizable, opaque, and 900x700 by default.

## Affected Files

- `src-tauri/tauri.conf.json`
- `src-tauri/src/panel.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/tray.rs`
- `src-tauri/src/portal_shortcuts.rs`
- `src/hooks/app/use-panel.ts`
- `src/hooks/app/use-panel.test.ts`
- `src/components/app/app-shell.tsx`
- `src/components/side-nav.tsx`
- `src/components/side-nav.test.tsx`
- `src/App.test.tsx`
- `src/index.css`

## Non-Goals

- Recreate tray-positioned popup behavior.
- Keep auto-hide-on-focus-loss semantics.
- Add desktop-specific geometry fallbacks.

## Risks

- Users who expected tray-panel behavior will see a normal app window instead.
- Some tray implementations may still not deliver left-click events; the tray menu remains available.

## Verification

- Run frontend tests for panel, side nav, and app shell behavior.
- Run `cargo check` for removed command references.
