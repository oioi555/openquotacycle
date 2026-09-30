# Proposal

## Why

Users rotate several Claude subscriptions (e.g. Orca account switching on a dev machine). The server-side OpenQuotaCycle only sees the one account in `~/.claude`, so Window Starter cannot keep the inactive accounts' five-hour windows running; switching to them later means starting from an idle window.

## What Changes

- Discover additional Claude Code logins, one per config directory (`CLAUDE_CONFIG_DIR` convention):
  - auto-scan `~/.claude` and `~/.claude-*` directories that contain `.credentials.json`
  - plus extra directories listed in `~/.config/openquotacycle/config.json` under `claude.accountDirs`
- Each extra account becomes its own Claude provider instance (id `claude@<key>`) with its own card, customization, Window Starter participation, history, lock, leftover notify, and local HTTP API snapshot. `~/.claude` (or the app's `CLAUDE_CONFIG_DIR`) stays `claude`, so existing settings and history are kept.
- Primary card stays `Claude`; extra cards are `Claude · <dir suffix>` (`~/.claude-sub` → `sub`). The full `oauthAccount.emailAddress` from that directory's `.claude.json` is the card title tooltip. Accounts are deduplicated by `oauthAccount.accountUuid`.
- Probes of an account instance read credentials, refresh tokens, and write refreshed tokens back only inside that account's directory.
- Window Starter runs `claude` for an account instance with `CLAUDE_CONFIG_DIR` set to that account's directory by the native host. The WebView still cannot supply env.
- Document multi-account detection in `docs/providers/claude.md` and `docs/window-starter.md`.

## Capabilities

### New Capabilities
- `claude-multi-account`: discovery, identity, dedupe, per-account probing, and per-account Window Starter execution for multiple Claude Code logins.

### Modified Capabilities
<!-- none: existing claude-quota and window-starter requirements keep applying per instance -->

## Impact

- Rust: plugin loading (derive Claude account instances after `load_plugins_from_dir`), `LoadedPlugin` gains base id + env overrides, `host_api` env injection honors overrides, `window_starter` resolves pin table by base id and sets `CLAUDE_CONFIG_DIR` on spawn, `config.rs` reads `claude.accountDirs`.
- TS: `PluginMeta` gains `basePluginId`. Plugin-id comparisons (`window-starter-state.ts` command text, default-enabled set) use the base id.
- Plugin JS: unchanged (it already honors `CLAUDE_CONFIG_DIR`).
- Out of scope: macOS keychain-backed extra accounts (Linux file-based credentials only), runtime rescan (discovery at app start), Settings UI for account dirs.
