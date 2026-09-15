# quota-reset-timeline Specification

## Purpose
This capability presents supported provider quota reset schedules as scatter charts on dedicated five-hour and weekly axes, so users can see reset clusters at a glance.

## Requirements

### Requirement: Cadence labels use 5-hour in the UI
User-visible cadence names on the Timeline screen, dashboard Timeline card, and Customize Timeline detail SHALL be `5-hour` and `Weekly`. Section headers SHALL be `5-hour resets` and `Weekly resets`. The navigation screen id SHALL be `timeline`. Internal cadence ids SHALL remain `five-hour` and `weekly`. Quota metric labels such as `Five-hour window` SHALL NOT change.

#### Scenario: Section headers use 5-hour
- **WHEN** the Timeline screen renders a five-hour section
- **THEN** the section title is `5-hour resets`
- **AND** it is not titled `Five-hour resets` or `Resets`

#### Scenario: Screen id is timeline
- **WHEN** the user opens Timeline from the Timeline tab or the dashboard Timeline card
- **THEN** the active screen id is `timeline`

### Requirement: Reset plots use the Overview meter verdict color
The next reset plot SHALL use the same pace fill as the Overview verdict meter: brand green (`--meter-fill`) when on pace, yellow (`--meter-warning`) when projected to finish with under 10% spare, and red (`--meter-critical`) when projected to run out or already exhausted. It SHALL NOT use the provider brand color. The reset-after-that plot SHALL use a single muted gray (`--muted-foreground`) on every row, not the current period's verdict, because that future period has no quota state. Row-label icons remain branded via `getIconColor`.

#### Scenario: On-pace plot is brand green
- **WHEN** a quota line is on pace
- **THEN** its next reset plot uses the brand-green meter token, not the provider brand color

#### Scenario: Warning and critical plots match the meter
- **WHEN** a quota line is projected to finish with under 10% spare
- **THEN** its next reset plot is yellow
- **AND** when projected to run out or exhausted it is red

#### Scenario: Later plot is muted gray
- **WHEN** a row plots both the next reset and the reset after that
- **THEN** the later plot uses muted gray, not the current period's meter verdict
- **AND** later plots on every row share that same gray

### Requirement: Dedicated Timeline page shows per-provider reset timeline
The system SHALL provide a dedicated Timeline screen (`timeline` in the navigation model, titled Timeline) that renders up to two independent timeline sections: a five-hour quota section and a weekly quota section. A section SHALL be rendered only when it has at least one matching quota row. Each section SHALL contain one row for every matching quota definition, in provider order and then source-line order. A provider MAY therefore appear more than once in a section when it exposes multiple quotas of that cadence. Each section SHALL be rendered as a card with a header titled `5-hour resets` or `Weekly resets` plus its axis span and row count. The Timeline screen SHALL show a top bar with title Timeline, no back control, and a sliders action that opens `customize:timeline`. It SHALL NOT show a refresh action or auto-refresh countdown. Hidden dashboard card rows SHALL NOT omit sections on this screen. The screen SHALL NOT show Customize or Window Starter shortcut rows. Below the plots or empty state, the screen SHALL show the Window Starter section.

#### Scenario: Resets page shows both defined quota sections
- **WHEN** the active screen is Timeline (`timeline`) and at least one five-hour quota and one weekly quota are defined
- **THEN** the five-hour and weekly timeline sections are rendered in the Timeline screen
- **AND** the section titles are `5-hour resets` and `Weekly resets`
- **AND** each section contains only its matching quota rows

#### Scenario: Resets page opened from side navigation
- **WHEN** the user selects Timeline from the footer Timeline tab or activates the dashboard Timeline card
- **THEN** the system displays the Timeline screen with current five-hour and weekly quota states

#### Scenario: Timeline top bar has no refresh action
- **WHEN** the Timeline screen is displayed
- **THEN** the top bar shows the Timeline title and no back control
- **AND** it does not show a refresh action
- **AND** it shows a sliders action that opens `customize:timeline`

#### Scenario: Provider with multiple matching quotas keeps each definition
- **WHEN** one provider exposes two progress quota lines with the same supported cadence
- **THEN** the section renders two distinct rows for that provider
- **AND** each row exposes its quota label via visible text or via row title and marker tooltip so the definitions are distinguishable

#### Scenario: Undefined quota section is omitted
- **WHEN** no five-hour quota definition matches any provider
- **THEN** the five-hour section is not rendered
- **AND** a weekly section is still rendered when weekly quota rows exist

