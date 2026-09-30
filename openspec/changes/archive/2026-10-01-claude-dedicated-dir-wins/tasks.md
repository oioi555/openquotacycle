# Tasks

## 1. Discovery

- [x] 1.1 `claude_accounts.rs` `discover_accounts`: dedupe non-primary only; drop primary when its uuid matches a kept non-primary uuid
- [x] 1.2 `apply_accounts`: remove the `claude` plugin when no primary account remains, keeping instance position
- [x] 1.3 Tests: primary duplicates dedicated dir; switcher scenario (a, b, primary=b); two dedicated share uuid; primary without uuid kept; apply without primary removes `claude`

## 2. Docs & verification

- [x] 2.1 `docs/providers/claude.md`: dedupe rule + recommend one dedicated dir per account with switchers (e.g. Orca)
- [x] 2.2 `cargo test`, `bunx vitest run`, `bun run typecheck`, `bun run lint`, `openspec validate claude-dedicated-dir-wins --strict`
