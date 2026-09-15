## MODIFIED Requirements

### Requirement: Status chips use shared tones

Each status chip SHALL use one of the tones `positive`, `warning`, `danger`, or `neutral`. The chip text SHALL be the status label itself (for example `Peak` or `Off-Peak`), not a separate metric-row label. A `danger` chip SHALL use the dashboard meter critical color so it reads as dark as an exhausted progress fill, not the lighter generic red.

#### Scenario: Danger tone

- **WHEN** a status chip uses the `danger` tone
- **THEN** the chip uses the meter critical color
- **AND** it is visually distinct as a warning-red status in the header

#### Scenario: Positive tone

- **WHEN** a status chip uses the `positive` tone
- **THEN** the chip is visually distinct as a positive-green status in the header

#### Scenario: Warning tone

- **WHEN** a status chip uses the `warning` tone
- **THEN** the chip is visually distinct as a warning status in the header
