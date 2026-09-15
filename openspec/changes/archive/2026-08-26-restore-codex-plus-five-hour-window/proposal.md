## Why

OpenAI has restored the Codex five-hour account window for Plus subscriptions, but Tuxmeter still discards every five-hour account window. Plus users therefore cannot see their active Session allowance even when the API provides it.

## What Changes

- Restore the account-level `Session` progress line only when `plan_type` identifies the Codex Plus plan and a window reports `limit_window_seconds: 18000`.
- Keep account-window classification duration-based and position-independent, including header/body percentage correlation and real reset metadata.
- Continue suppressing five-hour account windows for non-Plus and unknown plans.
- Preserve the existing account-level `Weekly` line alongside the restored Plus Session line, including deterministic duplicate handling.
- Make Session the first Codex overview/tray candidate for Plus responses while retaining Weekly as the fallback when Session is unavailable.
- Restore the Plus Session row in the five-hour quota timeline without changing weekly timeline behavior.
- Add regressions for Plus, non-Plus, unknown-plan, reordered-window, and weekly-only response shapes.
- Update Codex provider and README metric documentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `codex-account-quota`: Allow an API-provided five-hour account window to be exposed as Session only for the Plus plan while preserving existing Weekly classification.
- `quota-reset-timeline`: Display the restored Codex Plus Session quota in the five-hour section while continuing to display its Weekly quota in the weekly section.

## Impact

- Affected implementation and tests: `plugins/codex/plugin.js`, `plugins/codex/plugin.json`, and `plugins/codex/plugin.test.js`.
- Affected timeline/primary-selection tests: `src/lib/quota-timeline/` and `src/lib/tray-primary-progress.test.ts`; production timeline selection is expected to remain duration-driven and unchanged.
- Affected generated resources: bundled Codex plugin files under `src-tauri/resources/plugins/codex/`.
- Affected documentation: `docs/providers/codex.md` and the README provider summary.
- No new dependency, endpoint, IPC command, persistence format, or plugin API field.
