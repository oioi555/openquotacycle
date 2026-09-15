# antigravity-quota Specification

## Purpose
Provides reliable Antigravity quota reporting for authenticated Linux installations of the standalone Antigravity app and Antigravity IDE in Quotracker.

## Requirements

### Requirement: Linux Antigravity credentials

The plugin MUST search the Linux Antigravity profile databases at `~/.config/Antigravity/User/globalStorage/state.vscdb` and `~/.config/Antigravity IDE/User/globalStorage/state.vscdb`, and MUST use a profile for Cloud Code only when it contains a non-empty access token that is currently usable. It MUST NOT depend on the original macOS Application Support path. A refresh token by itself, or an expired access token even when a refresh token is present, MUST NOT be treated as a usable bearer credential by the plugin.

The plugin MUST accept both the legacy `jetskiStateSync.agentManagerInitState` credential record and the current `antigravityUnifiedStateSync.oauthToken` Topic record. The legacy `antigravityAuthStatus` record MAY provide standalone metadata or an API-key fallback when that value is usable, but its absence MUST NOT prevent use of a valid current OAuth record. The plugin MUST NOT send a stored refresh token to Google's OAuth token endpoint or persist a token obtained through a plugin-owned refresh flow.

The plugin MAY additionally read the OAuth access token that the `agy` CLI keeps in the OS keyring (Secret Service entry with service attribute `gemini`) as a Cloud Code bearer credential, validating the entry's expiry when present. This read MUST be read-only: the plugin MUST NOT read out, send, or persist the keyring refresh token, MUST NOT write keyring entries, and MUST NOT log keyring values. A missing, unreadable, or expired keyring entry MUST NOT fail the probe while other credential sources remain. The host MUST accept the Secret Service content type `text/plain; charset=utf8` (MIME parameters after the type) so `agy`/go-keyring items are readable.

#### Scenario: Linux standalone profile provides OAuth credentials

- **WHEN** the application platform is Linux and the standalone database contains a valid, unexpired Antigravity access token
- **THEN** the plugin uses that credential for quota retrieval without reading a macOS path

#### Scenario: Linux IDE profile provides the only OAuth credentials

- **WHEN** the standalone database is absent or has no usable token and the `Antigravity IDE` database contains a valid current OAuth access token
- **THEN** the plugin selects the IDE profile and can continue to quota retrieval

#### Scenario: Current OAuth Topic record is present without legacy auth keys

- **WHEN** a profile contains `antigravityUnifiedStateSync.oauthToken` but not `antigravityAuthStatus` or `jetskiStateSync.agentManagerInitState`, and its access token is valid
- **THEN** the plugin decodes the current OAuth token record and does not report missing authentication solely because legacy keys are absent

#### Scenario: Expired profile access token is not a usable bearer credential

- **WHEN** a profile contains an expired access token, regardless of whether it also contains a refresh token
- **THEN** the plugin does not send that access token to Cloud Code as a bearer credential

#### Scenario: Fresh agy keyring token works while profile tokens are expired

- **WHEN** the profile access tokens are expired and the OS keyring contains an unexpired `agy` access token under service attribute `gemini`
- **THEN** the plugin uses that keyring access token for the Cloud Code fallback without any OAuth refresh request

#### Scenario: agy keyring content type includes MIME parameters

- **WHEN** the Secret Service item for service `gemini` uses content type `text/plain; charset=utf8`
- **THEN** the host keychain read succeeds and the plugin can use the access token as a Cloud Code candidate

#### Scenario: Keyring entry is missing or expired

- **WHEN** the keyring has no `gemini` entry, the entry is unreadable, or its access token is expired
- **THEN** the plugin continues with the remaining credential sources as if no keyring existed

### Requirement: Linux language-server discovery

The plugin MUST discover Linux Antigravity local quota servers from the Linux language-server executable family and from the `agy` CLI process. For language-server processes, it MUST recognize both standalone and IDE app-data markers. For the `agy` CLI process, it MUST accept the exact CLI process without requiring an app-data marker or a CSRF flag, then discover its listening ports and attempt local quota retrieval.