#### Scenario: Timeline hidden outside Resets page
- **WHEN** the active screen is any screen other than `timeline` (dashboard, cost, customize, customize:<pluginId>, customize:timeline, settings)
- **THEN** neither quota timeline section is rendered

#### Scenario: Hidden dashboard rows do not hide page sections
- **WHEN** the dashboard Timeline card hides the five-hour row and weekly quota rows exist
- **THEN** the Timeline screen still renders the five-hour section when five-hour quota rows exist

### Requirement: Timeline page shows empty state when no quota data
The system SHALL render an empty-state card in the Timeline page when no provider exposes a supported quota definition with a valid reset timestamp. The Window Starter section SHALL still render below that empty state.

#### Scenario: No supported quota data
- **WHEN** no provider exposes a supported quota definition with a valid reset timestamp
- **THEN** the Timeline page renders an empty-state card stating no upcoming resets exist
- **AND** no timeline section is rendered
- **AND** Customize and Window Starter shortcut rows are not shown
- **AND** the Window Starter section is shown below the empty state

### Requirement: Rows keep provider and quota labels

Each timeline row SHALL show the provider icon plus provider name and quota label in a shared label column, truncating the text when the column overflows. The label column SHALL NOT show a used/left reading. The label column and tick-header spacer SHALL share the same width so plots stay aligned. The plot lane SHALL remain a meter-track capsule and SHALL NOT fill with current usage. Hovering or focusing a row or its reset plot SHALL still expose provider name, quota label, and the reading.

#### Scenario: Narrow container truncates labels without collapsing to icon-only

- **WHEN** the timeline container width is below the narrow breakpoint
- **THEN** the label column still shows the provider icon plus provider name and quota label
- **AND** overflowing text truncates instead of collapsing to icon-only
- **AND** the tick header spacer uses the same width so axis alignment is preserved

#### Scenario: Icon-only row keeps identity via tooltip

- **WHEN** a provider or quota name overflows the label column
- **THEN** hovering or focusing the row or its reset marker exposes provider name and quota label

#### Scenario: Wide container shows full labels

- **WHEN** a timeline row renders
- **THEN** the label column shows the provider icon plus provider name and quota label
- **AND** it does not show a used/left percent or amount
- **AND** the tick header spacer uses the same width so axis alignment is preserved

### Requirement: Time axis spans 12 hours from the current instant
The five-hour timeline axis SHALL span from the current instant (`now`, left edge, offset 0%) to 12 hours after `now` (right edge, offset 100%). All five-hour rows SHALL share this single axis so reset instants at the same wall-clock time line up vertically. The axis SHALL advance in real time using the existing current-time updates.

#### Scenario: Five-hour now line and right edge
- **WHEN** the five-hour timeline is rendered at any instant T
- **THEN** its vertical now line is drawn at the leftmost position of the axis (0% offset)
- **AND** the axis right edge corresponds to `T + 12h`

#### Scenario: Now line at the left edge
- **WHEN** either timeline section is rendered at any instant T
- **THEN** its vertical now line is drawn at the leftmost position of that section's axis (0% offset)
- **AND** the weekly section's right edge is `T + 14d` while the five-hour section's right edge is `T + 12h`

#### Scenario: Five-hour real-time movement
- **WHEN** the current-time update advances from T to T + 1 second
- **THEN** all five-hour reset markers shift left relative to the axis
- **AND** any reset instant no longer after `now` is not rendered

#### Scenario: Real-time movement
- **WHEN** the current-time update emits a new tick
- **THEN** reset markers in both sections shift left as time advances
- **AND** any reset instant older than `now` is no longer rendered

### Requirement: Each row plots up to two upcoming resets

For each quota row, the system SHALL plot up to two reset points representing the quota's next reset (at `resetsAt`) and the reset after that (at `resetsAt + periodDurationMs`), as long as each instant falls within that row's section axis. Past instants are skipped by advancing `periodDurationMs` until strictly after `now`. Plots SHALL be unlabeled on the shared time axis; local `HH:MM` (five-hour) or `M/D` (weekly) text SHALL appear only on hover or focus and in the axis tick header, not as per-marker chips. The next reset SHALL render as a small circular progress ring whose fill arc follows the same shown percent and verdict tone as the Overview meter (following the global display mode). The reset after that SHALL render as a muted filled dot because that future period has no quota state yet.

#### Scenario: Five-hour quota with two resets in-axis

