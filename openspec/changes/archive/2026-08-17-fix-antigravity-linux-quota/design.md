## Context

See `proposal.md` for the motivation. This is a Linux-only fork, but the current plugin retains one macOS database constant, one macOS language-server process filter, one standalone marker, and a legacy-only protobuf reader. The host already supplies Linux platform information, path expansion, SQLite access, and language-server discovery; no native API change is needed.

## Goals / Non-Goals

**Goals:**

- Make Linux standalone and IDE installations discoverable.
- Read both legacy and current Antigravity OAuth storage formats safely.
- Keep local language-server precedence and Cloud Code fallback while exposing the current five-hour and weekly quota semantics.
- Add fixtures that prove the failure modes observed on Linux.

**Non-Goals:**

- No changes to the host language-server discovery implementation or Tauri IPC.
- No new OAuth provider, dependency, or credential migration.
- Legacy endpoints remain fallback-only; current summary bucket grouping and manifest labels are updated to the upstream-compatible four-line contract.
- No macOS compatibility layer or macOS profile/process discovery.
- No support for undocumented quota endpoints unless existing local/Cloud responses require it for the specified behavior.

## Decisions

1. **Resolve Linux profile candidates directly.** Inspect `~/.config/Antigravity` and `~/.config/Antigravity IDE` `User/globalStorage/state.vscdb` candidates. Do not retain the original macOS path in the Linux port. Keep candidate selection separate from token parsing so a present but stale/empty database cannot shadow a usable profile.

2. **Prefer a usable current credential, retain legacy parsing.** Query each candidate for `antigravityUnifiedStateSync.oauthToken` and decode its base64 outer Topic protobuf. Find the entry whose key is `oauthTokenInfoSentinelKey`, decode that entry's base64 value as OAuthTokenInfo, and extract access/refresh/expiry fields. Fall back to the existing `jetskiStateSync.agentManagerInitState` decoder for older installations; treat `antigravityAuthStatus` as optional metadata/API-key fallback. Do not log token contents.

3. **Make Linux language-server discovery profile aware.** Select `language_server_linux`; its process substring intentionally matches the `_x64` executable variant. Use marker values for both `antigravity` and `antigravity-ide`, and send `linux` in the local request context instead of the inherited `macos` value.

4. **Prefer authoritative quota summaries.** Keep local language-server probing first, call `RetrieveUserQuotaSummary` before legacy endpoints, and treat a parsed empty summary as authoritative. On Cloud Code do the same before `fetchAvailableModels`; use legacy model filtering only when the summary endpoint is unavailable. Map exact buckets to `Session`, `Weekly`, `Claude`, and `Claude Weekly` with five-hour or seven-day metadata.

5. **Test through the existing plugin host mocks.** Make Antigravity fixtures explicitly Linux, then extend them with Linux SQLite paths, current Topic OAuth data, Linux process discovery, IDE markers, and local request context assertions. Retain legacy credential and Cloud Code coverage; do not add macOS compatibility cases to this Linux-only port.

## Risks / Trade-offs

- [Risk] Both profiles may exist with different credentials. → Select the first candidate with a valid usable token, and test empty/stale earlier candidates before a valid later candidate.
- [Risk] Protobuf layout changes again. → Keep wire parsing isolated, reject malformed records, and retain the legacy decoder plus Cloud Code error path instead of accepting partial credentials.
- [Risk] Host marker matching is exact for `--app_data_dir`. → Pass both exact marker values and cover standalone/IDE command fixtures.
- [Risk] A Linux local server may reject a mismatched request OS value. → Derive the request context from `ctx.app.platform` and assert it in tests.

## Migration Plan

1. Ship the plugin-only change and provider documentation together.
2. Linux users gain both profile candidate discovery and Linux language-server discovery on the next probe.
3. Rollback is limited to reverting the plugin/docs/test changes; no persisted credential or database migration is performed. macOS behavior is not a rollback target because it is outside this fork's scope.


---

## Revisions

| 日期 | 类型 | 变更描述 | 原因 | 影响 API |
|------|------|----------|------|----------|
| 2026-08-17 | behavior | Align Antigravity quota reporting with the current RetrieveUserQuotaSummary API: map exact Gemini/3P five-hour and weekly buckets to Session, Weekly, Claude, and Claude Weekly; treat a parsed empty summary as authoritative; retain legacy endpoints only as fallback. | The legacy GetUserStatus/GetCommandModelConfigs and fetchAvailableModels paths expose only per-model rolling five-hour quota, which is stale for current Antigravity builds. The upstream/current API exposes merged pools and weekly windows. | RetrieveUserQuotaSummary |
