## ADDED Requirements

### Requirement: Pay-as-you-go cap is a status badge

The provider SHALL expose Extra Usage as a pay-as-you-go cap status. A positive cap SHALL show that cap. A missing or zero cap SHALL show `Disabled`. This badge SHALL NOT require a token refresh or a write to `~/.grok/auth.json`.

#### Scenario: Pay-as-you-go is enabled

- **WHEN** the billing response reports a positive on-demand cap
- **THEN** the provider emits an Extra Usage badge that includes that cap

#### Scenario: Pay-as-you-go is disabled

- **WHEN** the billing response omits the on-demand cap or reports 0
- **THEN** the provider emits an Extra Usage badge with text `Disabled`

## MODIFIED Requirements

### Requirement: Render the SuperGrok period quota

The system SHALL render the reported credit usage percentage as a Weekly progress line with a 100 percent limit and the billing period end as its reset time only when the current period is weekly. Accounts whose current period is monthly or otherwise non-weekly SHALL omit Weekly rather than relabel that percent as Monthly or Daily. When the current period omits its end, the provider SHALL fall back to `config.billingPeriodEnd`. It SHALL provide the period duration when the billing response provides valid weekly period boundaries so the UI can calculate pace status and markers.

#### Scenario: Weekly quota response

- **WHEN** the billing response reports a weekly period and 40 percent usage
- **THEN** the system renders a Weekly progress line with 40 used and 100 limit

#### Scenario: Non-weekly period is not relabeled

- **WHEN** the billing response reports a monthly or daily current period
- **THEN** the provider omits the Weekly progress line
- **AND** it does not emit Monthly or Daily progress lines from that percent

#### Scenario: Omitted zero usage

- **WHEN** the billing response has a current weekly period but omits the usage percentage
- **THEN** the system treats usage as zero percent

#### Scenario: Missing period end falls back to billingPeriodEnd

- **WHEN** the current period omits `end` but the billing response provides `config.billingPeriodEnd`
- **THEN** the system uses `config.billingPeriodEnd` as the reset time

#### Scenario: Pace context is available

- **WHEN** the billing response provides valid start and end timestamps for a weekly period
- **THEN** the progress line includes their positive duration and the UI can render pace status and the in-bar time marker

#### Scenario: Billing request failure

- **WHEN** the billing endpoint returns an authentication, HTTP, network, or invalid-response error
- **THEN** the system reports a provider-specific actionable error without exposing the token
