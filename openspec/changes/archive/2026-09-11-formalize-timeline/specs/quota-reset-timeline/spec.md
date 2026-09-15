## RENAMED Requirements

- FROM: `### Requirement: Dedicated Resets page shows per-provider reset timeline`
- TO: `### Requirement: Dedicated Timeline page shows per-provider reset timeline`
- FROM: `### Requirement: Resets page shows empty state when no quota data`
- TO: `### Requirement: Timeline page shows empty state when no quota data`
- FROM: `### Requirement: Narrow widths collapse rows to icon-only`
- TO: `### Requirement: Rows keep provider and quota labels`
- FROM: `### Requirement: Each row renders up to two upcoming resets`
- TO: `### Requirement: Each row plots up to two upcoming resets`
- FROM: `### Requirement: Three-column row layout with right-side HH:MM gutter`
- TO: `### Requirement: Scatter-chart row layout with a shared meter lane`

## ADDED Requirements

### Requirement: Cadence labels use 5-hour in the UI
User-visible cadence names on the Timeline screen, dashboard Timeline card, and Customize Timeline detail SHALL be `5-hour` and `Weekly`. Section headers SHALL be `5-hour resets` and `Weekly resets`. The navigation screen id SHALL be `timeline`. Internal cadence ids SHALL remain `five-hour` and `weekly`. Quota metric labels such as `Five-hour window` SHALL NOT change.

#### Scenario: Section headers use 5-hour
- **WHEN** the Timeline screen renders a five-hour section
- **THEN** the section title is `5-hour resets`
- **AND** it is not titled `Five-hour resets` or `Resets`

#### Scenario: Screen id is timeline
- **WHEN** the user opens Timeline from Options or the dashboard Timeline card
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

## MODIFIED Requirements

### Requirement: Dedicated Timeline page shows per-provider reset timeline
The system SHALL provide a dedicated Timeline screen (`timeline` in the navigation model, titled Timeline) that renders up to two independent timeline sections: a five-hour quota section and a weekly quota section. A section SHALL be rendered only when it has at least one matching quota row. Each section SHALL contain one row for every matching quota definition, in provider order and then source-line order. A provider MAY therefore appear more than once in a section when it exposes multiple quotas of that cadence. Each section SHALL be rendered as a card with a header titled `5-hour resets` or `Weekly resets` plus its axis span and row count. The Timeline screen SHALL show a top bar with title Timeline and back control, and SHALL NOT show a refresh action in that bar. Hidden dashboard card rows SHALL NOT omit sections on this screen. Below the sections or empty state, the screen SHALL show Customize and Window Starter shortcut rows.

#### Scenario: Resets page shows both defined quota sections
- **WHEN** the active screen is Timeline (`timeline`) and at least one five-hour quota and one weekly quota are defined
- **THEN** the five-hour and weekly timeline sections are rendered in the Timeline screen
- **AND** the section titles are `5-hour resets` and `Weekly resets`
- **AND** each section contains only its matching quota rows

#### Scenario: Resets page opened from side navigation
- **WHEN** the user selects Timeline from the footer Options menu or activates the dashboard Timeline card
- **THEN** the system displays the Timeline screen with current five-hour and weekly quota states

#### Scenario: Timeline top bar has no refresh action
- **WHEN** the Timeline screen is displayed
- **THEN** the top bar shows the Timeline title and a back control
- **AND** it does not show a refresh action

#### Scenario: Provider with multiple matching quotas keeps each definition
- **WHEN** one provider exposes two progress quota lines with the same supported cadence
- **THEN** the section renders two distinct rows for that provider
- **AND** each row exposes its quota label via visible text or via row title and marker tooltip so the definitions are distinguishable

#### Scenario: Undefined quota section is omitted
- **WHEN** no five-hour quota definition matches any provider
- **THEN** the five-hour section is not rendered
- **AND** a weekly section is still rendered when weekly quota rows exist

#### Scenario: Hidden dashboard rows do not hide page sections
- **WHEN** the dashboard Timeline card hides the five-hour row and weekly quota rows exist
- **THEN** the Timeline screen still renders the five-hour section when five-hour quota rows exist

#### Scenario: Timeline hidden outside Resets page
- **WHEN** the active screen is any screen other than `timeline` (dashboard, cost, customize, customize:<pluginId>, customize:timeline, settings, window-starter)
- **THEN** neither quota timeline section is rendered

### Requirement: Timeline page shows empty state when no quota data
The system SHALL render an empty-state card in the Timeline page when no provider exposes a supported quota definition with a valid reset timestamp.

#### Scenario: No supported quota data
- **WHEN** no provider exposes a supported quota definition with a valid reset timestamp
- **THEN** the Timeline page renders an empty-state card stating no upcoming resets exist
- **AND** no timeline section is rendered
- **AND** Customize and Window Starter shortcut rows remain below the empty state

