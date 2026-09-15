## MODIFIED Requirements

### Requirement: Overview footer shows per-provider reset timeline
The system SHALL render, in the Overview page's footer region (above the global app-shell `PanelFooter`), up to two independent timeline sections: a five-hour quota section and a weekly quota section. A section SHALL be rendered only when it has at least one matching quota row. Each section SHALL contain one row for every matching quota definition, in provider order and then source-line order. A provider MAY therefore appear more than once in a section when it exposes multiple quotas of that cadence. Each row SHALL identify both the provider and the quota label. The footer region SHALL NOT add left/right horizontal padding.

#### Scenario: Overview shows both defined quota sections
- **WHEN** the active view is the Overview (`activeView === "home"`) and at least one five-hour quota and one weekly quota are defined
- **THEN** the five-hour and weekly timeline sections are rendered below the Overview cards
- **AND** each section contains only its matching quota rows
- **AND** the global `PanelFooter` (version + update countdown) remains visible below them

#### Scenario: Timeline visible on Overview
- **WHEN** the active view is the Overview and at least one supported quota row exists
- **THEN** the quota timeline region is rendered below the Overview cards
- **AND** it contains one section per supported cadence with matching rows

#### Scenario: Provider with multiple matching quotas keeps each definition
- **WHEN** one provider exposes two progress quota lines with the same supported cadence
- **THEN** the section renders two distinct rows for that provider
- **AND** each row displays its quota label so the definitions are distinguishable

#### Scenario: Undefined quota section is omitted
- **WHEN** no five-hour quota definition matches any provider
- **THEN** the five-hour section is not rendered
- **AND** a weekly section is still rendered when weekly quota rows exist

#### Scenario: No supported quota data
- **WHEN** no provider exposes a supported quota definition with a valid reset timestamp
- **THEN** the quota timeline region is not rendered

#### Scenario: Timeline hidden outside Overview
- **WHEN** the active view is a provider detail page or the settings page
- **THEN** neither quota timeline section is rendered

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

### Requirement: Each row renders up to two upcoming resets
For each quota row, the system SHALL render up to two reset markers representing the quota's next reset (at `resetsAt`) and the reset after that (at `resetsAt + periodDurationMs`), as long as each instant falls within that row's section axis. Past instants are skipped by advancing `periodDurationMs` until strictly after `now`. Five-hour markers SHALL use local `HH:MM` labels; weekly markers SHALL use local `M/D` labels. Both markers on a row SHALL share a single visual style, with the label placed to the right of the marker line.

#### Scenario: Five-hour quota with two resets in-axis
- **WHEN** a five-hour quota exposes `resetsAt = now + 1h` and `periodDurationMs = 5h`
- **THEN** the row renders two reset markers at `now + 1h` and `now + 6h`
- **AND** both markers display their local `HH:MM` labels to the right of the line

#### Scenario: Provider with full data and both resets in-axis
- **WHEN** a five-hour quota exposes `resetsAt = now + 1h` and `periodDurationMs = 5h`
- **THEN** the row renders the next reset and the reset after that
- **AND** both reset labels use the five-hour section's local `HH:MM` format

#### Scenario: Weekly quota with two resets in-axis
- **WHEN** a weekly quota exposes `resetsAt = now + 1d` and `periodDurationMs = 7d`
- **THEN** the row renders two reset markers at `now + 1d` and `now + 8d`
- **AND** both markers display their local `M/D` labels to the right of the line

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
- **WHEN** two five-hour-section reset markers are closer than their `HH:MM` label width
- **THEN** both markers retain the same right-side label style
- **AND** a narrow-window label overlap is accepted rather than flipping one label to the left

#### Scenario: Provider without any resetsAt
- **WHEN** a provider has no progress quota line with a valid reset timestamp
- **THEN** no timeline row is rendered for that provider
- **AND** no placeholder row is shown

### Requirement: Three-column row layout with right-side HH:MM gutter
Each row SHALL use a three-column flex layout: a provider-and-quota label column, an axis track, and a trailing label gutter. The axis track and label gutter SHALL be sized consistently within each section so all rows in that section share the same horizontal grid. The trailing gutter SHALL reserve room for a reset label anchored near the right edge, without clipping it. The tick header for each section SHALL use the same column structure as its rows.

#### Scenario: Right-edge five-hour marker keeps its label visible
- **WHEN** a five-hour marker is anchored at axis offset 100% or very close
- **THEN** its `HH:MM` label extends into the trailing gutter and is fully visible

#### Scenario: Right-edge marker keeps its HH:MM visible
- **WHEN** a five-hour marker is anchored at axis offset 100% or very close
- **THEN** its `HH:MM` label extends into the right gutter and is fully visible

#### Scenario: Right-edge weekly marker keeps its label visible
- **WHEN** a weekly marker is anchored at axis offset 100% or very close
- **THEN** its `M/D` label extends into the trailing gutter and is fully visible

#### Scenario: Tick headers align with rows
- **WHEN** either timeline section renders
- **THEN** its tick scale and quota rows share the same horizontal axis start and end positions

#### Scenario: HourTicks aligns with rows
- **WHEN** the five-hour timeline renders
- **THEN** the five-hour hour scale and its rows share the same left spacer, track, and right gutter widths

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

### Requirement: Hover or focus on a marker shows details
The system SHALL expose, on hover or keyboard focus of any reset marker, a tooltip containing the provider name, quota label, the local reset label appropriate to the section (`HH:MM` for five-hour quotas or `M/D` for weekly quotas), and the remaining time until that specific reset.

#### Scenario: Hover a five-hour reset marker
- **WHEN** the user hovers or focuses a five-hour reset marker
- **THEN** a tooltip appears with the provider name, quota label, local `HH:MM`, and a remaining-time suffix such as `Resets in 2h 14m`

#### Scenario: Hover a reset marker
- **WHEN** the user hovers or focuses any reset marker
- **THEN** a tooltip appears with its provider, quota, local axis label, and remaining time

#### Scenario: Hover a weekly reset marker
- **WHEN** the user hovers or focuses a weekly reset marker
- **THEN** a tooltip appears with the provider name, quota label, local `M/D`, and a remaining-time suffix such as `Resets in 8d 4h`

## REMOVED Requirements

### Requirement: First resetsAt progress line represents the row
**Reason**: The timeline now displays every progress quota line whose explicit period definition matches one of the supported sections. Selecting only the first line hides valid five-hour or weekly quotas.

**Migration**: Consumers must classify and render quota lines by their supported period definition rather than relying on first-line selection. Lines without a supported period definition remain hidden from the timeline.

## ADDED Requirements

### Requirement: Weekly time axis spans 14 days with month/day labels
The weekly timeline axis SHALL span from the current instant (`now`, left edge, offset 0%) to 14 days after `now` (right edge, offset 100%). All weekly rows SHALL share this single axis. Weekly tick labels SHALL display only the reset instant's local day number (`D`) to remain legible at narrow widths. Weekly reset marker labels SHALL display the local month and day as `M/D`; neither format SHALL use `HH:MM` as the primary weekly label. The axis SHALL advance in real time using the existing current-time updates.

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
- **THEN** the reset marker uses the local `3/8` label
- **AND** the reset marker does not replace the date with an hour-only label

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
