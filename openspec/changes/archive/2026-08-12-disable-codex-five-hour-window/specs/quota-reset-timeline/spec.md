# quota-reset-timeline Specification

## ADDED Requirements

### Requirement: Codex row uses the account-level Weekly reset as its representative
After the Codex account-level five-hour Session status is disabled, the timeline SHALL represent the Codex row with the retained account-level Weekly status, using its API-provided reset instant and seven-day period. The row SHALL render the Weekly reset marker and SHALL step past-reset cycles by the seven-day period instead of showing five-hour-cadence markers.

#### Scenario: Codex row after Session line removal
- **WHEN** the Codex plugin output exposes the account-level Weekly line as the first progress line with `resetsAt` (no Session line precedes it)
- **THEN** the row uses the Weekly line's reset instant and seven-day period
- **AND** the row renders no five-hour-cadence markers

#### Scenario: Past Weekly reset advances by seven days
- **WHEN** the Codex Weekly line's `resetsAt` is before `now` and `periodDurationMs` is seven days
- **THEN** the row steps forward in seven-day increments until the reset instant is strictly after `now`
- **AND** up to two future Weekly resets render in-axis when they fall within the 12-hour span
