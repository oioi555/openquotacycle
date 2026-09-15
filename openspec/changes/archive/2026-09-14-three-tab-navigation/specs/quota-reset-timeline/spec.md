## MODIFIED Requirements

### Requirement: Cadence labels use 5-hour in the UI
User-visible cadence names on the Timeline screen, dashboard Timeline card, and Customize Timeline detail SHALL be `5-hour` and `Weekly`. Section headers SHALL be `5-hour resets` and `Weekly resets`. The navigation screen id SHALL be `timeline`. Internal cadence ids SHALL remain `five-hour` and `weekly`. Quota metric labels such as `Five-hour window` SHALL NOT change.

#### Scenario: Section headers use 5-hour
- **WHEN** the Timeline screen renders a five-hour section
- **THEN** the section title is `5-hour resets`
- **AND** it is not titled `Five-hour resets` or `Resets`

#### Scenario: Screen id is timeline
- **WHEN** the user opens Timeline from the Timeline tab or the dashboard Timeline card
- **THEN** the active screen id is `timeline`

### Requirement: Dedicated Timeline page shows per-provider reset timeline
The system SHALL provide a dedicated Timeline screen (`timeline` in the navigation model, titled Timeline) that renders up to two independent timeline sections: a five-hour quota section and a weekly quota section. A section SHALL be rendered only when it has at least one matching quota row. Each section SHALL contain one row for every matching quota definition, in provider order and then source-line order. A provider MAY therefore appear more than once in a section when it exposes multiple quotas of that cadence. Each section SHALL be rendered as a card with a header titled `5-hour resets` or `Weekly resets` plus its axis span and row count. The Timeline screen SHALL show a top bar with title Timeline, no back control, and a sliders action that opens `customize:timeline`. It SHALL NOT show a refresh action or auto-refresh countdown. Hidden dashboard card rows SHALL NOT omit sections on this screen. The screen SHALL NOT show Customize or Window Starter shortcut rows.

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
- **WHEN** the active screen is any screen other than `timeline` (dashboard, cost, customize, customize:<pluginId>, customize:timeline, settings, window-starter)
- **THEN** neither quota timeline section is rendered

#### Scenario: Hidden dashboard rows do not hide page sections
- **WHEN** the dashboard Timeline card hides the five-hour row and weekly quota rows exist
- **THEN** the Timeline screen still renders the five-hour section when five-hour quota rows exist

### Requirement: Timeline page shows empty state when no quota data
The system SHALL render an empty-state card in the Timeline page when no provider exposes a supported quota definition with a valid reset timestamp.

#### Scenario: No supported quota data
- **WHEN** no provider exposes a supported quota definition with a valid reset timestamp
- **THEN** the Timeline page renders an empty-state card stating no upcoming resets exist
- **AND** no timeline section is rendered
- **AND** Customize and Window Starter shortcut rows are not shown
