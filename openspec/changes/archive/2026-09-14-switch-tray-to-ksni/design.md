## Context

See proposal.md for why. Today `tray::create` builds a Tauri `TrayIcon` (id `tray`) with a muda menu. Linux backend is tray-icon 0.24 + libayatana, patched from `oioi555/tray-icon#tray-activate-linux` so SNI `Activate` becomes a left-click event. The UI updates icon/tooltip through `@tauri-apps/api/tray` `TrayIcon.getById("tray")`.

Tauri 2.11.5 depends on tray-icon `0.24` with features `serde` + `gtk`, and muda `0.19`. Upstream tray-icon 0.25 adds a `ksni` feature that wins over libappindicator, but it needs muda 0.20 and dropped the `gtk` feature name. Patching 0.25 under Tauri 2.11 does not compile. Quotracker ships Linux only, so the tray does not have to stay on Tauri's tray-icon crate.

## Goals / Non-Goals

**Goals:**
- One SNI tray owned by the app crate via `ksni`.
- Left-click still shows the window; the right-click menu exposes Overview, Timeline, Settings, About Quotracker, and Quit.
- No `tray-icon` git patch and no ayatana runtime depend.
- UI still drives tooltip text; Rust owns icon and menu.

**Non-Goals:**
- Changing left-click into a raise/hide toggle or changing tooltip copy (follow-up).
- Headless daemon, remote HTTP, or Plasmoid.
- Dropping GTK3/WebKitGTK (window still needs them).
- macOS/Windows tray paths.

## Decisions

- **Own `ksni` tray, disable Tauri `tray-icon` feature.** Alternative A: patch tray-icon 0.25 + muda 0.20 into Tauri 2.11 — feature rename and muda major make this a Tauri fork. Alternative B: keep the ayatana activate fork — not ksni. Alternative C: spawn ksni *and* keep Tauri tray — two icons. A is rejected; C is rejected.

- **`ksni` blocking API in `tray::create`.** Setup is sync. Default tokio spawn would need a stored runtime handle; `features = ["blocking"]` matches setup. Keep the `Handle` in a module-level mutex (or `AppState`) so tooltip updates can call `update`.

- **Tooltip IPC `set_tray_tooltip`.** After dropping `TrayIcon`, JS cannot `setTooltip`. Add a command; keep `TAURI_COMMANDS` contract. Icon stays the resource `icons/icon.png` as ARGB32 `icon_pixmap` (SNI has no GTK template). Skip JS `setIcon` after init.

- **Rebuild a focused menu with `ksni::menu`.** Overview, Timeline, and Settings show the window and navigate directly; About Quotracker shows the window and opens About; Quit exits. The old duplicate Show Window and Debug Level entries are omitted. `activate` calls `panel::show_panel`. `MENU_ON_ACTIVATE` stays false.

- **Packaging:** remove ayatana from `tauri.conf.json` deb depends, `aur/PKGBUILD`, README, CI apt. Keep `libgtk-3` / `webkit2gtk-4.1`. Drop `core:tray:default` (and `core:menu:default` if unused).

## Risks / Trade-offs

- [ksni menu/tooltip on a given panel] → Plasma 6 is the target; SNI is native there. If a host ignores `Activate`, Overview/Timeline/Settings still restore the window.
- [ksni `Handle` vs Tauri main thread] → `show_panel` / `app.exit` via `AppHandle` (already used from tray callbacks). If a panel calls `activate` off the GTK thread, still OK: window APIs go through Tauri.
- [PNG → ARGB32] → convert once at create; static icon spec means no theme re-raster.
- [Two SNI items if a leftover Tauri tray is created] → do not call `TrayIconBuilder`; drop the Cargo feature so libayatana is not linked.

## Migration Plan

- Dev: `bun tauri dev` on Manjaro KDE; left-click shows window, right-click menu, tooltip after probe.
- Rollback: restore `tray-icon` feature + git patch + ayatana depends.

## Open Questions

None. Activation raise/toggle is a later change, not this one.
