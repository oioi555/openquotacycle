# Tasks

## 1. Discovery (Rust)

- [x] 1.1 `config.rs`: add optional `claude.accountDirs` to `AppConfig`; expose a loader returning expanded paths
- [x] 1.2 New `src-tauri/src/claude_accounts.rs`: resolve primary dir + account file, scan `~/.claude-*` with `.credentials.json`, append configured dirs, canonicalize, read `oauthAccount.{accountUuid,emailAddress}`, derive key/label, dedupe
- [x] 1.3 `LoadedPlugin`: add `base_id` and `env_overrides`; set defaults in `load_single_plugin` and test fixtures
- [x] 1.4 Build instances from the `claude` plugin after `load_plugins_from_dir` (`plugin_engine/mod.rs`); keep primary named `Claude` and expose account email tooltips when instances exist
- [x] 1.5 Unit tests (temp home dir): single login, suffixed dir, configured dir, dir without creds, missing `.claude.json` fallback, duplicate uuid dedupe, label rules

## 2. Probe env override

- [x] 2.1 Pass `env_overrides` into `inject_host_api` → `inject_env`; override wins over whitelist lookup
- [x] 2.2 Rust test: probe script reading `CLAUDE_CONFIG_DIR` sees the override; plugin without overrides unchanged
- [x] 2.3 Plugin test (`plugins/claude/plugin.test.js`): refresh with `CLAUDE_CONFIG_DIR=/x/.claude-b` writes to `/x/.claude-b/.credentials.json` only (add if not already covered)

## 3. Window Starter

- [x] 3.1 `window_starter_run`: resolve `command_args` via `base_id`; pass `env_overrides` to the spawned command
- [x] 3.2 Tests: instance start sets `CLAUDE_CONFIG_DIR`; `claude` start sets none; unknown `claude@ffffffff` → unsupported; instance + `opencode` → unsupported

## 4. Frontend

- [x] 4.1 `list_plugins` / `PluginMeta` (Rust + TS types): add `basePluginId`, optional `claudeConfigDir`
- [x] 4.2 `window-starter-state.ts` `getWindowStarterCommand`: switch on base id; prefix `CLAUDE_CONFIG_DIR=<quoted>` for instances; tests
- [x] 4.3 Default-enabled checks use base id (`src/lib/settings.ts`, `src-tauri/src/local_http_api/cache.rs`); tests for `claude@x` enabled by default
- [x] 4.4 Audit remaining literal `"claude"` id comparisons in `src/` and fix where they mean the Claude provider
- [x] 4.5 Verify Window Starter lock/history independence per instance id (existing keying; add a test with two Claude ids)

## 5. Docs & verification

- [x] 5.1 `docs/providers/claude.md`: multi-account section (discovery rules, label/dedupe, `claude.accountDirs`, per-account `/login`, don't copy credentials, restart after new login, Linux file creds only)
- [x] 5.2 `docs/window-starter.md`: Claude instances get their own card; env set by host
- [x] 5.3 `docs/proxy.md` or config docs: mention `claude.accountDirs` in `config.json`
- [x] 5.4 README: note multi-account Claude support
- [x] 5.5 Run `cargo test`, `bun run test` (vitest), typecheck/lint; `openspec validate claude-multi-account --strict`
