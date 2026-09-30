# Design

## Context

- Everything downstream (probe states, settings `order`/`disabled`, Customize, Window Starter history/lock, leftover notify, crossing-go, local HTTP API cache) is keyed by plugin id = `PluginOutput.provider_id` = `manifest.id` (`runtime.rs:80`).
- The Claude plugin already derives every path from `ctx.host.env.get("CLAUDE_CONFIG_DIR")` (`plugins/claude/plugin.js:146`), including token write-back.
- `inject_env` (`host_api.rs:742`) resolves whitelisted vars from the process / login shell; no per-plugin override.
- `window_starter_run` (`window_starter.rs:445`) finds the plugin by `manifest.id`, validates the runner against `capability.allowed_runners`, and builds argv from `command_args(plugin_id, runner_id, window_id, prompt)`.
- Primary use: Linux server running the app; each account logged in separately via `CLAUDE_CONFIG_DIR=~/.claude-x claude` → `/login`.

## Goals / Non-Goals

**Goals:** one provider card + one Window Starter card per Claude login; keep existing `claude` settings/history; no plugin JS change; WebView never supplies env/dirs.

**Non-Goals:** macOS keychain accounts (Claude Code uses a hashed keychain service name per config dir); runtime rescan / hot add; Settings UI for account dirs; generic multi-instance for other plugins.

## Decisions

### D1: Instances are cloned `LoadedPlugin`s
After `load_plugins_from_dir`, a new `claude_accounts` module (Rust, own file) discovers accounts and appends clones of the `claude` `LoadedPlugin` with:
- `manifest.id = "claude@<key>"`, `manifest.name = "Claude · <dir suffix>"`, `account_email` → `PluginMeta.accountEmail` (card title tooltip)
- new fields `base_id: String` (`"claude"`; equals `manifest.id` for normal plugins) and `env_overrides: Vec<(String, String)>` (`CLAUDE_CONFIG_DIR` → absolute dir)

The primary `claude` keeps its name and only gets `account_email` when instances exist; no env override (keeps current env behavior).
*Why over a plugin-returns-many-outputs model:* every consumer already keys on provider id, so cloned instances need almost no frontend change. Alternative (plugin returns an array) would touch runtime, batch events, and all stores.

### D2: Env override in `inject_env`
`inject_host_api` receives the plugin's `env_overrides`; `env.get(name)` returns an override first, then the whitelist lookup. Overrides are host-controlled only. `pluginDataDir` naturally uses the instance id (separate data dir per account).

### D3: Window Starter uses `base_id`
`window_starter_run` looks up the instance by `manifest.id`, then calls `command_args(base_id, ...)` and applies `env_overrides` to the spawned `Command` (`window_starter.rs:281` area gets an `envs` param). Capability (allowed runners = `claude`) is cloned, so third-party runners stay rejected.

### D4: Identity & keys
- Primary dir: `CLAUDE_CONFIG_DIR` (process/login shell via existing resolver) else `~/.claude`. Account file: `<dir>/.claude.json` if `CLAUDE_CONFIG_DIR` set, else `~/.claude.json`.
- Candidates: `~/.claude-*` dirs with `.credentials.json` (sorted by name), then `config.json` `claude.accountDirs`. Canonicalize paths; skip one equal to primary.
- Key: `accountUuid[..8]`, else dir basename sans leading `.`. Dedupe by `accountUuid` (and by key collisions: first wins, warn log).
- Note: key follows the account, so re-logging a dir into another account gives a new card (old settings stay orphaned, cleaned by existing normalization).

### D5: Config
`config.rs` `AppConfig` gains optional `claude: { accountDirs: Vec<String> }`. Reuse the existing config file; read once at startup.

### D6: Frontend
- `PluginMeta` gains `basePluginId` (from `list_plugins`).
- `getWindowStarterCommand` switches on base id and prefixes `CLAUDE_CONFIG_DIR=<quoted dir>` for instances → `PluginMeta` also gains optional `claudeConfigDir` (display/copy only; never sent back).
- `DEFAULT_ENABLED_PLUGINS` checks (TS `settings.ts:137`, Rust `local_http_api/cache.rs:9`) test base id.
- Search for other literal `"claude"` id comparisons and switch to base id where they mean "the Claude provider".

## Risks / Trade-offs

- `.claude.json` `oauthAccount` is undocumented → missing/renamed fields fall back to dir name; never fails load.
- Same account in dev (Orca) and server: each has its own login grant, so refresh rotation does not collide. Copying `.credentials.json` between machines can collide → documented as "do not copy".
- Discovery only at startup → new login needs app restart (documented).
- `host_api.rs` is already large (2.6k LOC); only a small signature change there, discovery logic lives in its own module.
