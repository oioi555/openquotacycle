## Context

See proposal.md — Why. The host used to inject `host.ccusage.query` and spawn a pinned `ccusage` / `@ccusage/codex` through bunx→npx. Claude and Codex turned `{ daily }` into Today / Yesterday / Last 30 Days, and those labels were also declared in `plugin.json` (so they showed in Customize even when the CLI never ran). That code is already gone; this design is the record.

## Goals / Non-Goals

**Goals:**

- Remove the inherited spawn so there is no ccusage version pin or bump script.
- Keep Anthropic and Codex quota probes independent of a package runner.

**Non-Goals:**

- Do not replace ccusage with a first-party JSONL parser.
- Do not change sqlite-backed local spend on Antigravity or OpenCode Go.
- Do not bump gtk-rs/glib.

## Decisions

### 1. Remove the host API with the tiles

Delete `inject_ccusage`, `patch_ccusage_wrapper`, the runner chain, and `scripts/bump-ccusage-version.mjs`. Leaving `host.ccusage` while hiding the tiles would still pin and spawn the CLI.

Alternative: keep the host API for other plugins. Nothing else called it.

### 2. Drop the tiles instead of reading JSONL in-process

A local parser would still track Claude/Codex log format. That is the same maintenance, just in-tree.

Alternative: vendor a small JSONL aggregator. Same version-tracking cost.

### 3. Env-only Claude tokens stay inference-only

`claude-quota` previously loaded local spend from session logs when `CLAUDE_CODE_OAUTH_TOKEN` was the only credential. That path was ccusage. After removal, env-only probes still skip live Session/Weekly and do not emit token-spend tiles.

## Risks / Trade-offs

- [Claude and Codex Customize lists lose Today / Yesterday / Last 30 Days] → Those labels were declared for the ccusage tiles. Quota meters stay. Antigravity / OpenCode Go keep their sqlite spend lines.
- [A later Cost/Trend screen expected `daily[]` from this spawn] → New work needs its own source.
- [Old plugin docs mention `host.ccusage`] → `docs/plugins/api.md` drops the section; archived OpenSpec keeps historical wording.

## Migration Plan

No user data migration. The three labels leave Customize when `plugin.json` drops them. Rollback is a source revert. There is no settings key or ccusage cache to clear.
