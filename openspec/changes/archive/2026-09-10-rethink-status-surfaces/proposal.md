## Why

Provider state is jammed into metric-row badges, and Customize splits metrics by `progress` vs `text` vs `badge`. Collapsed cards spend rows on Grok Extra Usage `Disabled` and Z.ai Peak Hours. Text metrics can be shown or hidden but not reordered (Statistics). Badges skip Customize entirely. OpenQuota has one Always Visible / On Demand list and no outline badge metrics.

## What Changes

- Three channels: METRIC (`progress`|`text`), STATUS (header chips), NOTICE (`throw` / host stale-while-revalidate as `ui-notice`).
- Delete metric `type: badge` and `ctx.line.badge`. Probe errors use `PluginOutput.error`, not an Error badge.
- Customize L2 is one Always Visible / On Demand list. Progress and text share DnD + `overviewLineOrder`. Statistics section goes away.
- Extra Usage: omit when the PAYG cap is off (Grok matches Claude/Copilot/Cursor). When present, emit a text METRIC, default On Demand.
- Peak Hours: header chip (`Peak` danger / `Off-Peak` positive). Classification stays in the Z.ai plugin.
- Grok stale cache: header chip `Stale` (warning), not a Status badge.
- Fallback `No usage data` badges: omit. Empty `lines` is a valid successful probe.
- OpenCode Go auth/usage failures: `throw` (NOTICE), not a Status badge.
- Mock: 3-channel fixture (Session/Weekly + Extra Usage text + a status chip + odd-minute throw). Drop kitchen-sink badges, empty labels, and chaos Error badges.

**Out of scope:** OpenQuota CSS port, `add-cost-aggregation`, Window Starter, eslint/CI leftovers, putting the Singapore schedule in the frontend, renaming Extra labels (`Extra usage spent` / `On-demand`).

## Capabilities

### New Capabilities
- `provider-status`: header status chips; plugin `statuses[]` + `error`; no badge metrics.

### Modified Capabilities
- `overview-metrics`: Customize is one Always/On Demand list for progress and text; badges are gone.
- `zai-peak-hours`: Peak Hours is a header status chip, not a body badge.
- `grok-supergrok-quota`: Extra Usage omitted when cap is 0; positive cap is a text metric; stale is a header chip.
- `opencode-go-quota`: missing key / usage failure throws instead of a Status badge.

## Impact

- Host: `PluginOutput`, runtime, host API, provider-card header, Customize L2, probe error mapping, `ui-notice` for staleError.
- Plugins: grok, zai, claude, codex, copilot, opencode-go, mock.
- Specs listed above.
- Tests: plugin tests, provider-card, customize-provider, settings, probe-controller, runtime.
