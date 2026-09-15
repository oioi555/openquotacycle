## Why

OpenAI is retiring GPT-5.3-Codex-Spark (Tibo, 2026-09-11, effective the week of 2026-09-14). Drop the Spark meters.

Separately, Customize listed two Luna Reserve meters. Live `GET /backend-api/wham/usage` showed `gpt-reserve` as one seven-day `primary_window` with `secondary_window: null`. The plugin treated every additional-limit primary as a session line and every secondary as a weekly line, so a weekly-only fallback looked like two quotas. This change is retroactive: the plugin already matches that shape; the artifacts record why so later audits do not restore Spark or a fake Reserve session window.

## What Changes

- Drop `Spark` / `Spark Wk` from the Codex manifest.
- Omit `GPT-*-Codex-Spark` / `codex_bengalfox` additional limits at probe time, even if the API still returns them until shutdown, so an unlisted label cannot force-show on the collapsed card.
- Emit at most one `Luna Reserve` progress line, and only from a seven-day (`limit_window_seconds` 604800) `gpt-reserve` / `luna-reserve` window. Collapse duplicate weekly windows. Ignore a five-hour or unknown-duration reserve window. Do not emit `Luna Reserve Wk`.
- Keep Luna Reserve unmarked (On Demand). Map stored hidden prefs from `Luna Reserve Wk` onto `Luna Reserve`.
- Leave Session, Weekly, Reviews, Rate Limit Resets, Extra Usage, and local token tiles as they are. Do not surface `model_usage`.

## Capabilities

### New Capabilities

- なし。

### Modified Capabilities

- `codex-account-quota`: additional rate limits no longer map Spark; Luna Reserve is weekly-only and a single On Demand line.

## Impact

- Affected files: `plugins/codex/plugin.js`, `plugins/codex/plugin.test.js`, `plugins/codex/plugin.json`, `docs/providers/codex.md`, `README.md`, `src/lib/settings.ts`, `src/lib/settings.test.ts`.
- No new network request, dependency, IPC, or persistence key.
- Users who hid `Luna Reserve Wk` keep that hide on `Luna Reserve`. Spark hidden prefs become inert.
- Extra Usage still renders when credits balance is `"0"`; Reviews still only appear when `code_review_rate_limit` has `used_percent`.