- **WHEN** a five-hour quota exposes `resetsAt = now + 1h` and `periodDurationMs = 5h`
- **THEN** the row plots two reset points at `now + 1h` and `now + 6h`
- **AND** neither point renders a chip label on the plot
- **AND** the next point is a circular progress ring
- **AND** the later point is a muted filled dot

#### Scenario: Next ring follows the current quota

- **WHEN** a timeline row renders with 40 used of 100 and display mode `left`
- **THEN** the next reset ring is filled at `60%`
- **AND** the plot lane remains a track without a usage fill

#### Scenario: Ring fill follows the global display mode

- **WHEN** the global display mode is `used` and the quota has 90 used of 100
- **THEN** the next reset ring is filled at `90%`

#### Scenario: Provider with full data and both resets in-axis

- **WHEN** a five-hour quota exposes `resetsAt = now + 1h` and `periodDurationMs = 5h`
- **THEN** the row plots the next reset and the reset after that
- **AND** hovering the next plot exposes the local `HH:MM` in its tooltip

#### Scenario: Weekly quota with two resets in-axis

- **WHEN** a weekly quota exposes `resetsAt = now + 1d` and `periodDurationMs = 7d`
- **THEN** the row plots two reset points at `now + 1d` and `now + 8d`
- **AND** hovering a weekly plot exposes the local `M/D` in its tooltip

#### Scenario: Next reset beyond the section axis

- **WHEN** a quota's next reset is beyond its section horizon
- **THEN** no in-axis reset marker is drawn
- **AND** the row displays an overflow indicator at the right edge

#### Scenario: Next-next reset beyond axis

- **WHEN** a five-hour quota exposes `resetsAt = now + 8h` and `periodDurationMs = 5h`
- **THEN** the row renders only the next reset because the next-next reset is beyond 12 hours

#### Scenario: Past reset advances by the defined period

- **WHEN** `resetsAt` is before `now` and `periodDurationMs` is a supported positive duration
- **THEN** the row advances by that duration until the next reset is strictly after `now`
- **AND** it renders up to two future resets that fit in the row's section axis

#### Scenario: Past resetsAt with periodDurationMs

- **WHEN** a five-hour quota exposes `resetsAt = now - 1h` and `periodDurationMs = 5h`
- **THEN** the row skips the past instant and renders future cycles at `now + 4h` and `now + 9h`

#### Scenario: periodDurationMs absent

- **WHEN** a progress line has a reset timestamp but no period definition
- **THEN** it is not selected as a timeline quota row
- **AND** no reset marker is rendered for it

#### Scenario: Short-period providers may overlap labels; accepted

- **WHEN** two five-hour-section reset points on the same row are closer than a chip label would have been
- **THEN** both points remain plotted on the axis without chip labels
- **AND** each point still exposes its local `HH:MM` on hover or focus

#### Scenario: Provider without any resetsAt

- **WHEN** a provider has no progress quota line with a valid reset timestamp
- **THEN** no timeline row is rendered for that provider
- **AND** no placeholder row is shown

### Requirement: Scatter-chart row layout with a shared meter lane

Each row SHALL use a two-column flex layout: a provider-and-quota label column and an axis plot. All rows in a section SHALL share that horizontal grid with the tick header. The plot SHALL NOT use a trailing label gutter and SHALL NOT draw a horizontal divider between provider rows. Each row's plot SHALL show a vertically centered 4px-tall capsule track that uses rounded-full shape and the `meter-track` color. Axis tick labels SHALL sit in the header only. Vertical gridlines at those tick positions SHALL run through every row in the section so simultaneous resets read as a column of plots. Reset plots SHALL keep an enlarged hover and focus target.

#### Scenario: Right-edge marker stays on the shared axis

- **WHEN** a five-hour or weekly plot is anchored at axis offset 100% or very close
- **THEN** the plot remains on the shared axis without a chip label or trailing gutter

#### Scenario: Tick headers align with rows

- **WHEN** either timeline section renders
- **THEN** its tick scale and quota rows share the same horizontal axis start and end positions

#### Scenario: HourTicks aligns with rows

- **WHEN** the five-hour timeline renders
- **THEN** the five-hour hour scale and its rows share the same left spacer and plot widths

#### Scenario: Narrow mode keeps tick alignment

- **WHEN** a timeline row's label text truncates
- **THEN** the tick header spacer uses the same label-column width so ticks stay aligned with plots

#### Scenario: Gridlines run through every row

- **WHEN** a section renders two or more quota rows
- **THEN** each axis tick draws one vertical line through the full plot height
- **AND** no horizontal divider is drawn between those rows

#### Scenario: Lane matches the dashboard meter track