Local requests MUST identify Linux in their request context rather than sending the inherited macOS value. A missing CSRF flag on the `agy` CLI source MUST NOT prevent local requests from being attempted.

#### Scenario: Linux language server is running

- **WHEN** the application platform is Linux and a process named `language_server_linux` or `language_server_linux_x64` exposes an Antigravity marker and port
- **THEN** the plugin discovers the port and attempts local quota retrieval

#### Scenario: Linux IDE marker is running

- **WHEN** the language-server command uses the `antigravity-ide` app-data marker
- **THEN** the plugin accepts that process as an Antigravity instance

#### Scenario: Antigravity CLI server is running

- **WHEN** the application platform is Linux, the `agy` CLI process exposes a listening port, and no GUI language-server process or app-data marker is present
- **THEN** the plugin accepts the markerless `agy` process and attempts local quota retrieval without requiring a CSRF flag

### Requirement: Quota output and fallback behavior

The plugin MUST prefer `RetrieveUserQuotaSummary` on the local language server, the `agy` CLI local server, and Cloud Code. It MUST map exact bucket IDs `gemini-5h`, `gemini-weekly`, `3p-5h`, and `3p-weekly` to `Session`, `Weekly`, `Claude`, and `Claude Wk`, with five-hour or seven-day period metadata. A parsed empty summary is authoritative and MUST NOT fall through to legacy model endpoints. When the summary endpoint is unavailable, the plugin MUST retain the legacy per-model fallback and its progress-line contract. If local discovery or local retrieval fails, the plugin MUST continue to use Cloud Code with a valid discovered or cached OAuth token. The plugin MUST NOT call Google's OAuth token endpoint, refresh an Antigravity refresh token, or write a newly refreshed Antigravity access token.

After every successful probe that yields at least one quota line, the plugin MAY persist a display-only snapshot of those lines (labels, usage, limits, reset timestamps, period durations, plan name; never tokens, refresh tokens, or API keys) in its plugin data directory. A reading with no quota lines MUST NOT overwrite an existing snapshot. When no supported source yields model quota data and a snapshot exists, the plugin MUST return the snapshot's quota lines with a visible stale status chip **and** the same non-empty actionable `error` string the throw path uses, and it MAY re-read local conversation spend so those tiles stay current. The host MUST keep those lines and show that `error` as the card callout (not a blocking empty card). The snapshot MUST NOT be used to send any network request. When no snapshot exists, the plugin MUST return a non-empty actionable provider error rather than silently returning an empty success.

#### Scenario: Legacy local quota fallback succeeds

- **WHEN** the local summary endpoint is unavailable and the legacy language-server response contains supported model pools
- **THEN** the plugin returns manifest-aligned `Session` and/or `Claude` five-hour progress lines with valid percentage and reset metadata

#### Scenario: Current local quota summary succeeds

- **WHEN** the local language server returns a valid `RetrieveUserQuotaSummary` response
- **THEN** the plugin returns the recognized `Session`, `Weekly`, `Claude`, and/or `Claude Wk` lines with the corresponding five-hour or seven-day metadata, without using legacy per-model quota data

#### Scenario: Antigravity CLI local quota summary succeeds

- **WHEN** the `agy` CLI local server returns a valid `RetrieveUserQuotaSummary` response while the Antigravity GUI is not running
- **THEN** the plugin returns the recognized quota lines from that local response without requiring Cloud Code credentials

#### Scenario: Local quota unavailable but Cloud Code succeeds

- **WHEN** language-server or `agy` CLI discovery or local quota calls fail, a discovered or cached access token is unexpired, and Cloud Code returns supported model quota data
- **THEN** the plugin returns the same quota lines through the Cloud Code fallback

#### Scenario: Successful probe persists a display-only snapshot

