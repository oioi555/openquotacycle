## 1. Replace estimated provider source

- [x] 1.1 Read the existing `opencode-go.key` from `~/.local/share/opencode/auth.json` and call `GET https://opencode.ai/zen/go/v1/usage` with a Bearer header.
- [x] 1.2 Remove SQLite cost aggregation, fixed dollar-limit calculations, subscription-anchor reset inference, and manual usage-correction fallback from the OpenCode Go provider.
- [x] 1.3 Return an unavailable status for missing credentials, HTTP/auth/network errors, or invalid/incomplete API responses without logging secrets.

## 2. Map and validate authoritative windows

- [x] 2.1 Map `rolling`, `weekly`, and `monthly` to Session, Weekly, and Monthly progress lines with `limit: 100`.
- [x] 2.2 Parse and UTC-normalize each window's ISO-8601 `resetsAt`; preserve the API timestamp as the reset source and derive only a calendar-aware monthly duration for pace status/marker metadata.
- [x] 2.3 Clamp finite API percentages to 0..100 and keep `percent: 1` as 1% used so existing remaining mode computes 99%.
- [x] 2.4 Add a UI regression proving Monthly receives a pace status and current-time marker when its derived duration is available.

## 3. Prevent stale estimates and document the contract

- [x] 3.1 Ignore persisted OpenCode Go snapshots that have no authoritative API provenance while retaining cache behavior for other providers.
- [x] 3.2 Add a three-window fixture and regression tests for percent boundaries, malformed responses, auth/network failures, refetch behavior, and stale cache filtering.
- [x] 3.3 Update OpenCode Go provider documentation and the README provider description with the API source, mapping, failure behavior, and migration from estimates.

## 4. Validate the implemented change

- [x] 4.1 Run `bun run test --run plugins/opencode-go/plugin.test.js` (36 tests passed).
- [x] 4.2 Run the related UI/refresh tests (50 tests passed) and `cargo test --manifest-path src-tauri/Cargo.toml local_http_api::cache::tests` (6 tests passed).
- [x] 4.3 Run `cargo test --manifest-path src-tauri/Cargo.toml plugin_engine::host_api::tests::redact` (18 tests passed), `cargo fmt --check`, `bun run build`, and `git diff --check`.
- [x] 4.4 Attempt live verification with the existing local credential; record the HTTP 403 result without persisting the key or response body.
