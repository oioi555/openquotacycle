## RENAMED Requirements

- FROM: `### Requirement: Z.ai peak status badge`
- TO: `### Requirement: Z.ai peak status in the provider header`

## MODIFIED Requirements

### Requirement: Z.ai peak status in the provider header

Each successful authenticated Z.ai probe SHALL expose Peak Hours as a header status chip using `Peak` with the `danger` tone or `Off-Peak` with the `positive` tone according to the current classification. The chip SHALL be visible in the provider header on Overview, including when quota usage data is empty, and SHALL NOT appear as a metric-row badge. It SHALL NOT alter existing quota values or reset metadata.

#### Scenario: Peak status is displayed

- **WHEN** a successful Z.ai probe runs during the peak window
- **THEN** the Z.ai provider header displays a danger-tone chip with text `Peak` and the card body has no Peak Hours metric row

#### Scenario: Off-peak status is displayed

- **WHEN** a successful Z.ai probe runs outside the peak window
- **THEN** the Z.ai provider header displays a positive-tone chip with text `Off-Peak` and the card body has no Peak Hours metric row

#### Scenario: Quota data is empty

- **WHEN** an authenticated Z.ai quota response succeeds but contains no usable quota limits
- **THEN** the peak status chip remains in the header and the probe does not emit a No usage data badge

#### Scenario: Existing quota metrics are emitted

- **WHEN** a successful Z.ai probe emits session, weekly, or web-search quota metrics
- **THEN** adding the peak status chip does not change their usage values, limits, reset timestamps, or period durations