- **WHEN** a probe returns at least one quota line from any supported source
- **THEN** the plugin persists that reading as a display-only snapshot in its plugin data directory without writing any credential value

#### Scenario: Expired OAuth access token does not trigger plugin-owned refresh

- **WHEN** local discovery fails and the selected OAuth record has only an expired access token, even if a refresh token is present
- **THEN** the plugin makes no Google OAuth refresh request
- **AND** with a persisted snapshot it returns the snapshot's quota lines marked with a stale status chip and the same actionable `error` as the throw path, or without a snapshot it returns a non-empty actionable error

#### Scenario: Stale snapshot replaces the empty error after a reboot

- **WHEN** every quota source fails because no local server is running and the stored access token is expired, and a snapshot from an earlier successful probe exists
- **THEN** the plugin returns the snapshot's quota lines with a stale status chip instead of an empty error
- **AND** the returned `error` is the same actionable string as the no-snapshot throw
- **AND** conversation spend tiles are re-read from the local conversation databases

#### Scenario: Empty quota summary is authoritative

- **WHEN** either summary endpoint returns a valid response with an empty `groups` array
- **THEN** the plugin returns an empty quota result and does not call the legacy model endpoint

#### Scenario: Empty reading does not overwrite a snapshot

- **WHEN** a probe succeeds with zero quota lines while a snapshot from an earlier non-empty reading exists
- **THEN** the plugin does not replace that snapshot with the empty reading

#### Scenario: No supported quota source succeeds

- **WHEN** no local or Cloud Code response contains usable supported model quota data, no unexpired access token is available, and no snapshot exists
- **THEN** the plugin returns a non-empty error state and does not claim a successful quota reading

### Requirement: Unused five-hour windows are Not started

When a recognized five-hour pool (Session or Claude) is present but the quota summary has no reset time, that meter SHALL read `Not started` on the reset label instead of a countdown. The plugin MUST NOT drop a server-provided reset time just because rounded usage is 0%. A started five-hour window MAY still read 0% used after a tiny request.

The Overview meter MUST show that countdown whenever `resetsAt` is parseable. It MUST NOT hide the countdown behind `Not started` when used is 0%. OpenQuota's `isFreshSessionWindow` overlay (`sessionWindow && usedPercent === 0 && future resetsAt`) SHALL NOT be ported. The same rule applies to Claude (`3p-5h`) as to Session (`gemini-5h`). Weekly meters SHALL keep a normal reset countdown whenever a reset time is present.

#### Scenario: Gemini five-hour window has not started

- **WHEN** the quota summary includes `gemini-5h` with no usage and no reset time
- **THEN** the Session line is emitted without inventing a reset instant
- **AND** the visible reset label is `Not started`

#### Scenario: Tiny usage still has a five-hour countdown

- **WHEN** the quota summary includes `gemini-5h` with remaining fraction at or near 1 and a future reset time
- **THEN** the Session line keeps that `resetsAt`
- **AND** the visible reset label is the countdown, not `Not started`

#### Scenario: Claude tiny usage still has a five-hour countdown

- **WHEN** the quota summary includes `3p-5h` with remaining fraction at or near 1 and a future reset time
- **THEN** the Claude line keeps that `resetsAt`
- **AND** the visible reset label is the countdown, not `Not started`

#### Scenario: Overview does not hide a live five-hour countdown at 0%

- **WHEN** a five-hour Session or Claude progress line has used 0 and a parseable future `resetsAt`
- **THEN** the Overview reset label is the countdown
- **AND** it is not `Not started`

#### Scenario: Weekly window still counts down

- **WHEN** the quota summary includes `gemini-weekly` with a reset time
- **THEN** Weekly keeps that countdown even if the five-hour Gemini window has not started

### Requirement: Local conversation spend is optional

When Antigravity conversation databases exist under `~/.gemini/antigravity-cli/conversations/`, the provider SHALL add Today, Yesterday, and Last 30 Days token/spend tiles from generation records. Missing databases SHALL omit those tiles without failing quota meters. Conversation data SHALL NOT leave the machine.

