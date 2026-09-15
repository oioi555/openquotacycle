## Purpose

Expose whether the Z.ai GLM Coding Plan is currently in its higher-rate weekday peak window so users can interpret quota consumption before starting work.

## ADDED Requirements

### Requirement: Z.ai peak-window classification

The system SHALL classify a Z.ai GLM Coding Plan instant as `Peak` from Monday through Friday at or after 14:00 and before 18:00 Singapore Standard Time (UTC+8). It SHALL classify every other instant, including weekends, as `Off-Peak`.

#### Scenario: Weekday peak window begins

- **WHEN** a Z.ai probe runs at Monday 14:00 UTC+8, equivalent to Monday 15:00 JST
- **THEN** the current status is classified as `Peak`

#### Scenario: Weekday peak window remains active

- **WHEN** a Z.ai probe runs after 14:00 and before 18:00 UTC+8 on a weekday
- **THEN** the current status is classified as `Peak`

#### Scenario: Weekday peak window ends

- **WHEN** a Z.ai probe runs at Friday 18:00 UTC+8, equivalent to Friday 19:00 JST
- **THEN** the current status is classified as `Off-Peak`

#### Scenario: Weekday outside the peak window

- **WHEN** a Z.ai probe runs before 14:00 or at or after 18:00 UTC+8 on a weekday
- **THEN** the current status is classified as `Off-Peak`

#### Scenario: Weekend during peak clock hours

- **WHEN** a Z.ai probe runs between 14:00 and 18:00 UTC+8 on Saturday or Sunday
- **THEN** the current status is classified as `Off-Peak`

### Requirement: Z.ai peak status badge

Each successful authenticated Z.ai probe SHALL expose a `Peak Hours` badge using `Peak` with a red status color or `Off-Peak` with a green status color according to the current classification. The badge SHALL be visible in both Overview and the Z.ai provider detail view, including when quota usage data is empty, and SHALL NOT alter existing quota values or reset metadata.

#### Scenario: Peak status is displayed

- **WHEN** a successful Z.ai probe runs during the peak window
- **THEN** Overview and the Z.ai detail view display a red `Peak Hours` badge with text `Peak`

#### Scenario: Off-peak status is displayed

- **WHEN** a successful Z.ai probe runs outside the peak window
- **THEN** Overview and the Z.ai detail view display a green `Peak Hours` badge with text `Off-Peak`

#### Scenario: Quota data is empty

- **WHEN** an authenticated Z.ai quota response succeeds but contains no usable quota limits
- **THEN** the peak status badge remains available alongside the existing no-usage indication

#### Scenario: Existing quota metrics are emitted

- **WHEN** a successful Z.ai probe emits session, weekly, or web-search quota metrics
- **THEN** adding the peak status badge does not change their usage values, limits, reset timestamps, or period durations
