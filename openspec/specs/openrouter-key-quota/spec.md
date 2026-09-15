# openrouter-key-quota Specification

## Purpose

Show OpenRouter key budget and period spending in Quotracker while keeping
OpenRouter usage separate from the Grok SuperGrok subscription quota.

## Requirements

### Requirement: Read OpenRouter key accounting

The system SHALL read an OpenRouter API key from the first usable source in this order: `~/.config/quotracker/openrouter.json` `apiKey`, then `OPENROUTER_API_KEY`, then the `openrouter` entry in OpenCode's `~/.local/share/opencode/auth.json`. It SHALL query the key accounting endpoint with that key. Missing credentials SHALL tell the user to set an API key, not only to configure OpenCode.

#### Scenario: Configured OpenRouter key

- **WHEN** any of the key sources contains a non-empty key
- **THEN** the system queries the OpenRouter key endpoint and parses its accounting data

#### Scenario: Environment key is used

- **WHEN** `OPENROUTER_API_KEY` is set
- **AND** no saved config-file key is present
- **THEN** the provider uses the environment key

#### Scenario: OpenCode fallback key is used

- **WHEN** no environment or config key is present
- **AND** `~/.local/share/opencode/auth.json` contains an `openrouter` entry with a non-empty `key`
- **THEN** the provider uses that OpenCode key

#### Scenario: Missing or invalid key

- **WHEN** no key source has a usable key, or the endpoint rejects the key
- **THEN** the system reports that an OpenRouter API key must be configured or updated

#### Scenario: Management credits endpoint

- **WHEN** the system obtains OpenRouter accounting
- **THEN** it queries both the normal key endpoint and the account `/credits` endpoint with the same key
- **AND** it does not require a management-key-only credential

### Requirement: Account credits come from /credits

The provider SHALL request `GET https://openrouter.ai/api/v1/credits` with the same key. When that response includes usable `total_credits` and `total_usage`, the provider SHALL expose Credits as spend against purchased credits and Balance as remaining prepaid credits. A `/credits` failure SHALL NOT hide key-period spend already obtained from `/key`.

#### Scenario: Credits and balance are present

- **WHEN** `/credits` reports total_credits 20 and total_usage 5
- **THEN** the provider emits Credits used 5 of 20
- **AND** Balance is 15

#### Scenario: Credits request fails

- **WHEN** `/key` succeeds and `/credits` fails
- **THEN** the provider still shows key-period spend or Key Limit from `/key`

### Requirement: Display remaining budget and spend

The system SHALL preserve the OpenRouter key's remaining budget and usage scope and SHALL not classify OpenRouter `x-ai/*` model usage as SuperGrok usage. Key Limit SHALL use current-window spend (`limit - limit_remaining`) when a positive key cap exists. Period spend of a measured `$0.00` SHALL be shown as zero, not as no data.

#### Scenario: Limited key

- **WHEN** the response contains a positive numeric limit and remaining amount
- **THEN** the progress model uses `limit - remaining` as used and the default Quotracker `left` display shows the remaining amount

#### Scenario: Unlimited key

- **WHEN** the response contains no numeric key limit
- **THEN** the system shows daily, weekly, and monthly spend instead of a Key Limit progress bar

#### Scenario: Invalid accounting values

- **WHEN** required usage, limit, or remaining values are missing, non-numeric, negative, or inconsistent
- **THEN** the system reports an invalid OpenRouter response