### Requirement: Rows keep provider and quota labels
Each timeline row SHALL show the provider icon plus provider name and quota label in a shared label column, truncating the text when the column overflows. The label column and tick-header spacer SHALL share the same width so plots stay aligned. Hovering or focusing a row or its reset plot SHALL still expose provider name and quota label.

#### Scenario: Narrow container shows icon-only rows
- **WHEN** the timeline container width is below the narrow breakpoint
- **THEN** the label column still shows the provider icon plus provider name and quota label
- **AND** overflowing text truncates instead of collapsing to icon-only
- **AND** the tick header spacer uses the same width so axis alignment is preserved

#### Scenario: Icon-only row keeps identity via tooltip
- **WHEN** a provider or quota name overflows the label column
- **THEN** hovering or focusing the row or its reset plot exposes provider name and quota label

#### Scenario: Wide container shows full labels
- **WHEN** a timeline row renders
- **THEN** the label column shows the provider icon plus provider name and quota label
- **AND** the tick header spacer uses the same width so axis alignment is preserved

### Requirement: Each row plots up to two upcoming resets
For each quota row, the system SHALL plot up to two reset points representing the quota's next reset (at `resetsAt`) and the reset after that (at `resetsAt + periodDurationMs`), as long as each instant falls within that row's section axis. Past instants are skipped by advancing `periodDurationMs` until strictly after `now`. Plots SHALL be unlabeled dots on the shared time axis; local `HH:MM` (five-hour) or `M/D` (weekly) text SHALL appear only on hover or focus and in the axis tick header, not as per-marker chips. The next reset SHALL use the Overview meter verdict color. The reset after that SHALL render in a single muted gray because that future period has no quota state yet.

#### Scenario: Five-hour quota with two resets in-axis
- **WHEN** a five-hour quota exposes `resetsAt = now + 1h` and `periodDurationMs = 5h`
- **THEN** the row plots two reset points at `now + 1h` and `now + 6h`
- **AND** neither point renders a chip label on the plot

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
Each row SHALL use a two-column flex layout: a provider-and-quota label column and an axis plot. All rows in a section SHALL share that horizontal grid with the tick header. The plot SHALL NOT use a trailing label gutter and SHALL NOT draw a horizontal divider between provider rows. Each row's plot SHALL show a vertically centered capsule track that uses the same 2px height, rounded-full shape, and `meter-track` color as the dashboard progress bar. Axis tick labels SHALL sit in the header only. Vertical gridlines at those tick positions SHALL run through every row in the section so simultaneous resets read as a column of plots. Reset plots SHALL keep an enlarged hover and focus target.

#### Scenario: Right-edge five-hour marker keeps its label visible
- **WHEN** a five-hour plot is anchored at axis offset 100% or very close
- **THEN** the plot remains on the shared axis without a chip label or trailing gutter

#### Scenario: Right-edge marker keeps its HH:MM visible
- **WHEN** a five-hour plot is anchored at axis offset 100% or very close
- **THEN** the plot remains on the shared axis without a chip label or trailing gutter

#### Scenario: Right-edge weekly marker keeps its label visible
- **WHEN** a weekly plot is anchored at axis offset 100% or very close
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
- **THEN** its plot contains a vertically centered 2px rounded capsule using the dashboard `meter-track` color

### Requirement: Hover or focus on a marker shows details
The system SHALL expose, on hover or keyboard focus of the next reset marker, a tooltip containing the provider name, quota label, the same suffix-free used/left reading the Overview progress line shows (following the global display mode), the local reset label appropriate to the section (`HH:MM` for five-hour quotas or `M/D` for weekly quotas), and the remaining time until that specific reset. The reset-after-that marker's tooltip SHALL include provider, quota label, local reset label, and remaining time, and SHALL NOT include a used/left reading because that future period has no quota state.

#### Scenario: Hover a five-hour reset marker
- **WHEN** the user hovers or focuses the next five-hour reset marker
- **THEN** a tooltip appears with the provider name, quota label, the Overview used/left reading, local `HH:MM`, and a remaining-time suffix such as `Resets in 2h 14m`

#### Scenario: Hover a reset marker
- **WHEN** the user hovers or focuses the next reset marker
- **THEN** a tooltip appears with its provider, quota, used/left reading, local axis label, and remaining time

#### Scenario: Hover a weekly reset marker
- **WHEN** the user hovers or focuses the next weekly reset marker
- **THEN** a tooltip appears with the provider name, quota label, the Overview used/left reading, local `M/D`, and a remaining-time suffix such as `Resets in 8d 4h`

#### Scenario: Reading follows the global display mode
- **WHEN** the global display mode is `left` and the quota has 40 used of 100
- **THEN** the next-reset tooltip reading is `60%` with no `left` or `used` suffix
- **AND** switching the mode to `used` changes that reading to `40%`

#### Scenario: Later reset tooltip omits quota amount
- **WHEN** the user hovers or focuses the reset-after-that marker
- **THEN** the tooltip includes provider, quota label, local reset label, and remaining time
- **AND** it does not include a used/left reading

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
