# grok-supergrok-quota Specification

## Purpose

Provide SuperGrok subscription quota in Quotracker by reading GrokBuild's
`~/.grok/auth.json` credentials, without owning any OAuth refresh or credential
persistence.

## Background

GrokBuild owns the `~/.grok/auth.json` store and its token refresh, so Quotracker
only reads the file and must never write to it or call OAuth endpoints. This
avoids races with GrokBuild's own auth updates.

## Requirements

### Requirement: Read SuperGrok quota from GrokBuild authentication

The system SHALL scan all entries in `~/.grok/auth.json` and use the first
entry that is an object with a non-empty `key` (GrokBuild keys entries by
`<scope>::<client_id>`, for example `https://auth.x.ai::<client_id>`). It SHALL
query the SuperGrok billing meter and SHALL treat `~/.grok/auth.json` as
read-only: the system SHALL NOT refresh tokens, write the file, or call OAuth
endpoints.

#### Scenario: Configured GrokBuild credential

- **WHEN** `~/.grok/auth.json` contains an entry with a non-empty `key`
- **THEN** the system queries the SuperGrok billing endpoint and exposes the current period quota

#### Scenario: Entries without a usable key

- **WHEN** no entry is an object with a non-empty `key`
- **THEN** the system reports that Grok must be connected in GrokBuild

#### Scenario: Missing or expired credential

- **WHEN** the credential is missing or expired (`expires_at` ISO datetime in
  the past, falling back to the key's JWT `exp` claim)
- **THEN** the system reports that Grok must be connected or refreshed in GrokBuild

#### Scenario: Read-only auth

- **WHEN** the system has loaded the credential
- **THEN** it never writes `~/.grok/auth.json` and never calls OAuth endpoints

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

- **WHEN** the billing response has a current period but omits the usage percentage
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
warning-tone header status chip `Stale` when the Grok Build credential
is expired or unreadable, or the billing request fails with an authentication,
network, or server error. The rendered error SHALL be the same non-empty
actionable string the no-snapshot throw path uses, shown as the card callout
beside the cached line. The quota probe path SHALL never refresh tokens, write
`~/.grok/auth.json`, or call OAuth endpoints; the only credential remedy the
application MAY perform is running the official Grok Build CLI one-shot
specified by the Official CLI credential wake requirement.

#### Scenario: Expired credential with a cached window

- **WHEN** the Grok Build credential is expired and a valid cached window exists
- **THEN** the system renders the cached progress line with a Stale header chip and the wake-actionable credential error as the callout

#### Scenario: Failed billing request with a cached window

- **WHEN** the billing request fails with a 401/403, network, or 5xx error and a valid cached window exists
- **THEN** the system renders the cached progress line with a Stale header chip and the matching actionable error as the callout

#### Scenario: No cached window

- **WHEN** authentication fails and no valid cached window exists
- **THEN** the system reports the wake-actionable credential error or the regular actionable connect error instead of an empty success

#### Scenario: Successful refresh overwrites the cache

- **WHEN** a later billing request succeeds
- **THEN** the system overwrites the cached window with the fresh quota

#### Scenario: Snapshot stores display fields only

- **WHEN** the system persists the cached window
- **THEN** only display fields are written and access or refresh tokens are never stored

### Requirement: Official CLI credential wake

When a live Grok probe cannot be obtained because the Grok Build credential is expired or missing, the application MUST refresh credentials only by running the official Grok Build CLI one-shot with argv `models` on the `grok` binary. The binary MUST be discovered with the same PATH search used for other CLIs, plus Grok Build's documented install directory (`$HOME/.grok/bin` on Unix, `%USERPROFILE%\\.grok\\bin` on Windows). It MUST NOT require a developer-specific PATH, extra symlink, or host-only directory. It MUST NOT pass a model name, a prompt, a `-p`/`--single` flag, or Window Starter's window-start pin. It MUST NOT call x.ai's OAuth endpoints, submit a refresh token, or write `~/.grok/auth.json` itself. It MUST NOT parse `models` stdout as quota; after a successful wake it MUST re-run the normal probe so the billing call uses the refreshed credential. Availability for the card action MUST come from this same search; Grok Build MUST NOT be added to the Window Starter runner catalog.

The Auto-start grok setting MUST default off and MUST live on Grok Customize L2. When it is on, the credential error MUST trigger at most one wake, then a re-probe, including when the setting is turned on while the card is already showing the credential error. A Stale chip caused by a network or server failure MUST NOT trigger a wake. When the CLI is available and the card still needs wake, the card MUST show a Start grok action (icon-only refresh with an explanatory tooltip; it MAY spin while wake is in flight) whether Auto-start is on or off. Reset All Customization MUST restore the setting to off.

The application MUST NOT spawn `grok models` when an exact `grok` process is already running; it MUST re-probe only. Concurrent wakes MUST be serialized. A failed wake MUST NOT retry until a cooldown has elapsed, and wakes that keep succeeding without fixing the credential MUST back off through the same cooldown. The spawned process MUST be bounded and MUST be allowed to exit; the application MUST NOT keep a Grok Build daemon for this purpose.

#### Scenario: Auto-start wakes then live probe succeeds

- **WHEN** Auto-start grok is on, no `grok` process is running, and a Grok probe reports the credential error
- **THEN** the application runs the Grok Build CLI with argv `models` once
- **AND** after that process exits successfully it re-probes Grok
- **AND** it makes no x.ai OAuth request of its own

#### Scenario: Off shows a Start grok action

- **WHEN** Auto-start grok is off, the CLI is available, and the Grok card is showing the credential error
- **THEN** the card presents a Start grok action
- **AND** activating it runs the same `models` one-shot and re-probes

#### Scenario: Auto-start on still shows the action while stale

- **WHEN** Auto-start grok is on, the CLI is available, and the Grok card is showing the credential error
- **THEN** the card still presents the Start grok action
- **AND** the action indicates in-flight wake when a wake is running

#### Scenario: Turning Auto-start on while already stale wakes immediately

- **WHEN** Auto-start grok is turned on, the CLI is available, and the Grok card is already showing the credential error
- **THEN** the application runs the `models` one-shot without waiting for another probe

#### Scenario: Running grok is not duplicated

- **WHEN** an exact `grok` process is already running and a wake would otherwise start
- **THEN** the application does not spawn another `grok`
- **AND** it re-probes using the existing process

#### Scenario: Wake is not a window start

- **WHEN** a credential wake runs
- **THEN** the argv does not include a model name, a prompt flag, or Window Starter's starter prompt
- **AND** no Window Starter attempt record is written for that run
- **AND** Grok Build is not registered as a Window Starter catalog runner

#### Scenario: Missing grok hides the action

- **WHEN** the `grok` binary is found neither by the shared PATH search nor in Grok Build's documented install directory
- **THEN** the Start grok action is not shown
- **AND** Auto-start grok does not spawn a process

#### Scenario: Documented install dir is enough without PATH

- **WHEN** `grok` exists in Grok Build's documented install directory and is absent from the process `PATH`
- **THEN** the CLI is treated as available and a wake MAY spawn that binary

#### Scenario: Network stale does not wake

- **WHEN** the billing request fails with a network or 5xx error while the credential is not expired, and Auto-start grok is on
- **THEN** the application does not spawn the Grok Build CLI

#### Scenario: Reset restores Auto-start off

- **WHEN** Reset All Customization runs
- **THEN** Auto-start grok is off
