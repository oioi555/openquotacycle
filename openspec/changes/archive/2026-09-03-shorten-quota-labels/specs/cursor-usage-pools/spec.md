## MODIFIED Requirements

### Requirement: Cursor pool metrics use official labels

The Cursor provider SHALL expose the two included-usage pools as monthly
percentage progress metrics named `Cursor` and `Other`.
`Cursor` SHALL represent Cursor's Cursor-model pool, and `Other`
SHALL represent third-party model usage. When Cursor supplies valid billing
cycle dates, both metrics SHALL use the cycle end as `resetsAt` and the
start-to-end difference as `periodDurationMs`.

#### Scenario: Both included-usage pools are present

- **WHEN** Cursor returns finite `autoPercentUsed` and `apiPercentUsed` values
- **THEN** the provider returns a `Cursor` progress metric with the `autoPercentUsed` value and an `Other` progress metric with the `apiPercentUsed` value, both with a 100-percent limit, monthly billing-cycle reset metadata, and the cycle-end reset time

#### Scenario: Monthly cycle duration is preserved

- **WHEN** Cursor returns valid `billingCycleStart` and `billingCycleEnd` values
- **THEN** each pool metric has `resetsAt` equal to the billing-cycle end and `periodDurationMs` equal to `billingCycleEnd - billingCycleStart`, without a session or weekly duration

#### Scenario: One included-usage pool is absent

- **WHEN** Cursor omits or returns a non-finite value for one pool percentage
- **THEN** the provider omits only that pool metric and still returns the other valid pool metric

### Requirement: Overview presents the independent pools

The Cursor overview SHALL present `Cursor` and `Other` as the primary included-usage metrics, using the same percentage values shown in their respective provider output. Credits, request-based usage, and On-demand metrics SHALL retain their existing availability and semantics.

#### Scenario: Cursor overview renders included usage

- **WHEN** the provider returns either named pool metric
- **THEN** the overview displays that metric under its official label and does not display an aggregate usage row

#### Scenario: Optional non-pool metrics are available

- **WHEN** Cursor returns credits, request-based usage, or On-demand data
- **THEN** the corresponding existing Tuxmeter metric remains available without being renamed to a pool metric