- **WHEN** a timeline row renders
- **THEN** its plot contains a vertically centered 4px rounded capsule using the dashboard `meter-track` color
- **AND** that track is not filled with current usage

### Requirement: Out-of-span content is clipped; overflow indicator shown
Reset markers that fall outside their section's visible span SHALL NOT be rendered inside the axis. When a matching quota exposes a reset timestamp but no upcoming reset lands in its section span, the row SHALL display an overflow indicator at the right edge so the user can distinguish an off-screen reset from missing quota data.

#### Scenario: Weekly reset beyond 14 days
- **WHEN** a weekly quota's next reset is more than 14 days after `now`
- **THEN** no in-axis marker is drawn
- **AND** the weekly row shows one overflow indicator

#### Scenario: Reset beyond 12 hours, no period to step with
- **WHEN** a candidate reset is more than 12 hours after `now` and has no period definition
- **THEN** it is excluded from the five-hour timeline rather than drawn in-axis
- **AND** no unsupported placeholder row is shown

#### Scenario: Five-hour reset in the past without a future cycle
- **WHEN** a five-hour quota's reset timestamp is before `now` and its period cannot produce a future supported reset
- **THEN** no in-axis marker is drawn
- **AND** the five-hour row shows one overflow indicator

#### Scenario: Past resetsAt, no period
- **WHEN** a candidate reset is before `now` and has no period definition
- **THEN** it is excluded from the timeline
- **AND** no marker or placeholder row is rendered

### Requirement: Source data is the existing probe state
The timeline SHALL source per-provider progress data exclusively from the `pluginStates` already maintained by `useProbeState` (the same state that drives the Overview cards). No new probe, IPC channel, Tauri command, or persistence layer SHALL be introduced.

#### Scenario: No additional IPC
- **WHEN** the timeline renders
- **THEN** no new Tauri command invocation or event subscription is used beyond what `OverviewPage` already consumes

### Requirement: Hover or focus on a marker shows details

The system SHALL expose, on hover or keyboard focus of the next reset marker, a tooltip containing the provider name, quota label, an Overview-style progress bar for the current period (same fill percent, verdict tone, and elapsed-time marker as the dashboard meter), the same suffix-free used/left reading the Overview progress line shows (following the global display mode), the local reset label appropriate to the section (`HH:MM` for five-hour quotas or `M/D` for weekly quotas), and the remaining time until that specific reset. The reset-after-that marker's tooltip SHALL include provider, quota label, local reset label, and remaining time, and SHALL NOT include a progress bar or a used/left reading because that future period has no quota state.

#### Scenario: Hover a five-hour reset marker

- **WHEN** the user hovers or focuses a five-hour next-reset marker
- **THEN** a tooltip appears with the provider name, quota label, an Overview-style progress bar, the Overview used/left reading, local `HH:MM`, and a remaining-time suffix such as `Resets in 2h 14m`

#### Scenario: Hover a reset marker

- **WHEN** the user hovers or focuses a next-reset marker
- **THEN** a tooltip appears with its provider, quota, progress bar, used/left reading, local axis label, and remaining time

#### Scenario: Hover a weekly reset marker

- **WHEN** the user hovers or focuses a weekly next-reset marker
- **THEN** a tooltip appears with the provider name, quota label, an Overview-style progress bar, the Overview used/left reading, local `M/D`, and a remaining-time suffix such as `Resets in 8d 4h`

#### Scenario: Reading follows the global display mode

- **WHEN** the global display mode is `left` and the quota has 40 used of 100
- **THEN** the next-reset tooltip reading is `60%` with no `left` or `used` suffix
- **AND** switching the mode to `used` changes that reading to `40%`

#### Scenario: Later reset tooltip omits quota amount

- **WHEN** the user hovers or focuses the reset-after-that marker
- **THEN** the tooltip includes provider, quota label, local reset label, and remaining time
- **AND** it does not include a used/left reading
- **AND** it does not include a progress bar

### Requirement: Provider icons stay legible on both light and dark themes
Provider icons in the row label column SHALL be painted with `getIconColor(brandColor, isDark)` — the same contrast rule the dashboard provider cards use. Icons SHALL use CSS mask + that background color rather than a plain `<img>`. Dark brand colors (e.g. Z.ai, OpenCode-GO) SHALL be replaced with `#ffffff` in dark themes so they do not disappear into the background; light brand colors SHALL fall back to `currentColor` in light themes for the symmetric case. `getIconColor` SHALL live in a shared util (`src/lib/color.ts`) so dashboard provider cards and `TimelineRow` icons apply the same contrast rule.

