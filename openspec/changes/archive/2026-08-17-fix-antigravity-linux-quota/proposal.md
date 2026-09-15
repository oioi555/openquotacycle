## Why

This repository is a Linux-only port of the original macOS project, but Antigravity quota discovery still contains the original macOS assumptions. On Linux the plugin reads neither the real state database nor the running language server, so the provider cannot produce quota lines even when Antigravity is authenticated.

## What Changes

- Resolve Linux Antigravity state databases from both the standalone `Antigravity` and `Antigravity IDE` profiles.
- Select credentials from a database containing a usable OAuth token, while retaining the legacy standalone auth cache as a fallback.
- Decode the current `antigravityUnifiedStateSync.oauthToken` Topic protobuf format in addition to the legacy `jetskiStateSync.agentManagerInitState` format.
- Discover the Linux language-server process and both standalone/IDE app-data markers.
- Prefer `RetrieveUserQuotaSummary` for merged five-hour and weekly quota pools, with legacy per-model endpoints as fallback.
- Add regression coverage for Linux paths, Linux language-server discovery, IDE markers, current OAuth storage, and Linux fallback behavior.
- Update Antigravity provider documentation to describe Linux discovery.

## Capabilities

### New Capabilities

- `antigravity-quota`: Linux Antigravity authentication, language-server discovery, and quota retrieval.

### Modified Capabilities

None.

## Impact

- `plugins/antigravity/plugin.js`, its tests, manifest-aligned quota output, and provider documentation.
- No new dependencies, Tauri commands, IPC surface, or host API changes are required.
- macOS compatibility is outside this fork's scope; the implementation targets the Linux runtime and Linux Antigravity installation layout.
