## Purpose

Defines how glanceable provider states appear as tone-colored chips in the provider card header, and how probe output is split into metrics, statuses, and errors.

## ADDED Requirements

### Requirement: Provider header shows status chips

The provider card header SHALL render zero or more tone-colored status chips next to the plan label. Status chips SHALL NOT appear as metric rows in the card body and SHALL NOT appear in Customize. Name and plan SHALL stay on the left of the header; reload and the provider mark SHALL stay on the right.

#### Scenario: A status chip occupies the header

- **WHEN** a provider emits one status chip
- **THEN** that chip is visible in the header next to the plan and is absent from the card body metric list

#### Scenario: No status chips

- **WHEN** a provider emits no status chips
- **THEN** the header shows name and plan only, with no empty status placeholder

#### Scenario: Several status chips

- **WHEN** a provider emits more than one status chip
- **THEN** each chip appears in the header in emission order and none of them appear as metric rows

### Requirement: Status chips use shared tones

Each status chip SHALL use one of the tones `positive`, `warning`, `danger`, or `neutral`. The chip text SHALL be the status label itself (for example `Peak` or `Off-Peak`), not a separate metric-row label.

#### Scenario: Danger tone

- **WHEN** a status chip uses the `danger` tone
- **THEN** the chip is visually distinct as a warning-red status in the header

#### Scenario: Positive tone

- **WHEN** a status chip uses the `positive` tone
- **THEN** the chip is visually distinct as a positive-green status in the header

#### Scenario: Warning tone

- **WHEN** a status chip uses the `warning` tone
- **THEN** the chip is visually distinct as a warning status in the header

### Requirement: Probe output has no badge metrics

Plugin probe output SHALL contain only `progress` and `text` metric lines. The host SHALL NOT accept `type: badge` as a metric line. Probe failures SHALL set `error` on the probe output instead of emitting an Error badge. A successful probe MAY return an empty `lines` array.

#### Scenario: Empty metric list is success

- **WHEN** an authenticated probe succeeds with no quota metrics and no error
- **THEN** the host accepts empty `lines` and does not invent a `no lines returned` error

#### Scenario: Thrown probe becomes an error field

- **WHEN** a plugin throws a string
- **THEN** the probe output has that message in `error` and no Error badge line

#### Scenario: Badge line is rejected

- **WHEN** a plugin returns a line with `type: badge`
- **THEN** the host treats the probe as failed
