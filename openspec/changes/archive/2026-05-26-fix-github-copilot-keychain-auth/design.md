# Design: Fix GitHub Copilot keychain authentication

## Context

The plugin host exposes credential storage helpers through `src-tauri/src/plugin_engine/host_api.rs`. On Linux these helpers used the external `secret-tool` CLI to read/write Secret Service entries.

GitHub Copilot authentication depends on these helpers. If `secret-tool` is missing or not usable from the app runtime, credential lookup/store fails even when the desktop keyring itself is available.

## Approach

Replace the Linux keychain backend with direct Secret Service access through `oo7`.

- Keep the public host API behavior unchanged.
- Preserve existing key attributes:
  - service-only credentials: `service=<service>`
  - account credentials: `service=<service>, account=<account>`
- Return explicit errors when initialization, lookup, read, or write fails.
- Add `sha256Hex` to plugin test helpers because plugin code expects it.

## Implementation Notes

- `oo7::Keyring::new()` is async, but the existing host API helpers are synchronous.
- The implementation uses the current Tokio runtime handle and `block_on` to bridge the existing synchronous API.
- Secret values are trimmed after UTF-8 conversion to preserve previous `secret-tool` stdout behavior.
- This change intentionally does not introduce a fallback to `secret-tool`; failures should be visible.

## Affected Files

- `src-tauri/src/plugin_engine/host_api.rs`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `plugins/test-helpers.js`

## Risks

- Runtime failure if no Tokio runtime is available at keychain call time.
- Behavior differences between `secret-tool` and direct Secret Service item search.
- Existing secrets must remain discoverable by the same attributes.

## Verification

- Run plugin tests, especially GitHub Copilot tests.
- Run `cargo check` for Rust compile coverage.
