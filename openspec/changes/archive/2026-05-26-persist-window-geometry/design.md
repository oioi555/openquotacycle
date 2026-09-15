# Design: Persist window geometry

## Context

After switching from a fixed tray panel to a resizable native window, users can choose their preferred window size and position. That geometry should survive app restarts.

## Approach

Use Tauri's maintained `tauri-plugin-window-state` instead of implementing custom geometry persistence.

## Implementation Notes

- Add `tauri-plugin-window-state = "2"` to `src-tauri/Cargo.toml`.
- Initialize the plugin in the Tauri builder during app startup.
- Let the plugin manage its own storage format and restore behavior.
- Keep default geometry in `tauri.conf.json` as the first-launch fallback.

## Affected Files

- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/src/lib.rs`

## Non-Goals

- Custom geometry schema.
- UI controls for resetting saved window state.
- Manual migration of old panel size state.

## Risks

- Restored geometry can be stale if monitor layout changes; this is delegated to the Tauri plugin.
- Plugin initialization order must not conflict with existing plugins.

## Verification

- Run `cargo check`.
- Manually launch, resize/move, quit, and relaunch on Linux when doing desktop QA.