#### Scenario: Conversation databases exist

- **WHEN** a conversation database contains priced generation token counts for today
- **THEN** the provider emits a Today spend line
- **AND** Session/Weekly/Claude quota meters still come from the quota API

#### Scenario: No conversation databases

- **WHEN** quota retrieval succeeds and no conversation databases are present
- **THEN** the provider still returns the quota meters
- **AND** it does not emit spend tiles

### Requirement: Official CLI credential wake

When a live Antigravity probe cannot be obtained because credentials are expired and no local server is available, the application MUST refresh credentials only by running the official `agy` CLI with argv `-p` `/quota` `--print-timeout` `1m`. It MUST NOT pass a model name, a free-form prompt, or Window Starter's window-start pin. It MUST NOT call Google's OAuth token endpoint, submit a refresh token, or write the keyring itself. It MUST NOT parse `/quota` stdout as quota; after a successful wake it MUST re-run the normal probe so Cloud Code can use the refreshed keyring access token.

The Auto-start agy setting MUST default off and MUST live on Antigravity Customize L2. When it is on, a Stale chip or the credential error MUST trigger at most one wake, then a re-probe, including when the setting is turned on while the card is already Stale. When `agy` is on PATH and the card still needs wake, the card MUST show a Start agy action (icon-only refresh with an explanatory tooltip; it MAY spin while wake is in flight) whether Auto-start is on or off. Reset All Customization MUST restore the setting to off.

The application MUST NOT spawn `agy -p /quota --print-timeout 1m` when an exact `agy` process is already running; it MUST re-probe only. Concurrent wakes MUST be serialized. A failed wake MUST NOT retry until a cooldown has elapsed. The spawned process MUST be bounded and MUST be allowed to exit; the application MUST NOT keep an `agy` daemon for this purpose.

#### Scenario: Auto-start wakes then live probe succeeds

- **WHEN** Auto-start agy is on, no `agy` process is running, and an Antigravity probe returns a Stale chip or a credential error
- **THEN** the application runs `agy` with argv `-p` `/quota` `--print-timeout` `1m` once
- **AND** after that process exits successfully it re-probes Antigravity
- **AND** it makes no Google OAuth token request of its own

#### Scenario: Off shows a Start agy action

- **WHEN** Auto-start agy is off, `agy` is on PATH, and the Antigravity card is showing a Stale chip or a credential error
- **THEN** the card presents a Start agy action
- **AND** activating it runs the same `-p` `/quota` `--print-timeout` `1m` one-shot and re-probes

#### Scenario: Auto-start on still shows the action while Stale

- **WHEN** Auto-start agy is on, `agy` is on PATH, and the Antigravity card is showing a Stale chip or a credential error
- **THEN** the card still presents the Start agy action
- **AND** the action indicates in-flight wake when a wake is running

#### Scenario: Turning Auto-start on while already Stale wakes immediately

- **WHEN** Auto-start agy is turned on, `agy` is on PATH, and the Antigravity card is already showing a Stale chip or a credential error
- **THEN** the application runs the `-p` `/quota` `--print-timeout` `1m` one-shot without waiting for another probe

#### Scenario: Running agy is not duplicated

- **WHEN** an exact `agy` process is already running and a wake would otherwise start
- **THEN** the application does not spawn another `agy`
- **AND** it re-probes using the existing process

#### Scenario: Wake is not a window start

- **WHEN** a credential wake runs
- **THEN** the argv does not include `--model` or Window Starter's starter prompt
- **AND** no Window Starter attempt record is written for that run

#### Scenario: Missing agy hides the action

- **WHEN** `agy` is not on PATH
- **THEN** the Start agy action is not shown
- **AND** Auto-start agy does not spawn a process

#### Scenario: Reset restores Auto-start off

- **WHEN** Reset All Customization runs
- **THEN** Auto-start agy is off
