## MODIFIED Requirements

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
