## 1. ksni activation token

- [x] 1.1 Vendor ksni 0.3.6 and add `ProvideXdgActivationToken` (`Tray` method + D-Bus + `Service`). Verify `cargo tree -p ksni` resolves to `vendor/ksni`.

## 2. Raise and toggle

- [x] 2.1 In `panel.rs`, raise via GTK `set_startup_id` + X11 server time / `present` on the GTK thread; stop using `set_focus` (timestamp 0) as the last step. Verify `rtk cargo clippy --lib`.
- [x] 2.2 Toggle: hide when visible && !minimized && focused (remember position); otherwise show+raise. Tray `Activate` toggles; menu restore always shows and consumes the token. Verify `cargo test --lib` includes `should_withdraw` cases.
- [x] 2.3 `openspec validate tray-click-raise-toggle --strict`. Manual: covered window raises on left-click; focused window hides; `qdbus` `ProvideXdgActivationToken` exists on the SNI item.
