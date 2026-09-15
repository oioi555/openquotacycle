## 1. Prune unique plugins

- [x] 1.1 Trash `plugins/{amp,factory,gemini,jetbrains-ai-assistant,kimi,kiro,minimax,windsurf,perplexity,synthetic}/` and matching `docs/providers/*.md`, then confirm `ls plugins` no longer lists those ids
- [x] 1.2 Remove remaining references to those plugin ids from README, tests, host whitelist comments, and fixtures, then confirm `rg -n 'amp|factory|gemini|jetbrains-ai-assistant|kimi|kiro|minimax|windsurf|perplexity|synthetic' --glob '!openspec/changes/archive/**' --glob '!node_modules/**'` only hits accepted leftovers
- [x] 1.3 Run `bun run bundle:plugins` and confirm `src-tauri/resources/bundled_plugins` contains the official remaining plugins plus no unique ids, with `mock` still excluded

## 2. Host env and redaction

- [x] 2.1 Remove MiniMax/Synthetic/Pi env names from `WHITELISTED_ENV_VARS` and add `OPENROUTER_API_KEY`, `OPENCODE_DATA_DIR`, and `XDG_DATA_HOME`, then confirm host_api env tests pass
- [x] 2.2 Audit remaining plugin request/response fields against `host_api.rs` redaction lists and add/update tests for gaps, then confirm `cargo test --manifest-path src-tauri/Cargo.toml plugin_engine::host_api::tests::redact` passes

## 3. Shared Not started label

- [x] 3.1 Show `Not started` as the trailing reset label when a progress line has `periodDurationMs` of 5 hours and no parseable `resetsAt`, then confirm provider-card tests cover that case and still show a countdown when `resetsAt` exists

## 4. Copilot auth and credits

- [x] 4.1 Load Copilot tokens from `apps.json` / `hosts.json` / `gh/hosts.yml` before CLI keychain and cached tokens, then confirm plugin tests cover editor-file success and missing-token guidance
- [x] 4.2 Map paid-plan `premium_interactions` to Credits (`100 - percent_remaining`), keep free-plan Chat/Completions, and skip org-billing failure as nonfatal, then confirm `bun run test --run plugins/copilot/plugin.test.js` passes

## 5. OpenRouter keys and credits

- [x] 5.1 Resolve the API key from `~/.config/quotracker/openrouter.json`, then `OPENROUTER_API_KEY`, then OpenCode `auth.json`, and query `/credits` plus `/key`, then confirm tests cover each source, current-window Key Limit, and `/credits` failure leaving `/key` rows

## 6. Z.ai credit limits

- [x] 6.1 Map `CREDIT_LIMIT` and legacy `TOKENS_LIMIT` by window unit to Session/Weekly, treat missing percentages as invalid, and surface no-coding-plan, then confirm Peak Hours tests still pass and `bun run test --run plugins/zai/plugin.test.js` passes

## 7. Claude live login, Fable, Not started

- [x] 7.1 Prefer file/keychain OAuth over `CLAUDE_CODE_OAUTH_TOKEN` for live meters, emit Fable when present, and omit Session `resetsAt` when the window has not started, then confirm `bun run test --run plugins/claude/plugin.test.js` covers env-override, Fable, and missing reset

## 8. Codex duration Session and extra meters

- [x] 8.1 Classify account Session by `limit_window_seconds === 18000` for every plan, keep Weekly/Reviews, and add Extra Usage plus Rate Limit Resets count without claiming a credit, then confirm `bun run test --run plugins/codex/plugin.test.js` covers non-Plus Session and no consume request

## 9. Cursor Total Usage and Grok Bot

- [x] 9.1 Emit Total Usage from Cursor's aggregate plan percent/dollars without summing pools, add nonfatal Grok Bot, and keep Linux `state.vscdb` auth, then confirm `bun run test --run plugins/cursor/plugin.test.js` covers aggregate-only, pools-plus-total, and Grok Bot failure

## 10. Grok weekly-only and PAYG

- [x] 10.1 Keep `~/.grok/auth.json` read-only, emit Weekly only for weekly periods, omit Monthly/Daily/Period relabeling, add Extra Usage PAYG badge, and keep stale snapshot, then confirm `bun run test --run plugins/xai/plugin.test.js` passes and never writes the auth file

## 11. OpenCode entitlement, data dir, spend

- [x] 11.1 Honor `OPENCODE_DATA_DIR` / `XDG_DATA_HOME`, treat 403 `EntitlementError` as no Go plan, keep 401 as rejected key, and add Today/Yesterday/Last 30 Days from local `opencode*.db` Go+Zen costs, then confirm `bun run test --run plugins/opencode-go/plugin.test.js` covers those cases

## 12. Antigravity Not started and local spend

- [x] 12.1 Omit `resetsAt` on unused 5-hour Session/Claude windows and add optional conversation-DB spend tiles that cannot fail quota meters, then confirm `bun run test --run plugins/antigravity/plugin.test.js` covers Not started and missing-DB quota success

## 13. Docs and release surface

- [x] 13.1 Update README supported-providers list and remaining `docs/providers/*.md` to the official set, OpenCode/Grok counterparts, deferred Devin, and dropped unique plugins, then confirm README matches bundled plugin ids
- [x] 13.2 Run `bun run test --run`, `cargo test --manifest-path src-tauri/Cargo.toml`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, and `bun run build`, and confirm they pass
