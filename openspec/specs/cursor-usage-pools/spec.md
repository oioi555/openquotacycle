# cursor-usage-pools Specification

## Purpose
Provide Cursor usage metrics whose labels and semantics match the two included-usage pools shown by Cursor's official dashboard.

## Requirements

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

### Requirement: Grok Bot is a nonfatal Cursor meter

The Cursor provider SHALL request Grok Bot usage with the existing Cursor login. When the response includes a usable weekly percent, the provider SHALL emit a `Grok Bot` progress line with that percent and reset countdown. A Grok Bot lookup failure SHALL NOT fail the probe when primary Cursor usage is already available.

#### Scenario: Grok Bot usage is present

- **WHEN** Cursor returns a finite Grok Bot weekly used percent and reset time
- **THEN** the provider emits a Grok Bot progress line with limit 100 and that reset time

#### Scenario: Grok Bot lookup fails

- **WHEN** primary dashboard usage succeeds
- **AND** the Grok Bot request fails
- **THEN** the provider still returns Credits, Cursor, Other, and other successful meters
- **AND** Grok Bot is omitted

### Requirement: Aggregate Total usage is retired

The Cursor provider SHALL expose `Total Usage` when Cursor returns a finite `totalPercentUsed` (or the equivalent plan-usage percent/dollars). The provider SHALL NOT synthesize Total Usage by adding or otherwise combining the Cursor and Other pool percentages. When only the aggregate is present, Total Usage MAY be shown without inventing pool rows.

#### Scenario: Cursor returns an aggregate percentage

- **WHEN** a successful Cursor response contains `totalPercentUsed` together with one or both pool percentages
- **THEN** the provider exposes Total Usage from that aggregate value
- **AND** it still exposes the available named pool metrics without combining them into Total Usage

#### Scenario: Cursor returns only an aggregate percentage

- **WHEN** a successful Cursor response contains `totalPercentUsed` but no valid pool percentage
- **THEN** the provider exposes Total Usage from that aggregate value
- **AND** the provider does not synthesize either named pool metric from the aggregate value

### Requirement: Overview presents the independent pools

The Cursor overview SHALL present Total Usage when available, then `Cursor` and `Other` as the included-usage pool metrics, using the same percentage values shown in their respective provider output. Credits, request-based usage, On-demand, and Grok Bot metrics SHALL retain their existing availability and semantics.

#### Scenario: Cursor overview renders included usage

- **WHEN** the provider returns either named pool metric
- **THEN** the overview displays that metric under its official label

#### Scenario: Optional non-pool metrics are available

- **WHEN** Cursor returns credits, request-based usage, On-demand, or Grok Bot data
- **THEN** the corresponding existing OpenQuotaCycle metric remains available without being renamed to a pool metric
