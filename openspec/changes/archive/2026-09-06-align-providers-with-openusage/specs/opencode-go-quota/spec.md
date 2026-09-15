## ADDED Requirements

### Requirement: OpenCode data directory follows env overrides

The provider SHALL read `auth.json` and local databases from `$OPENCODE_DATA_DIR` when set, otherwise `$XDG_DATA_HOME/opencode`, otherwise `~/.local/share/opencode`.

#### Scenario: Custom data directory

- **WHEN** `OPENCODE_DATA_DIR` points to a directory that contains `auth.json` with a usable `opencode-go.key`
- **THEN** the provider uses that file for the Go usage request
- **AND** it does not require `~/.local/share/opencode/auth.json`

### Requirement: Local Go and Zen spend tiles

The provider SHALL add Today, Yesterday, and Last 30 Days spend tiles from local `opencode*.db` assistant-message cost and tokens for `opencode-go` and `opencode` (Zen) rows. OpenCode ChatGPT OAuth usage SHALL NOT be mixed into those tiles. A period with no local hosted usage SHALL read as no data rather than `$0.00`.

#### Scenario: Local hosted spend exists

- **WHEN** an OpenCode database in the data directory contains Go or Zen assistant-message costs for today
- **THEN** the provider emits a Today spend line with that cost and token total

#### Scenario: Zen-only account

- **WHEN** the Go usage API reports no Go subscription
- **AND** local Zen spend exists
- **THEN** Session/Weekly/Monthly Go meters are omitted
- **AND** the spend tiles still render

### Requirement: Entitlement errors are not auth failures

A 403 response whose body identifies `EntitlementError` SHALL mean the key is valid but has no Go subscription. The provider SHALL NOT treat that as a rejected key. A 401 SHALL remain a rejected key.

#### Scenario: Key has no Go plan

- **WHEN** the usage API returns 403 with `EntitlementError`
- **THEN** the provider does not show an authentication-failed status
- **AND** Go Session/Weekly/Monthly meters are omitted

#### Scenario: Key is rejected

- **WHEN** the usage API returns 401
- **THEN** the provider shows that the OpenCode Go key was rejected

## MODIFIED Requirements

### Requirement: Invalid responses fail closed

The provider SHALL treat a non-2xx response other than a 403 `EntitlementError`, a 401, a network failure, invalid JSON, missing Go window, unsupported status, non-numeric/non-finite percent, or invalid `resetsAt` as unavailable for the Go meters. It SHALL NOT silently fall back to local dollar estimates or manual correction data for those meters. Local spend tiles MAY still render from the database when Go meters are unavailable for entitlement reasons.

#### Scenario: Authentication or transport failure

- **WHEN** the usage request returns 401, another non-success status that is not a 403 `EntitlementError`, or a network error
- **THEN** the provider shows an unavailable status for the Go meters
- **AND** the last successful OpenCode Go quota is not reused by the provider

#### Scenario: Incomplete or malformed window

- **WHEN** any required Go window lacks an allowed status (`ok` or `rate-limited`), finite numeric percent, or timezone-qualified ISO-8601 `resetsAt`
- **THEN** the provider shows an unavailable status for the Go meters
