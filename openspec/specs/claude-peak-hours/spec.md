# claude-peak-hours Specification

## Purpose

Defines the current Claude probe contract after the temporary peak-hours policy and its informational status integration have been retired.

## Requirements

### Requirement: Claude peak-hours status is retired

Claude probes SHALL NOT depend on PromoClock or any other peak-hours status service, and SHALL NOT expose a `Peak Hours` metric line or a Peak/Off-Peak badge.

#### Scenario: Successful Claude probe has no peak-hours status

- **WHEN** an authenticated Claude probe completes successfully
- **THEN** the result contains no `Peak Hours` line
- **AND** the probe makes no request to the retired PromoClock status endpoint

#### Scenario: Peak-hours service availability does not affect Claude probing

- **WHEN** the retired peak-hours service is unavailable or its former endpoint would return an error
- **THEN** Claude probe success and failure behavior is determined only by the existing Claude data sources
- **AND** no peak-hours badge is emitted

### Requirement: Existing Claude usage output is preserved

Retiring peak-hours status SHALL NOT change the existing Claude quota, reset, authentication, local usage, or no-usage output behavior.

#### Scenario: Claude quota data is available

- **WHEN** the Claude usage endpoint returns valid quota data
- **THEN** existing Session, Weekly, Sonnet, and Extra usage lines remain governed by their existing data and metadata
- **AND** no Peak/Off-Peak status is added

#### Scenario: Claude quota data is empty

- **WHEN** the Claude usage endpoint succeeds with no usable quota data
- **THEN** the existing `No usage data` status behavior remains available
- **AND** no Peak/Off-Peak status is added
