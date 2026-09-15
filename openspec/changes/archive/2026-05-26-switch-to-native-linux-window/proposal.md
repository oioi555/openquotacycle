# Refactor: Switch to native Linux window

## Why

Tuxmeter behaves like a custom tray panel: hidden at startup, undecorated, non-resizable, manually positioned near the tray icon, auto-hidden on focus loss, and resized from frontend content height. The panel/overlay behavior fights Linux desktop conventions. Frameless transparent panel windows are hard to resize, position, focus, and show reliably from the status icon across tray implementations.

## What Changes

Use a normal decorated, resizable, visible Linux window. Simplify tray/status-icon activation to show and focus the main window. Remove panel positioning, auto-hide, transparent arrow chrome, frontend window resizing, and related Tauri commands/tests.

## Benefits

- Matches standard Linux window manager behavior
- Fixes status-icon activation paths that cannot provide reliable tray geometry
- Restores normal resize/focus/taskbar semantics
- Removes fragile panel-specific code across Rust and React

## Risks

This intentionally removes panel auto-hide and tray-positioned popup behavior. The trade-off is accepted to prefer reliable native Linux window semantics.
