# Bugfix: Restore Grok rename and monochrome brand colors

## Bug Description

`2026-09-08-manifest-defaults-fixed-tray` rewrote all bundled `plugins/*/plugin.json`
(`primaryOrder` removal) from a pre-rename base, reverting the shipped
`xai` → `grok` rename and the monochrome brand colors: `plugins/grok/`
is back to id `xai` / name `xAI` / X logo / xAI messages, and
codex/copilot/openrouter brand colors are back to `#74AA9C` / `#A855F7` / `#C8FF00`.
Settings remap (`RENAMED_PLUGIN_IDS`), the Rust `plugins_data` rename, docs, README,
and specs survived; only the plugin files and the `settings.test.ts` migration tests regressed.

## Steps to Reproduce

1. Read `plugins/grok/plugin.json` → `id` is `xai`, `name` is `xAI`
2. Read `plugins/grok/icon.svg` → X logo instead of the Grok mark
3. Read `plugins/codex| copilot|openrouter/plugin.json` → old brand colors
4. Observe error

## Expected Behavior

- `plugins/grok/` ships id `grok` / name `Grok` / Grok mark icon / Grok messages
  (per `grok-supergrok-quota` and `provider-catalog` specs, which still mandate `grok`).
- codex `#000000`, copilot `#000000`, openrouter `#FFFFFF` (user-approved monochrome).
- Migration regression tests exist in `settings.test.ts` again.

## Root Cause

Bulk manifest rewrite in the archived change operated on stale file contents,
clobbering the rename + color edits. No conflict was surfaced because both changes
touched the same files while the other was in flight.

## Proposed Fix

Re-apply only the regressed values (no behavior change, no new spec text —
specs already describe the target state): grok id/name/icon/messages + tests,
three brand colors + openrouter test assert, two `settings.test.ts` migration tests.
Verify with vitest, cargo test, and spec validation.
