## MODIFIED Requirements

### Requirement: Scatter-chart row layout with a shared meter lane
Each row SHALL use a two-column flex layout: a provider-and-quota label column and an axis plot. All rows in a section SHALL share that horizontal grid with the tick header. The plot SHALL NOT use a trailing label gutter and SHALL NOT draw a horizontal divider between provider rows. Each row's plot SHALL show a vertically centered 2px-tall capsule track that uses rounded-full shape and the `meter-track` color. That track height SHALL stay 2px even when the dashboard progress bar is thicker. Axis tick labels SHALL sit in the header only. Vertical gridlines at those tick positions SHALL run through every row in the section so simultaneous resets read as a column of plots. Reset plots SHALL keep an enlarged hover and focus target.

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
- **AND** that track stays 2px tall even when the dashboard progress bar is 4px tall
