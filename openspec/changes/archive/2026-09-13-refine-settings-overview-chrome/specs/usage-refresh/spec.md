## MODIFIED Requirements

### Requirement: Automatic usage refresh

The app SHALL refresh usage data automatically at a user-selected interval
(5 or 15 minutes; default 5) and SHALL display a live countdown to the
next automatic refresh that can be clicked to refresh all providers immediately.
Stored intervals that are no longer offered SHALL fall back to the default.

#### Scenario: Default interval applies

- **WHEN** the user has not chosen a refresh interval
- **THEN** usage data refreshes automatically every 5 minutes and the footer
  countdown shows the time remaining until that refresh

#### Scenario: Settings offers only 5 and 15 minutes

- **WHEN** the Settings Auto Refresh menu opens
- **THEN** the choices are 5 min and 15 min

#### Scenario: User changes the interval

- **WHEN** the user selects a different interval in Settings
- **THEN** automatic refreshes use the selected interval and the choice persists
  across restarts

#### Scenario: Legacy longer intervals fall back

- **WHEN** a stored interval is 30 or 60 minutes
- **THEN** the app uses the 5-minute default

#### Scenario: Countdown click refreshes all

- **WHEN** the user clicks the next-refresh countdown in the footer
- **THEN** all eligible providers refresh immediately
