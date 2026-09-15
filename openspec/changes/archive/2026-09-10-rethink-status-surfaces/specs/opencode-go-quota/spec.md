## MODIFIED Requirements

### Requirement: Authenticated usage API is the quota source of truth

The OpenCode Go provider SHALL request `GET https://opencode.ai/zen/go/v1/usage` with an `Authorization: Bearer <key>` header. The key SHALL be read from the existing `opencode-go.key` entry in the resolved OpenCode data directory; the provider SHALL NOT introduce another credential store or log the key.

#### Scenario: Existing OpenCode Go key is available

- **WHEN** `auth.json` contains a non-empty `opencode-go.key`
- **THEN** the provider requests the fixed HTTPS usage endpoint with that key as a Bearer credential
- **AND** the provider does not query local SQLite costs to calculate quota

#### Scenario: OpenCode Go key is unavailable

- **WHEN** the auth file is missing, unreadable, malformed, or has no usable key
- **AND** there is no local hosted spend to show
- **THEN** the provider throws an authentication error
- **AND** it does not emit a Status badge
- **AND** it does not display a locally estimated quota
