## Why

OpenCode Go quota was previously calculated from local SQLite dollar costs and fixed `$12/$30/$60` limits. That estimate could disagree with OpenCode's model-dependent allowance, remote usage, and server reset schedule, causing the monthly reset date and displayed percentages to be wrong. The already-landed implementation needs a change record so the authoritative usage contract is documented before release.

## What Changes

- Read OpenCode Go usage from `GET https://opencode.ai/zen/go/v1/usage` with the existing `opencode-go.key` in `~/.local/share/opencode/auth.json`.
- Map `rolling`, `weekly`, and `monthly` API windows to Quotracker's Session, Weekly, and Monthly lines.
- Treat API `percent` as used percentage in the 0..100 range; clamp safely and compute remaining as `100 - percent`.
- Use each API window's ISO-8601 `resetsAt` as the reset source, including Monthly.
- Derive a calendar-aware monthly period duration from the API reset timestamp only for pace status and current-time marker rendering; never use it to replace the API reset.
- Remove local dollar-cost, subscription-anchor, and manual-correction calculations from the authoritative provider path.
- Show an unavailable status for missing credentials, authentication/API/network failures, or malformed/incomplete responses; do not silently display an estimate.
- Prevent persisted OpenCode Go snapshots from presenting old, unmarked dollar estimates before a fresh probe.
- Add fixtures, boundary regressions, failure tests, provider documentation, and release-facing README wording.

## Capabilities

### New Capabilities

- `opencode-go-quota`: authoritative OpenCode Go quota windows, percentages, reset timestamps, authentication, and failure behavior.

### Modified Capabilities

- None.

## Impact

- `plugins/opencode-go/plugin.js` and its tests/fixture.
- `src-tauri/src/local_http_api/cache.rs` and its cache tests.
- OpenCode's public HTTPS usage endpoint; no new dependency or credential store.
- OpenCode Go provider documentation and the supported-provider list in `README.md`.
- Existing UI continues to consume progress lines with `limit: 100`; its remaining mode therefore renders `100 - used`.

This change is recorded after implementation. The implementation and validation described by the artifacts are already present in the working tree.
