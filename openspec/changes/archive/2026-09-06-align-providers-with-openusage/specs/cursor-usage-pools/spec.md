## ADDED Requirements

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

## MODIFIED Requirements

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
- **THEN** the corresponding Quotracker metric remains available without being renamed to a pool metric
