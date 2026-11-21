# Proposal

## Why

Cloud Code fallback requests in the Antigravity plugin currently send a bare `User-Agent: antigravity` header without a client version. Cloud Code's `v1internal:retrieveUserQuotaSummary` endpoint omits all `gemini-*` buckets when given that legacy header and returns only `3p-5h` and `3p-weekly` (`Claude` / `Claude Wk`), hiding Gemini quotas (`Session` / `Weekly`) and skipping the `fetchAvailableModels` fallback. In addition, paid Google AI Pro accounts now expose a separate weekly quota bucket for Gemini 4 Argon (`gemini-argon-wtu-weekly`) that the plugin skips completely.

## What Changes

- Send a versioned Antigravity ACP `User-Agent` header (`antigravity/acp/1.3.0`) on Cloud Code fallback requests (`retrieveUserQuotaSummary` and `fetchAvailableModels`) so Cloud Code returns the Gemini (`gemini-5h`, `gemini-weekly`) and Argon (`gemini-argon-wtu-weekly`) buckets alongside `3p-*`.
- Support the dedicated Gemini 4 Argon weekly bucket (`gemini-argon-wtu-weekly`) in `SUMMARY_BUCKETS` and `plugins/antigravity/plugin.json`, mapping it to `Argon Wk` (`scope: "overview"`, `visibleByDefault: true`, 7-day `periodDurationMs`).
- Preserve existing behavior when `gemini-argon-wtu-weekly` is absent (e.g. Ultra or Free/Plus plans where Argon has no separate bucket): omit `Argon Wk` without error.
- Update Antigravity provider docs, `README.md`, and plugin tests.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `antigravity-quota`: Cloud Code requests MUST use a versioned Antigravity `User-Agent` that receives Gemini and Argon summary buckets, and `RetrieveUserQuotaSummary` parsing MUST map `gemini-argon-wtu-weekly` to `Argon Wk` when present.

## Impact

- `plugins/antigravity/plugin.js`: `CLOUD_CODE_USER_AGENT` constant, `probeCloudCodeSummary` / `probeCloudCode` headers, `SUMMARY_BUCKETS`.
- `plugins/antigravity/plugin.json`: add `Argon Wk` (`overview`, `visibleByDefault: true`) to `lines`.
- `plugins/antigravity/plugin.test.js`: update `User-Agent` assertions and add `gemini-argon-wtu-weekly` coverage (both Pro with separate Argon bucket and Ultra/other without it).
- `docs/providers/antigravity.md` and `README.md`: document `Argon Wk` / `gemini-argon-wtu-weekly` and updated Cloud Code `User-Agent`.
- `src-tauri/resources/bundled_plugins/antigravity/`: re-synced via `bun run bundle:plugins`.
