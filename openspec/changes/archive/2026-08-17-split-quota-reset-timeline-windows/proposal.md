## Why

The current Overview timeline selects only the first progress line with a reset
timestamp and places every provider on one 12-hour axis. This hides weekly
quotas when a provider also exposes a five-hour quota, and makes a weekly reset
look like an off-screen five-hour reset. Separate axes make each quota cadence
readable and let the UI omit providers that do not define that cadence.

## What Changes

- Replace the single timeline with separate five-hour and weekly timeline sections.
- Render the five-hour section over the next 12 hours with local `HH:MM` labels.
- Render the weekly section over the next 14 days with local month/day labels.
- Classify quotas from their positive `periodDurationMs` definition: exactly 5
  hours belongs to the five-hour section and exactly 7 days belongs to the
  weekly section; labels alone are not used for classification.
- Render one row for every matching progress quota line, including multiple
  matching lines from the same provider, and identify the quota label in the row.
- Show only matching progress lines with a valid `resetsAt` and period
  definition. Do not render placeholder rows or empty sections for undefined
  quota types.
- Keep the existing real-time ticker, reset marker tooltips, provider icon
  treatment, and Overview-only placement.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `quota-reset-timeline`: split reset visualization by five-hour and weekly
  quota definitions, with distinct horizons and date formats, and filter rows
  to defined matching quotas.

## Impact

- Frontend timeline selectors, axis helpers, row/marker components, and their
  unit/component tests under `src/lib/quota-timeline/` and
  `src/components/quota-reset-timeline/`.
- `src/pages/overview.tsx` remains the integration point; no new IPC, Tauri
  command, probe, persistence, dependency, or plugin schema field is needed.
- The existing `MetricLine.Progress` fields remain the source of truth.
