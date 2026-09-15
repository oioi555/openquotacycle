## Purpose

Provides reliable Antigravity quota reporting for authenticated Linux installations of the standalone Antigravity app and Antigravity IDE in this Linux-only Tuxmeter fork.

## ADDED Requirements

### Requirement: Linux Antigravity credentials

The plugin MUST search the Linux Antigravity profile databases at `~/.config/Antigravity/User/globalStorage/state.vscdb` and `~/.config/Antigravity IDE/User/globalStorage/state.vscdb`, and MUST use a profile only when it contains a usable access token or refreshable OAuth credentials. It MUST NOT depend on the original macOS Application Support path.

The plugin MUST accept both the legacy `jetskiStateSync.agentManagerInitState` credential record and the current `antigravityUnifiedStateSync.oauthToken` Topic record. The legacy `antigravityAuthStatus` record MAY provide standalone metadata or an API-key fallback, but its absence MUST NOT prevent use of a valid current OAuth record.

#### Scenario: Linux standalone profile provides OAuth credentials

- **WHEN** the application platform is Linux and the standalone database contains a valid Antigravity OAuth record
- **THEN** the plugin uses that credential for quota retrieval without reading a macOS path

#### Scenario: Linux IDE profile provides the only OAuth credentials

- **WHEN** the standalone database is absent or has no usable token and the `Antigravity IDE` database contains a valid current OAuth record
- **THEN** the plugin selects the IDE profile and can continue to quota retrieval

#### Scenario: Current OAuth Topic record is present without legacy auth keys

- **WHEN** a profile contains `antigravityUnifiedStateSync.oauthToken` but not `antigravityAuthStatus` or `jetskiStateSync.agentManagerInitState`
- **THEN** the plugin decodes the current OAuth token record and does not report missing authentication solely because legacy keys are absent

### Requirement: Linux language-server discovery

The plugin MUST discover the Linux Antigravity language server using the Linux executable family and MUST recognize both standalone and IDE app-data markers.

Language-server requests MUST identify Linux in their request context rather than sending the inherited macOS value.

#### Scenario: Linux language server is running

- **WHEN** the application platform is Linux and a process named `language_server_linux` or `language_server_linux_x64` exposes an Antigravity marker and port
- **THEN** the plugin discovers the port and attempts local quota retrieval

#### Scenario: Linux IDE marker is running

- **WHEN** the language-server command uses the `antigravity-ide` app-data marker
- **THEN** the plugin accepts that process as an Antigravity instance

### Requirement: Quota output and fallback behavior

The plugin MUST prefer `RetrieveUserQuotaSummary` on both the local language server and Cloud Code. It MUST map exact bucket IDs `gemini-5h`, `gemini-weekly`, `3p-5h`, and `3p-weekly` to `Session`, `Weekly`, `Claude`, and `Claude Weekly`, with five-hour or seven-day period metadata. A parsed empty summary is authoritative and MUST NOT fall through to legacy model endpoints. When the summary endpoint is unavailable, the plugin MUST retain the legacy per-model fallback and its progress-line contract. If local discovery or local retrieval fails, the plugin MUST continue to use Cloud Code with a valid discovered or cached/refreshed OAuth token. If no supported source yields model quota data, the plugin MUST return an actionable provider error rather than silently returning an empty success.

#### Scenario: Legacy local quota fallback succeeds

- **WHEN** the local summary endpoint is unavailable and the legacy language-server response contains supported model pools
- **THEN** the plugin returns manifest-aligned `Session` and/or `Claude` five-hour progress lines with valid percentage and reset metadata

#### Scenario: Current local quota summary succeeds

- **WHEN** the local language server returns a valid `RetrieveUserQuotaSummary` response
- **THEN** the plugin returns the recognized `Session`, `Weekly`, `Claude`, and/or `Claude Weekly` lines with the corresponding five-hour or seven-day metadata, without using legacy per-model quota data

#### Scenario: Local quota unavailable but Cloud Code succeeds

- **WHEN** language-server discovery or local quota calls fail and Cloud Code returns supported model quota data
- **THEN** the plugin returns the same quota lines through the Cloud Code fallback

#### Scenario: Empty quota summary is authoritative

- **WHEN** either summary endpoint returns a valid response with an empty `groups` array
- **THEN** the plugin returns an empty quota result and does not call the legacy model endpoint

#### Scenario: No supported quota source succeeds

- **WHEN** no local or Cloud Code response contains usable supported model quota data
- **THEN** the plugin returns a non-empty error state and does not claim a successful quota reading
