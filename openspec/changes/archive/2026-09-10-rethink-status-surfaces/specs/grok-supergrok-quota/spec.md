## RENAMED Requirements

- FROM: `### Requirement: Pay-as-you-go cap is a status badge`
- TO: `### Requirement: Pay-as-you-go cap is an Extra Usage metric`

## MODIFIED Requirements

### Requirement: Pay-as-you-go cap is an Extra Usage metric

The provider SHALL expose Extra Usage as a pay-as-you-go extra-API cap text metric. A positive cap SHALL show that cap. A missing or zero cap SHALL omit Extra Usage. Extra Usage SHALL participate in Customize Always Visible / On Demand (default On Demand). This SHALL NOT require a token refresh or a write to `~/.grok/auth.json`.

#### Scenario: Pay-as-you-go is enabled

- **WHEN** the billing response reports a positive on-demand cap
- **THEN** the provider emits an Extra Usage text line that includes that cap

#### Scenario: Pay-as-you-go is disabled

- **WHEN** the billing response omits the on-demand cap or reports 0
- **THEN** the provider does not emit an Extra Usage line

### Requirement: Show stale quota when authentication fails

The system SHALL cache the last successful quota window (display fields only)
under the plugin data directory and SHALL render that cached window with a
warning-tone header status chip `Stale` when the GrokBuild credential
is expired or unreadable, or the billing request fails with an authentication,
network, or server error. The system SHALL never refresh tokens, write
`~/.grok/auth.json`, or call OAuth endpoints.

#### Scenario: Expired credential with a cached window

- **WHEN** the GrokBuild credential is expired and a valid cached window exists
- **THEN** the system renders the cached progress line with a Stale header chip instead of failing

#### Scenario: Failed billing request with a cached window

- **WHEN** the billing request fails with a 401/403, network, or 5xx error and a valid cached window exists
- **THEN** the system renders the cached progress line with a Stale header chip

#### Scenario: No cached window

- **WHEN** authentication fails and no valid cached window exists
- **THEN** the system reports the regular actionable connect or refresh error

#### Scenario: Successful refresh overwrites the cache

- **WHEN** a later billing request succeeds
- **THEN** the system overwrites the cached window with the fresh quota

#### Scenario: Snapshot stores display fields only

- **WHEN** the system persists the cached window
- **THEN** only display fields are written and access or refresh tokens are never stored
