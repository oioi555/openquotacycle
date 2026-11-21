# Tasks

## 1. Plugin & Manifest

- [x] 1.1 Update `plugins/antigravity/plugin.js`: define `CLOUD_CODE_USER_AGENT = "antigravity/acp/1.3.0"` for `probeCloudCodeSummary` and `probeCloudCode`, and add `{ id: "gemini-argon-wtu-weekly", label: "Argon Wk", periodMs: WEEKLY_PERIOD_MS }` to `SUMMARY_BUCKETS` after `gemini-weekly`; verify `parseQuotaSummary` emits `Argon Wk` when present and omits it cleanly when absent.
- [x] 1.2 Update `plugins/antigravity/plugin.json`: add `{ "type": "progress", "label": "Argon Wk", "scope": "overview", "visibleByDefault": true }` between `Weekly` and `Claude`, and run `bun run bundle:plugins` so `src-tauri/resources/bundled_plugins/antigravity/` stays in sync.
- [x] 1.3 Update `plugins/antigravity/plugin.test.js`: update Cloud Code `User-Agent` assertions to `"antigravity/acp/1.3.0"`, add tests covering `gemini-argon-wtu-weekly` (present on Pro alongside `gemini-5h`/`gemini-weekly` without merging into `Weekly`, and omitted cleanly on Ultra/other plans), and verify `bun run test --run plugins/antigravity/plugin.test.js` passes.

## 2. Docs, Redaction Audit & Verification

- [x] 2.1 Audit `plugins/antigravity/plugin.js` request/response handling against `src-tauri/src/plugin_engine/host_api.rs` redaction lists and confirm no unredacted secret/header exposure is introduced.
- [x] 2.2 Update `docs/providers/antigravity.md` and `README.md` to document `gemini-argon-wtu-weekly` (`Argon Wk`, 7 days) and `User-Agent: antigravity/acp/1.3.0` on Cloud Code fallback requests.
- [x] 2.3 Run full checks (`bun run test --run`, `bun run typecheck`, `bun run lint`, `cargo test` in `src-tauri`, and `openspec validate fix-antigravity-gemini-argon-quota --strict`) and confirm all pass.
