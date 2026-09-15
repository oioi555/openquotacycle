## Why

Claude Code's peak-hours limit reduction was a temporary policy introduced in March 2026 and removed by Anthropic on May 6, 2026. Tuxmeter still presents that retired policy as current by querying PromoClock and showing a Peak/Off-Peak badge, while adding an unnecessary external request to every Claude probe.

## What Changes

- Retire the Claude `Peak Hours` badge and remove its manifest declaration.
- Stop calling `https://promoclock.co/api/status` from Claude probes and remove the associated response parsing and color mapping.
- Remove obsolete PromoClock fixtures, mocks, and integration tests; add regression coverage that normal Claude probing does not depend on PromoClock.
- Remove the retired peak-hours description from the Claude provider documentation and README provider summary.
- Keep Anthropic quota fetching, quota math, token refresh, `ccusage` statistics, and the existing no-usage status unchanged.

## Capabilities

### New Capabilities

- `claude-peak-hours`: Defines that the retired Claude peak-hours status is no longer exposed by Claude probes.

### Modified Capabilities

None.

## Impact

- Affected implementation and tests: `plugins/claude/plugin.js`, `plugins/claude/plugin.json`, and `plugins/claude/plugin.test.js`.
- Affected documentation: `docs/providers/claude.md` and the README provider summary.
- Removes one unauthenticated external network request from each Claude probe; no replacement endpoint or dependency is introduced.
- No change to Claude usage values, reset metadata, authentication, persistence, IPC, or plugin API fields.
