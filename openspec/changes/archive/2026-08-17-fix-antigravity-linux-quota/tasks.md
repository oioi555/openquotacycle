## 1. Profile And Credential Discovery

- [x] 1.1 Replace the single macOS state database constant with Linux `Antigravity` and `Antigravity IDE` candidate paths under `~/.config`.
- [x] 1.2 Add candidate scanning that selects a profile with usable OAuth credentials instead of stopping at the first existing database.
- [x] 1.3 Extend credential parsing for the current `antigravityUnifiedStateSync.oauthToken` Topic protobuf and retain the legacy jetski protobuf plus auth-status fallback.

## 2. Language Server And Probe Integration

- [x] 2.1 Select the Linux language-server process identifier and recognize standalone and IDE markers.
- [x] 2.2 Send the active platform in local language-server request context while retaining local-first and Cloud Code fallback precedence.
- [x] 2.3 Preserve existing model filtering, pool consolidation, labels, five-hour metadata, token refresh, and error behavior for both probe sources.

## 3. Regression Tests

- [x] 3.1 Add Linux standalone and IDE SQLite fixtures covering platform paths and current OAuth Topic credentials, including empty/stale earlier candidates.
- [x] 3.2 Add Linux language-server discovery fixtures for `language_server_linux_x64`, standalone markers, IDE markers, and platform request context.
- [x] 3.3 Keep and run existing legacy credential and Cloud Code scenarios; add assertions that quota output remains manifest-aligned and non-empty when supported data exists.

## 4. Documentation And Verification

- [x] 4.1 Update `docs/providers/antigravity.md` with Linux-only profile candidates, supported process names/markers, current and legacy credential sources, and fallback behavior.
- [x] 4.2 Run `bunx vitest run plugins/antigravity/plugin.test.js` and the full `bunx vitest` suite.
- [x] 4.3 Run `bun run bundle:plugins` and validate the completed OpenSpec change with `openspec validate fix-antigravity-linux-quota --type change --strict`.

## 5. Current Quota Summary Revision

- [x] 5.1 Prefer local and Cloud Code `RetrieveUserQuotaSummary`, mapping exact five-hour and weekly Gemini/3P buckets and treating empty parsed summaries as authoritative.
- [x] 5.2 Align legacy fallback labels and the manifest with the merged `Session`, `Weekly`, `Claude`, and `Claude Weekly` contract; add summary-first regression coverage.
- [x] 5.3 Update provider documentation and record the behavior revision against the upstream current quota contract.
