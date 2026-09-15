## Why

The Overview page lists every active provider as a card, but there is no way to see at a glance *when each provider's 5-hour quota resets* relative to the others. Users today must scan each card's "Resets in Xh Ym" text line by line, which makes it hard to spot clustering (e.g. three providers resetting at the same hour) or plan work around the nearest reset. A compact footer timeline turns this scattered text into one visual map.

## What Changes

- Add an Overview-page footer region that renders a stacked, per-provider 5h-quota reset timeline.
- Each provider shown on the Overview page gets one row: provider icon/name on the left, a horizontal ~12-hour time axis on the right, with the provider's current 5h window drawn as a block and its `resetsAt` instant marked.
- The current time is shown as a vertical "now" line on the axis; upcoming reset instants are labeled with their absolute wall-clock hour (`HH:MM`).
- The region is visible only while the Overview view is active; it does not appear on provider-detail or settings pages.
- The existing global `PanelFooter` (version + auto-refresh countdown) is unchanged and remains as the app-shell footer below this region.
- Providers without a `resetsAt` on any progress line, or with no progress line at all, are rendered as a muted placeholder row so users still see the full provider set in the same order as the Overview cards.

## Capabilities

### New Capabilities
- `quota-reset-timeline`: Visual overview of when each active provider's 5-hour quota resets, rendered as a stacked per-provider timeline in an Overview-page footer region.

### Modified Capabilities
<!-- None. `overview-metrics` governs which metrics appear on the Overview cards; this change adds a separate footer visualization and does not alter those requirements. -->

## Impact

- **Frontend (new)**: a new React component (e.g. `src/components/quota-reset-timeline.tsx`) and its subcomponents for axis, per-provider row, window block, reset marker, and "now" line.
- **Frontend (wiring)**: `OverviewPage` renders the timeline region above the global `PanelFooter`; data sourced from the existing `pluginStates` passed down via `useProbeState` (no new probe/state-management layer).
- **Time tracking**: reuses `useNowTicker` so reset markers and the "now" line move in real time, consistent with the existing per-card reset tooltips.
- **Plugins**: no plugin contract changes. The timeline only consumes the existing `MetricLine.Progress` fields (`resetsAt`, `periodDurationMs`, `used`, `limit`). Plugins that don't expose `resetsAt` simply render a placeholder row.
- **Host API / Rust**: no changes. No new IPC, no schema changes, no redaction-list updates.
- **Tests**: unit tests for axis math (12h windowing, "now" positioning, reset-marker offset), row rendering for providers with/without `resetsAt`, and a regression test ensuring the region is hidden outside the Overview view.
- **Docs**: README does not need updating (no new plugin or plugin-exposed field).
