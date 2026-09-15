## Purpose

Provide Cursor usage metrics whose labels and semantics match the two included-usage pools shown by Cursor's official dashboard.

## ADDED Requirements

### Requirement: Cursor Desktop authentication is platform-aware

The Cursor provider SHALL read Cursor Desktop credentials from the platform's
state database: Linux from `~/.config/Cursor/User/globalStorage/state.vscdb`
and macOS from `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`.
When an access token is refreshed, the provider SHALL persist it to the source
from which the active credentials were loaded. Missing-auth guidance SHALL
direct the user to sign in through the Cursor app and SHALL NOT require an
unrelated `agent login` command.

#### Scenario: Linux Cursor Desktop credentials are available

- **WHEN** the Linux state database contains `cursorAuth/accessToken` and
  `cursorAuth/refreshToken`
- **THEN** the provider loads those credentials and can proceed to fetch Cursor
  usage without requiring keychain entries or CLI login

#### Scenario: Refreshed Linux token is persisted

- **WHEN** a Linux-loaded Cursor access token is expired and refresh succeeds
- **THEN** the refreshed access token is written back to the Linux state database

### Requirement: Cursor pool metrics use official labels

The Cursor provider SHALL expose the two included-usage pools as monthly
percentage progress metrics named `Cursor Models` and `Other Models`.
`Cursor Models` SHALL represent Cursor's Cursor-model pool, and `Other Models`
SHALL represent third-party model usage. When Cursor supplies valid billing
cycle dates, both metrics SHALL use the cycle end as `resetsAt` and the
start-to-end difference as `periodDurationMs`.

#### Scenario: Both included-usage pools are present

- **WHEN** Cursor returns finite `autoPercentUsed` and `apiPercentUsed` values
- **THEN** the provider returns a `Cursor Models` progress metric with the `autoPercentUsed` value and an `Other Models` progress metric with the `apiPercentUsed` value, both with a 100-percent limit, monthly billing-cycle reset metadata, and the cycle-end reset time

#### Scenario: Monthly cycle duration is preserved

- **WHEN** Cursor returns valid `billingCycleStart` and `billingCycleEnd` values
- **THEN** each pool metric has `resetsAt` equal to the billing-cycle end and `periodDurationMs` equal to `billingCycleEnd - billingCycleStart`, without a session or weekly duration

#### Scenario: One included-usage pool is absent

- **WHEN** Cursor omits or returns a non-finite value for one pool percentage
- **THEN** the provider omits only that pool metric and still returns the other valid pool metric

### Requirement: Aggregate Total usage is retired

The Cursor provider SHALL NOT expose a `Total usage` metric in the overview, provider detail view, or local usage API output. The provider SHALL NOT derive a replacement aggregate by adding or otherwise combining the two pool percentages.

#### Scenario: Cursor returns an aggregate percentage

- **WHEN** a successful Cursor response contains `totalPercentUsed` together with one or both pool percentages
- **THEN** the provider omits `Total usage` and exposes only the available named pool metrics

#### Scenario: Cursor returns only an aggregate percentage

- **WHEN** a successful Cursor response contains `totalPercentUsed` but no valid pool percentage
- **THEN** the provider does not synthesize either named pool metric from the aggregate value and does not expose `Total usage`

### Requirement: Overview presents the independent pools

The Cursor overview SHALL present `Cursor Models` and `Other Models` as the primary included-usage metrics, using the same percentage values shown in their respective provider output. Credits, request-based usage, and On-demand metrics SHALL retain their existing availability and semantics.

#### Scenario: Cursor overview renders included usage

- **WHEN** the provider returns either named pool metric
- **THEN** the overview displays that metric under its official label and does not display an aggregate usage row

#### Scenario: Optional non-pool metrics are available

- **WHEN** Cursor returns credits, request-based usage, or On-demand data
- **THEN** the corresponding existing Tuxmeter metric remains available without being renamed to a pool metric
