## Why

OpenAI has stopped exposing the Codex five-hour window for an extended period, while the Tuxmeter Codex plugin still assumes that `primary_window` is always a five-hour Session window. When OpenAI returns the weekly allowance in that position, Tuxmeter mislabels it as Session, assigns a five-hour period, and fails to show the real Weekly status.

## What Changes

- Stop exposing the Codex five-hour Session line from the primary account rate limit.
- Identify Codex weekly usage by the API-provided `limit_window_seconds` duration instead of by `primary_window` or `secondary_window` position.
- Show exactly one account-level `Weekly` line when a seven-day window appears in either position, with its actual reset time and seven-day duration.
- Do not relabel unknown or absent windows as five-hour Session data through fixed-duration fallbacks.
- Keep model-specific additional rate limits and the separate Reviews quota behavior unchanged.
- Add regression coverage for weekly-only, legacy primary-plus-secondary, and missing-duration responses.
- Update Codex provider documentation to describe duration-based window classification and the disabled five-hour display.

## Capabilities

### New Capabilities

- `codex-account-quota`: Defines how account-level Codex rate-limit windows are classified and exposed as quota status lines.

### Modified Capabilities

- `quota-reset-timeline`: The Codex row must use the retained Weekly reset data after its five-hour Session line is removed.

## Impact

- Affected implementation: `plugins/codex/plugin.js` and `plugins/codex/plugin.test.js`.
- Affected timeline selection/tests: `src/lib/quota-timeline/select.ts` and its tests if first-line selection alone cannot guarantee the Weekly representative.
- Affected documentation: `docs/providers/codex.md` and the README provider summary if its advertised metrics change.
- No new dependency, IPC command, persistence format, or plugin API field is introduced.
- The endpoint is reverse-engineered and undocumented; duration-based classification limits reliance on unstable positional semantics.
