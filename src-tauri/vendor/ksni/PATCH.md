# Local patch on ksni 0.3.6

crates.io `ksni` 0.3.6 does not implement
`org.kde.StatusNotifierItem.ProvideXdgActivationToken`.

Plasma 6 sends that method immediately before `Activate` and dbusmenu
clicks so Wayland compositors can raise the window. Without it, GTK
`present()` uses `GDK_CURRENT_TIME` (0) and KWin ignores the raise.

This tree is 0.3.6 plus:

- `Tray::provide_xdg_activation_token`
- D-Bus method `ProvideXdgActivationToken`
- `Service::call_provide_xdg_activation_token`
