## Why

The JS plugin host inherited a pinned `ccusage` spawn for Claude/Codex Today / Yesterday / Last 30 Days. OpenUsage no longer ships that plugin model. Keeping the pin means tracking that CLI's versions whenever log format or flags change. Drop the inherited spawn and the tiles that depended on it.

## What Changes

- Remove `host.ccusage.query`. The host does not spawn `ccusage` / `@ccusage/codex`.
- Claude and Codex do not emit Today, Yesterday, or Last 30 Days from local session logs. Their Customize line lists drop those three labels.
- Drop `scripts/bump-ccusage-version.mjs` and the `ccusage:bump` package script.
- Session, Weekly, Extra usage, Fable, Luna Reserve, Reviews, and Rate Limit Resets stay.
- Antigravity and OpenCode Go local spend tiles stay (sqlite, not ccusage).

## Capabilities

### New Capabilities

- `plugin-ccusage`: The host does not expose `host.ccusage` or spawn that CLI. Claude and Codex probes do not emit tiles that used it.

### Modified Capabilities

- `claude-quota`: Env-only `CLAUDE_CODE_OAUTH_TOKEN` does not load local session-log spend tiles.
- `codex-account-quota`: Codex does not emit local token-spend tiles from a package CLI.

## Impact

- Host: `src-tauri/src/plugin_engine/host_api.rs`, `runtime.rs`.
- Plugins: `plugins/claude/plugin.js`, `plugin.json`, `plugin.test.js`; `plugins/codex/plugin.js`, `plugin.json`, `plugin.test.js`; `plugins/test-helpers.js`.
- Docs: `docs/plugins/api.md`. Live spec `openspec/specs/claude-quota/spec.md` already matches.
- ccusage was never in `package.json` / Cargo. Archived OpenSpec wording is left as written.
