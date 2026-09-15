## MODIFIED Requirements

### Requirement: Automatic usage refresh

The app SHALL refresh usage data automatically at a user-selected interval
(5 or 15 minutes; default 5) and SHALL display a live countdown to the
next automatic refresh in the top bar. On the dashboard (no Back control)
the countdown SHALL sit on the left as an hourglass icon plus `4m` / `12s`,
or `Off` when auto-refresh is paused, and the Refresh control SHALL be
icon-only.
On Window Starter the left slot is Back, so the Refresh control SHALL show
a compact face (`4m` / `12s` / `Off`) on the same control. Clicking Refresh
SHALL refresh all eligible providers immediately. The long
"Next update in …" sentence SHALL NOT appear on the face; it MAY appear in
the tooltip or accessible name. The footer SHALL NOT show this countdown.
The countdown SHALL appear only when the top-bar action is Refresh
(dashboard and Window Starter), not when the action is Reset, sliders, or
absent. Stored intervals that are no longer offered SHALL fall back to the
default.

#### Scenario: Default interval applies

- **WHEN** the user has not chosen a refresh interval
- **THEN** usage data refreshes automatically every 5 minutes and the top bar
  shows the time remaining until that refresh

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

- **WHEN** the user clicks the top-bar Refresh control
- **THEN** all eligible providers refresh immediately

#### Scenario: Compact countdown face

- **WHEN** the next automatic refresh is 90 seconds away on the dashboard
- **THEN** the top-bar left slot shows an hourglass icon and `2m` without a
  `Next update in` prefix
- **AND** the Refresh control is icon-only

#### Scenario: Paused auto-refresh

- **WHEN** auto-refresh has no next time (no enabled providers) on the dashboard
- **THEN** the top-bar left slot shows an hourglass icon and `Off`

#### Scenario: Countdown stays off Reset screens

- **WHEN** the Settings or Customize screen is displayed
- **THEN** the top bar does not show the auto-refresh countdown
