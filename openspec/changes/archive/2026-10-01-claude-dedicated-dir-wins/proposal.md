# Proposal

## Why

Account switchers such as Orca swap the login inside `~/.claude`. When a dedicated directory (e.g. `~/.claude-sub`) holds the same account that `~/.claude` currently holds, dedupe keeps the primary and drops the dedicated card. The other account then has no card, and the primary card follows the switcher, so no card is stable.

## What Changes

- Dedupe by `accountUuid` prefers dedicated directories (`~/.claude-*`, `claude.accountDirs`) over the primary. When the primary duplicates a dedicated directory, the primary (`claude`) is omitted from the provider list.
- Dedupe among dedicated directories is unchanged: first in discovery order wins.
- A primary with no known `accountUuid` is kept, as today. Servers without dedicated duplicates behave as before.
- Docs: recommend one dedicated directory per account when using a switcher; the `~/.claude` card then disappears.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `claude-multi-account`: the dedupe rule in "Account identity, label, and dedupe" now keeps dedicated directories over the primary.

## Impact

- `src-tauri/src/claude_accounts.rs` (`discover_accounts`, `apply_accounts`) and its tests.
- `docs/providers/claude.md` Multiple Accounts section.
- When the primary is omitted, its stored `claude` settings are dropped by existing normalization. It gets defaults if it reappears.
