## 1. Cadence Selection and Axis Helpers

- [x] 1.1 Replace the first-line quota selector with cadence-aware selection that returns every valid progress line whose `periodDurationMs` is exactly 5 hours or 7 days, while preserving provider and source-line order.
- [x] 1.2 Add shared five-hour/weekly cadence constants and parameterize axis offset, overflow, and upcoming-reset calculations by the section span (12 hours or 14 days).
- [x] 1.3 Add local weekly date formatting and day-tick helpers for day-only header labels and `M/D` reset markers, plus remaining-time formatting that includes days for long reset intervals.
- [x] 1.4 Extend pure-function tests for exact cadence matching, label-independent classification, invalid metadata filtering, multi-line selection, both axis spans, weekly date labels, day ticks, overflow, and past-reset stepping.

## 2. Split Timeline UI

- [x] 2.1 Refactor the timeline container into five-hour and weekly section configurations, rendering a section only when its selected row set is non-empty and returning no timeline region when both are empty.
- [x] 2.2 Refactor timeline rows to represent one provider quota line, display the provider and quota label, and preserve the existing icon contrast treatment and aligned three-column layout.
- [x] 2.3 Generalize reset markers and the short-axis tick header to receive span and label mode, retaining two upcoming markers, right-side labels, overflow indicators, keyboard focus, and tooltips.
- [x] 2.4 Add a weekly day-only tick header using the shared row column geometry and render weekly markers with local month/day labels across the 14-day axis.
- [x] 2.5 Remove placeholder-row/first-line assumptions and keep the timeline mounted only through `OverviewPage` with the existing plugin data and current-time ticker.

## 3. Regression Coverage and Verification

- [x] 3.1 Add component tests covering both sections, section omission, unsupported/missing quota definitions, multiple matching lines from one provider, quota labels, marker labels, and Overview-only rendering.
- [x] 3.2 Run focused quota-timeline tests, the full frontend test suite, TypeScript checks, and the production build; fix regressions without changing plugin or IPC contracts.
- [x] 3.3 Run strict OpenSpec validation for `split-quota-reset-timeline-windows` and confirm all implementation tasks are complete.

## 4. Narrow-Width Header Refinement

- [x] 4.1 Render weekly axis header ticks as day numbers only while retaining `M/D` labels on weekly reset markers.
- [x] 4.2 Add component regression coverage for overflow chevrons when five-hour or weekly resets fall beyond their configured axis.
