# Tasks for Align Cursor usage metrics with official pool names

## 1. Cursor Authentication

- [x] 1.1 Verify the Linux Cursor state database path `~/.config/Cursor/User/globalStorage/state.vscdb` and retain the existing macOS path selection.
- [x] 1.2 Ensure refreshed tokens persist to the selected SQLite/keychain source and missing-auth guidance refers only to the Cursor app.

## 2. Cursor Metric Contract

- [x] 2.1 Update `plugins/cursor/plugin.json` so `Cursor Models` and `Other Models` are overview progress lines in official order, remove `Total usage`, and preserve Credits/Requests/On-demand declarations.
- [x] 2.2 Update Cursor runtime mapping to emit `Cursor Models` from `autoPercentUsed` and `Other Models` from `apiPercentUsed`, preserving percentage and monthly billing-cycle reset metadata while removing aggregate output.
- [x] 2.3 Replace aggregate-dependent fallback checks with valid-pool checks and ensure missing pool fields omit only the affected pool without inventing values.

## 3. Regression Coverage

- [x] 3.1 Add/update auth tests for Linux SQLite discovery, macOS compatibility, token refresh persistence, and the Cursor-app login hint.
- [x] 3.2 Update Cursor plugin fixtures and assertions from `Total usage`/`Auto usage`/`API usage` to the official pool labels.
- [x] 3.3 Add regression tests proving `Total usage` is absent, pool percentages map independently, monthly reset metadata is preserved, and missing pool fields are handled independently.
- [x] 3.4 Verify request-based accounts, Credits, and On-demand behavior remain unchanged after aggregate removal.

## 4. Documentation and Verification

- [x] 4.1 Update `docs/providers/cursor.md` and the README provider summary with the Linux/macOS auth paths, official pool names, field mapping, and monthly quota semantics.
- [x] 4.2 Run Cursor plugin tests, related frontend tests, the production build, and plugin bundling.
- [x] 4.3 Verify live/local HTTP output contains monthly `Cursor Models` and `Other Models` metrics and never contains `Total usage`.
