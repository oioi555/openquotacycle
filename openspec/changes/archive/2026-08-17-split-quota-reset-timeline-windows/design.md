## Context

See `proposal.md` and the modified `quota-reset-timeline` specification for
the user-visible behavior. The current implementation has one fixed 12-hour
axis, one row per provider, and a selector that returns the first progress line
with `resetsAt`. `MetricLine.Progress` already carries the two fields needed to
classify a quota: `resetsAt` and `periodDurationMs`.

The timeline is mounted only by `OverviewPage`, uses `useNowTicker`, and has no
independent probe or IPC surface. Existing marker tooltips, CSS-mask provider
icons, and the three-column row alignment should remain in use.

## Goals / Non-Goals

**Goals:**

- Make the five-hour and weekly cadences independently scannable on axes sized
  for their actual planning horizons.
- Preserve every valid quota definition of a supported cadence, including
  multiple lines from one provider.
- Keep the timeline compact, aligned, real-time, keyboard-accessible, and
  Overview-only.
- Keep cadence classification deterministic even when a plugin uses a
  misleading or provider-specific label.

**Non-Goals:**

- No changes to plugin output, plugin manifests, probe behavior, IPC, Rust, or
  persistence.
- No support for daily, monthly, request-cycle, or other non-5-hour/non-weekly
  periods in this timeline.
- No filled quota-window blocks, user-configurable horizons, or new chart
  dependency.

## Decisions

### D1. Classify by exact period definition

The selector will match `periodDurationMs` exactly against the supported
durations: 5 hours for the short section and 7 days for the weekly section.
It will also require a non-empty parseable `resetsAt`. `MetricLine.label` is
display metadata only and will not determine cadence.

This is safer than label matching because providers use labels such as
`Session`, `Weekly`, `Sonnet`, model names, and localized/custom names. It also
prevents a missing or estimated period from being rendered as a different
quota. Other durations are intentionally filtered out.

### D2. Flatten matching quota lines into rows

Replace the first-line selector with a selector that returns all matching
progress lines for a requested cadence. The container will flatten the ordered
plugin list into row data containing the plugin metadata, the quota line, and
the cadence configuration. Source plugin order is preserved, followed by line
order, so rows remain deterministic and multiple definitions cannot be hidden.

The row's left label will show the provider name and quota label. The provider
icon continues to use the shared `getIconColor` CSS-mask treatment.

An alternative was one row per provider per section, selecting the first
matching line. That would preserve the old height but silently hide valid
weekly quotas such as a secondary/model-specific limit, so it is rejected.

### D3. Use explicit section configurations

The timeline container will define two configurations and render a reusable
section for each non-empty row set:

| Section | Matching period | Span | Primary label |
| --- | ---: | ---: | --- |
| Five-hour | 5h | 12h | local `HH:MM` |
| Weekly | 7d | 14d | local `M/D` marker |

The reusable section/row path will receive the span and label mode rather than
duplicating marker logic. The existing hour tick component will remain the
short-axis renderer; a corresponding day tick renderer will anchor labels to
local day boundaries, render only the day number, and space them every two days
to keep the 14-day scale readable in the narrow app window.

The weekly marker's primary label remains `M/D`; only the weekly axis header
uses day-only labels. Its tooltip retains the provider,
quota label, date label, and remaining duration; remaining-duration formatting
will include days when the reset is at least one day away, e.g. `Resets in 8d
4h`, while preserving the current hour/minute output for short intervals.

### D4. Generalize axis math without changing marker semantics

Axis offset, overflow detection, and upcoming-reset calculation will accept the
section span instead of assuming 12 hours. The existing next + next-next rule,
past-reset stepping, right-edge overflow chevron, and two-marker cap apply to
both sections. The marker receives the section label mode and span; it remains
keyboard-focusable and uses the existing tooltip primitive.

Date formatting helpers will add local month/day formatting for weekly labels.
All calculations remain epoch milliseconds and use native `Date`; no timezone
library is introduced.

### D5. Hide unsupported and empty output at selection time

Selection will return no row for invalid timestamps, absent/non-positive
periods, or unsupported periods. The container will return no timeline region
when both row sets are empty, and will skip an individual empty section. This
removes the old muted placeholder rows because their presence would imply a
quota definition that the plugin did not provide.

### D6. Keep the existing integration boundary

`OverviewPage` will continue to pass the existing `plugins` array to the
timeline. No component is mounted from provider detail or settings, and no new
timer, probe, Tauri command, event listener, or persisted data is added.

## Risks / Trade-offs

- **Exact duration mismatch** -> A provider that reports a near-equivalent but
  non-exact duration is intentionally excluded rather than mislabeled; plugin
  output can later be corrected without changing timeline semantics.
- **More rows for multi-quota providers** -> The timeline can become taller,
  but hiding definitions is worse for quota visibility; compact row spacing is
  retained.
- **Weekly label collisions at narrow widths** -> Day ticks are spaced every
  two days and the existing right gutter is retained; marker labels use the
  same right-side style as the short section.
- **Month/day ambiguity across a year boundary** -> The requested compact
  display is `M/D`; the tooltip's remaining duration and local reset context
  remain available for disambiguation.
- **Malformed plugin timestamps** -> Selection filters unparseable timestamps
  before rendering, preserving the current no-throw UI behavior.

## Migration Plan

1. Add cadence-aware selection and parameterized axis/date helpers with unit
   tests.
2. Refactor the timeline container, tick headers, rows, and markers to render
   the two configured sections.
3. Update Overview integration only as needed for the new container behavior.
4. Run focused quota-timeline tests, full frontend tests, TypeScript/build
   checks, and strict OpenSpec validation.

Rollback is a frontend-only revert of the selector, axis, and timeline changes;
no data or plugin migration is required.

## Open Questions

None. The supported durations, horizons, labels, and multi-row behavior are
resolved in the proposal and specification.
