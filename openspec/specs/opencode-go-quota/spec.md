# opencode-go-quota Specification

## Purpose
Expose OpenCode Go's server-reported quota windows without deriving account usage from local model costs or fixed dollar allowances.

## Requirements

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

### Requirement: Three authoritative windows map to provider lines

The provider SHALL map `usage.rolling` to Session (5 hours), `usage.weekly` to Weekly, and `usage.monthly` to Monthly. Each successful line SHALL use `limit: 100`, percent formatting, and the corresponding API `resetsAt` value.

#### Scenario: Complete usage response

- **WHEN** the response contains valid rolling, weekly, and monthly windows
- **THEN** all three provider lines are returned with the mapping above
- **AND** each line uses its own server-provided reset timestamp

#### Scenario: Monthly reset is returned by the server

- **WHEN** `usage.monthly.resetsAt` is present and valid
- **THEN** the Monthly line uses that timestamp directly after internal UTC normalization
- **AND** the provider supplies a calendar-aware duration derived from the preceding anchor solely for pace status and marker rendering
- **AND** no local history or manual correction is used to infer or override the reset timestamp

### Requirement: Percentages use the API's 0..100 used scale

The provider SHALL interpret each numeric API `percent` as a used percentage on a 0..100 scale. It SHALL clamp finite values below 0 to 0 and above 100 to 100, without multiplying values at or below 1 by 100. Existing remaining displays SHALL therefore represent `100 - percent`.

#### Scenario: Boundary percentages

- **WHEN** an API window reports percent `0`, `1`, `50`, `99`, or `100`
- **THEN** the provider exposes used values `0`, `1`, `50`, `99`, or `100` respectively
- **AND** the corresponding remaining values are `100`, `99`, `50`, `1`, or `0`

#### Scenario: Out-of-range percentage

- **WHEN** an API window reports a finite percent below 0 or above 100
- **THEN** the provider clamps it to 0 or 100 respectively

### Requirement: Stale persisted estimates are not shown as authoritative

The local usage cache SHALL NOT restore persisted OpenCode Go snapshots created without authoritative API provenance. A fresh provider probe SHALL be required before OpenCode Go quota is exposed through the local usage API.

#### Scenario: Startup with an old OpenCode Go snapshot

- **WHEN** the persisted cache contains an OpenCode Go snapshot from an earlier implementation
- **THEN** that snapshot is ignored on startup
- **AND** the local usage API waits for a fresh probe result

### Requirement: OpenCode data directory follows env overrides

The provider SHALL read `auth.json` and local databases from `$OPENCODE_DATA_DIR` when set, otherwise `$XDG_DATA_HOME/opencode`, otherwise `~/.local/share/opencode`.

#### Scenario: Custom data directory

- **WHEN** `OPENCODE_DATA_DIR` points to a directory that contains `auth.json` with a usable `opencode-go.key`
- **THEN** the provider uses that file for the Go usage request
- **AND** it does not require `~/.local/share/opencode/auth.json`

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

### Requirement: Entitlement errors are not auth failures

A 403 response whose body identifies `EntitlementError` SHALL mean the key is valid but has no Go subscription. The provider SHALL NOT treat that as a rejected key. A 401 SHALL remain a rejected key.

#### Scenario: Key has no Go plan

- **WHEN** the usage API returns 403 with `EntitlementError`
- **THEN** the provider does not show an authentication-failed status
- **AND** Go Session/Weekly/Monthly meters are omitted

#### Scenario: Key is rejected

- **WHEN** the usage API returns 401
- **THEN** the provider shows that the OpenCode Go key was rejected

### Requirement: Invalid responses fail closed

The provider SHALL treat a non-2xx response other than a 403 `EntitlementError`, a 401, a network failure, invalid JSON, missing Go window, unsupported status, non-numeric/non-finite percent, or invalid `resetsAt` as unavailable for the Go meters. It SHALL NOT silently fall back to local dollar estimates or manual correction data for those meters. Local spend tiles MAY still render from the database when Go meters are unavailable for entitlement reasons.

#### Scenario: Authentication or transport failure

- **WHEN** the usage request returns 401, another non-success status that is not a 403 `EntitlementError`, or a network error
- **THEN** the provider shows an unavailable status for the Go meters
- **AND** the last successful OpenCode Go quota is not reused by the provider

#### Scenario: Incomplete or malformed window

- **WHEN** any required Go window lacks an allowed status (`ok` or `rate-limited`), finite numeric percent, or timezone-qualified ISO-8601 `resetsAt`
- **THEN** the provider shows an unavailable status for the Go meters
