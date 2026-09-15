## 1. Linux Notify payload

- [x] 1.1 In `src-tauri/src/notify.rs`, send bundled `icons/icon.png` as `app_icon` (empty if missing), hint `desktop-entry` with the app identifier, urgency normal, and `expire_timeout` 0; verify the file no longer passes the desktop-id as `app_icon` or `8000` as the timeout.
- [x] 1.2 Add tests that a missing path yields empty `app_icon`, an existing file yields that path, and expire timeout is 0; verify `cargo test --manifest-path src-tauri/Cargo.toml --lib notify::`.

## 2. Validation

- [x] 2.1 Run `openspec validate fix-leftover-notify-card --strict` and verify it passes.
