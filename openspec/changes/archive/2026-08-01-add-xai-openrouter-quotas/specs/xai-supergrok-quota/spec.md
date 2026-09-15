## Purpose

Provide SuperGrok subscription quota in Tuxmeter by reading GrokBuild's
`~/.grok/auth.json` credentials read-only.

## ADDED Requirements

### Requirement: Read SuperGrok quota from GrokBuild authentication

The system SHALL scan all entries in `~/.grok/auth.json` and SHALL use the
first entry that is an object with a non-empty `key`. GrokBuild entry keys use
`<scope>::<client_id>` (for example `https://auth.x.ai::<client_id>`). The
system SHALL query the SuperGrok billing meter and SHALL treat
`~/.grok/auth.json` as read-only: the system SHALL NOT refresh tokens, write
the file, or call OAuth endpoints.

#### Scenario: Configured GrokBuild credential

- **WHEN** `~/.grok/auth.json` contains an entry with a non-empty `key`
- **THEN** the system queries the SuperGrok billing endpoint and exposes the current period quota

#### Scenario: Entries without a usable key

- **WHEN** no entry is an object with a non-empty `key`
- **THEN** the system reports that xAI must be connected in GrokBuild

#### Scenario: Missing or expired credential

- **WHEN** the credential is missing or expired (`expires_at` ISO datetime in
  the past, falling back to the key's JWT `exp` claim)
- **THEN** the system reports that xAI must be connected or refreshed in GrokBuild

#### Scenario: Read-only auth

- **WHEN** the system has loaded the credential
- **THEN** it never writes `~/.grok/auth.json` and never calls OAuth endpoints

### Requirement: Render the SuperGrok period quota

The system SHALL render the reported credit usage percentage as a progress
line with a 100 percent limit and the billing period end as its reset time,
falling back to the billing response's `config.billingPeriodEnd` when the
current period omits its end. It SHALL provide the period duration when the
billing response provides valid period boundaries so the UI can calculate pace
status and markers.

#### Scenario: Weekly quota response

- **WHEN** the billing response reports a weekly period and 40 percent usage
- **THEN** the system renders a Weekly progress line with 40 used and 100 limit

#### Scenario: Omitted zero usage

- **WHEN** the billing response has a current period but omits the usage percentage
- **THEN** the system treats usage as zero percent

#### Scenario: Missing period end falls back to billingPeriodEnd

- **WHEN** the current period omits `end` but the billing response provides `config.billingPeriodEnd`
- **THEN** the system uses `config.billingPeriodEnd` as the reset time

#### Scenario: Pace context is available

- **WHEN** the billing response provides valid start and end timestamps
- **THEN** the progress line includes their positive duration and the UI can render pace status and the in-bar time marker

#### Scenario: Billing request failure

- **WHEN** the billing endpoint returns an authentication, HTTP, network, or invalid-response error
- **THEN** the system reports a provider-specific actionable error without exposing the token

### Requirement: Show stale quota when authentication fails

The system SHALL cache the last successful quota window (display fields only)
under the plugin data directory and SHALL render that cached window with a
"Stale · reconnect xAI in GrokBuild" Status badge when the GrokBuild credential
is expired or unreadable, or the billing request fails with an authentication,
network, or server error. The system SHALL never refresh tokens, write
`~/.grok/auth.json`, or call OAuth endpoints.

#### Scenario: Expired credential with a cached window

- **WHEN** the GrokBuild credential is expired and a valid cached window exists
- **THEN** the system renders the cached progress line with a stale Status badge instead of failing

#### Scenario: Failed billing request with a cached window

- **WHEN** the billing request fails with a 401/403, network, or 5xx error and a valid cached window exists
- **THEN** the system renders the cached progress line with a stale Status badge

#### Scenario: No cached window

- **WHEN** authentication fails and no valid cached window exists
- **THEN** the system reports the regular actionable connect or refresh error

#### Scenario: Successful refresh overwrites the cache

- **WHEN** a later billing request succeeds
- **THEN** the system overwrites the cached window with the fresh quota

#### Scenario: Snapshot stores display fields only

- **WHEN** the system persists the cached window
- **THEN** only display fields are written and access or refresh tokens are never stored
