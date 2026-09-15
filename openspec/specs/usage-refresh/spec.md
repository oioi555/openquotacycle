# usage-refresh Specification

## Purpose

Defines how usage data is refreshed and how the panel behaves while refreshes run:
automatic schedule, manual refresh with per-provider cooldown, retention of stale
data during a refresh (stale-while-revalidate), and failure handling.

## Requirements

### Requirement: Automatic usage refresh

The app SHALL refresh usage data automatically at a user-selected interval
(5 or 15 minutes; default 5) and SHALL display a live countdown to the
next automatic refresh in the top bar. On the dashboard (no Back control)
the countdown SHALL sit on the left as an hourglass icon plus `4m` / `12s`,
or `Off` when auto-refresh is paused, and the Refresh control SHALL be
icon-only. Clicking Refresh SHALL refresh all eligible providers immediately.
The long "Next update in …" sentence SHALL NOT appear on the face; it MAY
appear in the tooltip or accessible name. The footer SHALL NOT show this
countdown. The countdown SHALL appear only when the top-bar action is Refresh
(dashboard), not when the action is Reset, sliders, or absent. Stored
intervals that are no longer offered SHALL fall back to the default.

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

### Requirement: Manual usage refresh with per-provider cooldown

The user SHALL be able to trigger a refresh per provider and for all providers.
Each provider SHALL have its own 5-minute manual-refresh cooldown; while a
provider's cooldown is active, manual refreshes of that provider SHALL not run and
the control SHALL indicate the remaining wait time. A refresh-all SHALL refresh
only the enabled providers whose cooldown has elapsed. Starting a manual refresh
SHALL restart the automatic-refresh countdown immediately, regardless of the
refresh outcome.

#### Scenario: Manual refresh updates data

- **WHEN** the user triggers a refresh for a provider outside its cooldown window
- **THEN** the refresh starts and fresh data replaces the displayed data when it
  arrives

#### Scenario: Refresh blocked during cooldown

- **WHEN** the user attempts a manual refresh for a provider within 5 minutes of
  that provider's previous manual refresh
- **THEN** the refresh does not run and the control shows the remaining wait time

#### Scenario: Refresh all skips providers in cooldown

- **WHEN** the user triggers refresh-all and some enabled providers are within
  their cooldown window
- **THEN** only the providers outside their cooldown are refreshed

#### Scenario: Manual refresh restarts automatic schedule

- **WHEN** the user triggers a manual refresh
- **THEN** the automatic-refresh countdown restarts immediately, before the
  refresh completes

### Requirement: Stale data retention during refresh

While a refresh is in progress and previously fetched usage data exists, the panel
SHALL keep displaying the existing data unchanged and SHALL indicate the in-progress
state (for example an animated shimmer sweep on progress bars and a spinning refresh
control). Displayed data SHALL be replaced only when the fresh result arrives. The
in-progress indication SHALL respect the system reduced-motion preference. This
retention applies to manual and automatic refreshes alike.

#### Scenario: Manual refresh keeps stale data visible

- **WHEN** a manual refresh runs while provider data is already displayed
- **THEN** the existing progress bars and values remain visible with the
  in-progress indication until fresh data arrives

#### Scenario: Automatic refresh keeps stale data visible

- **WHEN** an automatic refresh runs while provider data is already displayed
- **THEN** the existing data remains visible with the in-progress indication until
  fresh data arrives

#### Scenario: Reduced motion

- **WHEN** the system requests reduced motion and a refresh is in progress
- **THEN** the in-progress state is indicated without animation while data remains
  visible

### Requirement: Refresh failure handling

When a refresh fails, previously fetched usage data SHALL remain visible and the
failure SHALL be reported inline per provider without clearing the panel; the full
error text SHALL remain accessible. When no prior data exists, the provider SHALL
show an error state in place of data.

#### Scenario: Failure with stale data present

- **WHEN** a refresh fails while stale data is displayed
- **THEN** the stale data stays visible and an inline per-provider error line
  appears whose full text is accessible without losing the data

#### Scenario: Failure without prior data

- **WHEN** a refresh fails and the provider has no previously fetched data
- **THEN** the provider shows an error state instead of metric lines
