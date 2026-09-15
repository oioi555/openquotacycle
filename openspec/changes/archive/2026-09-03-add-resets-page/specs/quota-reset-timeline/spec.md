## ADDED Requirements

### Requirement: Dedicated Resets page shows per-provider reset timeline
The system SHALL provide a dedicated Resets navigation destination that renders up to two independent timeline sections: a five-hour quota section and a weekly quota section. A section SHALL be rendered only when it has at least one matching quota row. Each section SHALL contain one row for every matching quota definition, in provider order and then source-line order. A provider MAY therefore appear more than once in a section when it exposes multiple quotas of that cadence. Each section SHALL be rendered as a card with a header showing its axis span and row count. The Resets page SHALL show a page header with title and description.

#### Scenario: Resets page shows both defined quota sections
- **WHEN** the active view is Resets (`activeView === "resets"`) and at least one five-hour quota and one weekly quota are defined
- **THEN** the five-hour and weekly timeline sections are rendered in the Resets page
- **AND** each section contains only its matching quota rows

#### Scenario: Resets page opened from side navigation
- **WHEN** the user selects Resets from the side navigation next to Window Starter
- **THEN** the system displays the Resets page with current five-hour and weekly quota states

#### Scenario: Provider with multiple matching quotas keeps each definition
- **WHEN** one provider exposes two progress quota lines with the same supported cadence
- **THEN** the section renders two distinct rows for that provider
- **AND** each row exposes its quota label via visible text or via row title and marker tooltip so the definitions are distinguishable

#### Scenario: Undefined quota section is omitted
- **WHEN** no five-hour quota definition matches any provider
- **THEN** the five-hour section is not rendered
- **AND** a weekly section is still rendered when weekly quota rows exist

#### Scenario: Timeline hidden outside Resets page
- **WHEN** the active view is Overview, a provider detail page, or the settings page
- **THEN** neither quota timeline section is rendered

### Requirement: Resets page shows empty state when no quota data
The system SHALL render an empty-state card in the Resets page when no provider exposes a supported quota definition with a valid reset timestamp.

#### Scenario: No supported quota data
- **WHEN** no provider exposes a supported quota definition with a valid reset timestamp
- **THEN** the Resets page renders an empty-state card stating no upcoming resets exist
- **AND** no timeline section is rendered

### Requirement: Narrow widths collapse rows to icon-only
The system SHALL collapse each timeline row's label column to provider-icon-only when the timeline container is narrow (below approximately 380px container width). In icon-only mode the provider and quota text SHALL be hidden, the label column and tick-header spacer SHALL shrink equally so markers stay aligned, and each row SHALL still expose provider and quota identity via row title and marker tooltip.

#### Scenario: Narrow container shows icon-only rows
- **WHEN** the timeline container width is below the narrow breakpoint
- **THEN** each row shows only the provider icon in its label column
- **AND** the tick header spacer shrinks by the same amount so axis alignment is preserved

#### Scenario: Icon-only row keeps identity via tooltip
- **WHEN** a row is collapsed to icon-only
- **THEN** hovering or focusing the row or its reset marker exposes provider name and quota label

#### Scenario: Wide container shows full labels
- **WHEN** the timeline container width is at or above the narrow breakpoint
- **THEN** each row shows provider icon plus provider and quota text labels

## MODIFIED Requirements

### Requirement: Three-column row layout with right-side HH:MM gutter
Each row SHALL use a three-column flex layout: a provider-and-quota label column, an axis track, and a trailing label gutter. The axis track and label gutter SHALL be sized consistently within each section so all rows in that section share the same horizontal grid. The trailing gutter SHALL reserve room for a reset label anchored near the right edge, without clipping it. The tick header for each section SHALL use the same column structure as its rows. Wide-mode rows SHALL use an enlarged label column and row height suited to a dedicated page. Narrow-mode rows SHALL shrink the label column to icon-only width with matching tick-header spacer shrinkage. Reset marker labels SHALL be rendered as chips with an enlarged hover and focus target.

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

#### Scenario: Narrow mode keeps tick alignment
- **WHEN** rows are collapsed to icon-only
- **THEN** the tick header spacer uses the same collapsed width so ticks stay aligned with markers

## REMOVED Requirements

### Requirement: Overview footer shows per-provider reset timeline
**Reason**: Timeline moves from Overview footer to dedicated Resets page to fix narrow-width crowding.
**Migration**: Open the Resets page from the side navigation next to Window Starter; Overview no longer renders timeline sections.
