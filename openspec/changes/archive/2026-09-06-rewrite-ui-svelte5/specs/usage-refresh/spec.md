## Purpose

Defines how usage data is refreshed and how the panel behaves while refreshes run:
automatic schedule, manual refresh with per-provider cooldown, retention of stale
data during a refresh (stale-while-revalidate), and failure handling.

## ADDED Requirements

### Requirement: Automatic usage refresh

The app SHALL refresh usage data automatically at a user-selected interval
(5, 15, 30, or 60 minutes; default 15) and SHALL display a live countdown to the
next automatic refresh that can be clicked to refresh all providers immediately.

#### Scenario: Default interval applies

- **WHEN** the user has not chosen a refresh interval
- **THEN** usage data refreshes automatically every 15 minutes and the footer
  countdown shows the time remaining until that refresh

#### Scenario: User changes the interval

- **WHEN** the user selects a different interval in Settings
- **THEN** automatic refreshes use the selected interval and the choice persists
  across restarts

#### Scenario: Countdown click refreshes all

- **WHEN** the user clicks the next-refresh countdown in the footer
- **THEN** all eligible providers refresh immediately

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
