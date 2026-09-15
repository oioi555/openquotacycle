# Bugfix: Fix Antigravity CLI and OAuth fallback

## Why

On Linux, OpenQuota can report Antigravity quota while the GUI is closed because it recognizes the `agy` CLI server. Quotracker does not recognize that local source. Its fallback also contains a plugin-owned Google OAuth refresh path, which is an unnecessary third-party OAuth risk and should not be used to renew Antigravity credentials.

## What Changes

- Discover the Antigravity `agy` CLI as a local quota source when its process exposes a listening endpoint, without requiring app-data markers or a CSRF flag.
- Preserve existing `language_server_linux` and `language_server_linux_x64` discovery and local-first precedence.
- Align local-source selection and quota endpoint ordering with OpenQuota without importing or copying its OAuth refresh implementation.
- Use Cloud Code only with an unexpired access token already discovered from the supported local state or a valid existing cache.
- Remove plugin-owned Google OAuth refresh and client credentials; when renewal is needed, direct the user to Antigravity or `agy` so the credential owner performs it.
- Add regression coverage for markerless `agy` discovery, valid-token Cloud Code fallback, and refusal to refresh an expired current Topic token.
- Update Antigravity provider documentation to describe the CLI source and fallback behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `antigravity-quota`: Support the `agy` CLI as a local quota source and keep OAuth renewal owned by Antigravity/`agy` rather than the plugin.

## Impact

- `plugins/antigravity/plugin.js` and `plugins/antigravity/plugin.test.js`.
- `src-tauri/src/plugin_engine/host_api.rs` and its language-server discovery tests, to support markerless processes and an optional CSRF flag.
- `docs/providers/antigravity.md`.
- No new dependencies, credential migration, database migration, or external API endpoint is introduced. The plugin will no longer call Google's OAuth token endpoint or write refreshed Antigravity credentials.