#### Scenario: Dark brand color in dark theme
- **WHEN** a provider's `brandColor` has relative luminance < 0.15 AND the active theme is dark
- **THEN** the icon is painted `#ffffff` (not the brand color)

#### Scenario: Shared util with SideNav
- **WHEN** the timeline renders an icon
- **THEN** it uses the same `getIconColor` function that the dashboard provider cards use (the SideNav successor as single source of truth for the contrast rule)

### Requirement: Weekly time axis spans 14 days with month/day labels
The weekly timeline axis SHALL span from the current instant (`now`, left edge, offset 0%) to 14 days after `now` (right edge, offset 100%). All weekly rows SHALL share this single axis. Weekly tick labels SHALL display only the reset instant's local day number (`D`) to remain legible at narrow widths. Weekly reset plot tooltips SHALL display the local month and day as `M/D`; neither the header nor the tooltip SHALL use `HH:MM` as the primary weekly label. The axis SHALL advance in real time using the existing current-time updates.

#### Scenario: Weekly now line and right edge
- **WHEN** the weekly timeline is rendered at any instant T
- **THEN** its vertical now line is drawn at the leftmost position of the axis (0% offset)
- **AND** the axis right edge corresponds to `T + 14d`

#### Scenario: Weekly header labels use local day only
- **WHEN** a weekly axis tick falls on local March 8
- **THEN** the weekly header uses the local `8` label
- **AND** it does not include the month prefix

#### Scenario: Weekly reset labels use local month/day
- **WHEN** a weekly reset occurs on local March 8
- **THEN** hovering or focusing that plot exposes the local `3/8` label
- **AND** the tooltip does not replace the date with an hour-only label

#### Scenario: Weekly real-time movement
- **WHEN** the current-time update advances
- **THEN** weekly reset markers shift left relative to the 14-day axis
- **AND** reset instants older than `now` are not rendered

### Requirement: Only explicitly defined five-hour and weekly quotas are displayed
The system SHALL classify a progress quota as five-hour only when `periodDurationMs` is exactly 5 hours, and SHALL classify it as weekly only when `periodDurationMs` is exactly 7 days. A quota SHALL be displayed only when it has a non-empty, parseable `resetsAt` and one of those period definitions. Quota labels SHALL NOT override the period definition. Other durations, missing durations, missing reset timestamps, and malformed reset timestamps SHALL be excluded from both sections.

#### Scenario: Five-hour definition is shown only on the five-hour axis
- **WHEN** a progress quota has a valid reset timestamp and `periodDurationMs = 5h`
- **THEN** it is rendered in the five-hour section
- **AND** it is not rendered in the weekly section

#### Scenario: Weekly definition is shown only on the weekly axis
- **WHEN** a progress quota has a valid reset timestamp and `periodDurationMs = 7d`
- **THEN** it is rendered in the weekly section
- **AND** it is not rendered in the five-hour section

#### Scenario: Other period definitions are hidden
- **WHEN** a progress quota has `periodDurationMs` of 1h, 1d, 30d, or another non-supported duration
- **THEN** it is not rendered in either timeline section

#### Scenario: Missing or invalid quota metadata is hidden
- **WHEN** a progress quota has no positive period definition, no `resetsAt`, an empty `resetsAt`, or an unparseable `resetsAt`
- **THEN** it is not rendered in either timeline section

#### Scenario: Labels do not determine cadence
- **WHEN** a progress quota is labeled `Weekly` but has a five-hour period definition
- **THEN** it is rendered in the five-hour section only
- **AND** the label does not cause it to appear in the weekly section

### Requirement: Codex Plus Session and Weekly resets use their matching timeline sections
When the Codex plugin exposes both an account-level Plus Session line with a five-hour period and an account-level Weekly line with a seven-day period, the timeline SHALL render the Session quota in the five-hour section and the Weekly quota in the weekly section. If no eligible Plus Session line is exposed, Codex SHALL continue to appear only in the weekly section when Weekly reset data is available.

#### Scenario: Codex Plus exposes both account windows
- **WHEN** Codex Plus output contains a Session progress line with a five-hour period and a Weekly progress line with a seven-day period
- **THEN** the Session row appears in the five-hour timeline section
- **AND** the Weekly row appears in the weekly timeline section

#### Scenario: Codex output has no eligible Plus Session
- **WHEN** Codex output contains a Weekly line but no Session line
- **THEN** Codex appears in the weekly timeline section
- **AND** no Codex row is added to the five-hour section
