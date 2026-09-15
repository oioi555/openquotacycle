# OpenCode Go quota Specification

## Purpose

Expose OpenCode Go's server-reported quota windows without deriving account usage from local model costs or fixed dollar allowances.

## ADDED Requirements

### Requirement: Authenticated usage API is the quota source of truth

The OpenCode Go provider SHALL request `GET https://opencode.ai/zen/go/v1/usage` with an `Authorization: Bearer <key>` header. The key SHALL be read from the existing `opencode-go.key` entry in `~/.local/share/opencode/auth.json`; the provider SHALL NOT introduce another credential store or log the key.

#### Scenario: Existing OpenCode Go key is available

- **WHEN** `auth.json` contains a non-empty `opencode-go.key`
- **THEN** the provider requests the fixed HTTPS usage endpoint with that key as a Bearer credential
- **AND** the provider does not query local SQLite costs to calculate quota

#### Scenario: OpenCode Go key is unavailable

- **WHEN** the auth file is missing, unreadable, malformed, or has no usable key
- **THEN** the provider exposes an unavailable status
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

### Requirement: Invalid responses fail closed

The provider SHALL treat a non-2xx response, 401/403, network failure, invalid JSON, missing window, unsupported status, non-numeric/non-finite percent, or invalid `resetsAt` as unavailable. It SHALL NOT silently fall back to local dollar estimates or manual correction data.

#### Scenario: Authentication or transport failure

- **WHEN** the usage request returns 401/403, another non-success status, or a network error
- **THEN** the provider shows an unavailable status
- **AND** the last successful OpenCode Go quota is not reused by the provider

#### Scenario: Incomplete or malformed window

- **WHEN** any required window lacks an allowed status (`ok` or `rate-limited`), finite numeric percent, or timezone-qualified ISO-8601 `resetsAt`
- **THEN** the provider shows an unavailable status for the response

### Requirement: Stale persisted estimates are not shown as authoritative

The local usage cache SHALL NOT restore persisted OpenCode Go snapshots created without authoritative API provenance. A fresh provider probe SHALL be required before OpenCode Go quota is exposed through the local usage API.

#### Scenario: Startup with an old OpenCode Go snapshot

- **WHEN** the persisted cache contains an OpenCode Go snapshot from an earlier implementation
- **THEN** that snapshot is ignored on startup
- **AND** the local usage API waits for a fresh probe result
