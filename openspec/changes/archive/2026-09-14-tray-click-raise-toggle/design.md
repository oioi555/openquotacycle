## Context

`panel::show_panel` already calls `unminimize` → `show` → `set_focus`. `set_focus` is tao `present_with_time(GDK_CURRENT_TIME)`. That is why an already-mapped window does not come forward on KDE.

Plasma 6 system tray calls `org.kde.StatusNotifierItem.ProvideXdgActivationToken` then `Activate` (and the same token before dbusmenu clicks). GTK3 consumes the token via `gtk_window_set_startup_id` then `present`.

## Goals / Non-Goals

**Goals:**
- Raise a covered window from tray click / Show Window / shortcut-show.
- Toggle: focused front window + tray click → hide to tray (same as close).
- Use Plasma's activation token; X11 fallback is a real server timestamp.

**Non-Goals:**
- WM minimize (iconify) instead of hide. Hide matches close-to-tray; the taskbar entry disappears.
- Wayland global-shortcut tokens (KGlobalAccel). Shortcut still uses X11 server time / present.
- Plasmoid, always-on-top pulse, wmctrl.

## Decisions

- **Vendor ksni 0.3.6** and add `Tray::provide_xdg_activation_token`. Patching tray-icon 0.25 is still a Tauri fork. Upstream ksni has no token method.
- **Hide, not iconify**, when withdrawing. Matches `CloseRequested` and the existing `toggle_panel` hide path. "Minimize" in the request is tray-app language.
- **Toggle only when visible && !minimized && focused.** Visible-but-behind raises. Minimized restores.
- **GTK present on the GTK thread** via `run_on_main_thread` + `idle_add_local_once` so tao `show` is applied before `present`. `gtk_window()` is main-thread-only.
- **Do not call `set_focus` after present.** It would send timestamp 0 and undo the raise.

## Risks / Trade-offs

- [Plasma does not send a token] → X11 server time still raises; Wayland may only demand-attention. Log token receipt at debug.
- [tao visibility atomics vs direct GTK present] → still use Tauri `show`/`hide`/`unminimize` for state; GTK only for activation.
- [Vendored ksni] → small D-Bus method; rebase if ksni 0.3.7 adds the same API.

## Migration Plan

- Restart the debug app; left-click a covered window; left-click a focused window.

## Open Questions

None.
