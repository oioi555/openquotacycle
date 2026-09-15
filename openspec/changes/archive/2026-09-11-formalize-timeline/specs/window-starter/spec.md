## ADDED Requirements

### Requirement: User-facing cadence names use 5-hour
The Window Starter screen heading and the Timeline shortcut subtitle SHALL use `5-hour` as the cadence name (for example `Starts idle 5-hour windows with one minimal request.` and `Start idle 5-hour windows`). Duration and lock-interval copy SHALL keep `five hours`. Quota metric labels such as `Five-hour window` SHALL NOT change.

#### Scenario: Window Starter page uses 5-hour
- **WHEN** the Window Starter screen renders
- **THEN** the heading uses `5-hour windows`
- **AND** it does not use `Five-hour` or `five-hour` as the cadence name

#### Scenario: Timeline shortcut uses 5-hour
- **WHEN** the Timeline screen renders the Window Starter shortcut row
- **THEN** the subtitle is `Start idle 5-hour windows`

## MODIFIED Requirements

### Requirement: Independent Window Starter page
The system SHALL provide a dedicated Window Starter navigation destination containing the global control, current supported-provider states, executable availability, and activity history. These controls SHALL not be added to the general Settings page. The page's entry points SHALL be the footer Options menu and the Timeline screen's Window Starter shortcut row.

#### Scenario: User opens Window Starter
- **WHEN** the user selects Window Starter from the footer Options menu
- **THEN** the system displays the current state of Claude, Codex, and Z.ai together with recent start attempts

#### Scenario: User opens Window Starter from Timeline
- **WHEN** the user activates the Window Starter shortcut row on the Timeline screen
- **THEN** the Window Starter screen is displayed
