# opencode-go-peak-hours Specification

## Purpose

Expose whether OpenCode Go's DeepSeek models are currently billed at DeepSeek peak rates so users can interpret quota burn before starting DeepSeek work.

## Requirements

### Requirement: OpenCode Go DeepSeek peak-window classification

The system SHALL classify an instant as DeepSeek Peak from Monday through Friday UTC at or after 01:00 and before 04:00 UTC, or at or after 06:00 and before 10:00 UTC. It SHALL classify every other instant, including the weekday gap from 04:00 inclusive to 06:00 exclusive UTC and all weekend hours, as DeepSeek Off-Peak.

#### Scenario: Weekday morning peak window begins

- **WHEN** an OpenCode Go probe runs at Monday 01:00 UTC, equivalent to Monday 10:00 JST
- **THEN** the current status is classified as DeepSeek Peak

#### Scenario: Weekday morning peak window remains active

- **WHEN** an OpenCode Go probe runs after 01:00 and before 04:00 UTC on a weekday
- **THEN** the current status is classified as DeepSeek Peak

#### Scenario: Weekday morning peak window ends

- **WHEN** an OpenCode Go probe runs at Monday 04:00 UTC, equivalent to Monday 13:00 JST
- **THEN** the current status is classified as DeepSeek Off-Peak

#### Scenario: Weekday afternoon peak window begins

- **WHEN** an OpenCode Go probe runs at Monday 06:00 UTC, equivalent to Monday 15:00 JST
- **THEN** the current status is classified as DeepSeek Peak

#### Scenario: Weekday afternoon peak window remains active

- **WHEN** an OpenCode Go probe runs after 06:00 and before 10:00 UTC on a weekday
- **THEN** the current status is classified as DeepSeek Peak

#### Scenario: Weekday afternoon peak window ends

- **WHEN** an OpenCode Go probe runs at Friday 10:00 UTC, equivalent to Friday 19:00 JST
- **THEN** the current status is classified as DeepSeek Off-Peak

#### Scenario: Weekday outside both peak windows

- **WHEN** an OpenCode Go probe runs before 01:00 UTC, at or after 10:00 UTC, or inside the 04:00-06:00 UTC gap on a weekday
- **THEN** the current status is classified as DeepSeek Off-Peak

#### Scenario: Weekend during peak clock hours

- **WHEN** an OpenCode Go probe runs between 01:00 and 04:00 UTC or between 06:00 and 10:00 UTC on Saturday or Sunday
- **THEN** the current status is classified as DeepSeek Off-Peak

### Requirement: OpenCode Go DeepSeek peak status in the provider header

Each successful authenticated OpenCode Go probe that returns Go quota meters SHALL expose DeepSeek peak status as a header status chip using `DeepSeek Peak` with the `danger` tone or `DeepSeek Off-Peak` with the `positive` tone according to the current classification. The chip SHALL be visible in the provider header on Overview and SHALL NOT appear as a metric-row badge. It SHALL NOT alter existing quota values, reset metadata, or local Go spend tiles. Probes that omit Go meters, including entitlement-only Go spend output and thrown failures, SHALL NOT emit the chip.

#### Scenario: Peak status is displayed

- **WHEN** a successful OpenCode Go probe with Go meters runs during a DeepSeek peak window
- **THEN** the OpenCode Go provider header displays a danger-tone chip with text `DeepSeek Peak` and the card body has no Peak Hours metric row

#### Scenario: Off-peak status is displayed

- **WHEN** a successful OpenCode Go probe with Go meters runs outside DeepSeek peak windows
- **THEN** the OpenCode Go provider header displays a positive-tone chip with text `DeepSeek Off-Peak` and the card body has no Peak Hours metric row

#### Scenario: Existing quota metrics are emitted

- **WHEN** a successful OpenCode Go probe emits Session, Weekly, or Monthly quota metrics
- **THEN** adding the DeepSeek peak status chip does not change their usage values, limits, reset timestamps, or period durations

#### Scenario: Entitlement-only spend omits the chip

- **WHEN** the usage API reports no Go subscription and the probe still returns local Go spend tiles
- **THEN** the result contains no DeepSeek peak status chip

#### Scenario: Authentication or usage failure omits the chip

- **WHEN** the OpenCode Go probe throws because authentication or usage is unavailable
- **THEN** no DeepSeek peak status chip is emitted
