## REMOVED Requirements

### Requirement: Local Go and Zen spend tiles

**Reason**: Quotracker does not support Zen as a provider. Mixing `opencode` (Zen) local costs into the OpenCode Go card advertised Zen spend that this plugin does not track.

**Migration**: Spend tiles now follow Local Go spend tiles and count `opencode-go` rows only.

The provider SHALL add Today, Yesterday, and Last 30 Days spend tiles from local `opencode*.db` assistant-message cost and tokens for `opencode-go` and `opencode` (Zen) rows. OpenCode ChatGPT OAuth usage SHALL NOT be mixed into those tiles. A period with no local hosted usage SHALL read as no data rather than `$0.00`.

#### Scenario: Local hosted spend exists

- **WHEN** an OpenCode database in the data directory contains Go or Zen assistant-message costs for today
- **THEN** the provider emits a Today spend line with that cost and token total

#### Scenario: Zen-only account

- **WHEN** the Go usage API reports no Go subscription
- **AND** local Zen spend exists
- **THEN** Session/Weekly/Monthly Go meters are omitted
- **AND** the spend tiles still render

## ADDED Requirements

### Requirement: Local Go spend tiles

The provider SHALL add Today, Yesterday, and Last 30 Days spend tiles from local `opencode*.db` assistant-message cost and tokens for `opencode-go` rows only. It SHALL NOT mix Zen (`opencode`) rows, OpenCode ChatGPT OAuth usage, or any other provider ID into those tiles. A period with no local Go usage SHALL read as no data rather than `$0.00`.

#### Scenario: Local Go spend exists

- **WHEN** an OpenCode database in the data directory contains `opencode-go` assistant-message costs for today
- **THEN** the provider emits a Today spend line with that cost and token total

#### Scenario: Zen rows are ignored

- **WHEN** the database also contains assistant-message costs with providerID `opencode`
- **THEN** those Zen rows are omitted from Today, Yesterday, and Last 30 Days

#### Scenario: Entitlement with Go spend

- **WHEN** the Go usage API reports no Go subscription
- **AND** local `opencode-go` spend exists
- **THEN** Session/Weekly/Monthly Go meters are omitted
- **AND** the Go spend tiles still render

#### Scenario: Entitlement with only Zen spend

- **WHEN** the Go usage API reports no Go subscription
- **AND** local spend exists only for providerID `opencode`
- **THEN** the provider does not emit spend tiles
- **AND** it fails closed as having no Go subscription
