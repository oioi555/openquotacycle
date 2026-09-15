## Purpose

Show OpenRouter key budget and period spending in Tuxmeter while keeping
OpenRouter usage separate from the xAI SuperGrok subscription quota.

## ADDED Requirements

### Requirement: Read OpenRouter key accounting

The system SHALL read the OpenRouter API key from the `openrouter` entry in
OpenCode's `~/.local/share/opencode/auth.json` and SHALL query the key
accounting endpoint with that key.

#### Scenario: Configured OpenRouter key

- **WHEN** the `openrouter` entry in `~/.local/share/opencode/auth.json` contains a non-empty key
- **THEN** the system queries the OpenRouter key endpoint and parses its accounting data

#### Scenario: Missing or invalid key

- **WHEN** the OpenRouter entry or key is missing, or the endpoint rejects it
- **THEN** the system reports that the key must be configured or updated in OpenCode

#### Scenario: Management credits endpoint

- **WHEN** the system obtains OpenRouter accounting
- **THEN** it uses the normal key endpoint and does not require the management-key-only credits endpoint

### Requirement: Display remaining budget and spend

The system SHALL preserve the OpenRouter key's remaining budget and usage scope
and SHALL not classify OpenRouter `x-ai/*` model usage as SuperGrok usage.

#### Scenario: Limited key

- **WHEN** the response contains a positive numeric limit and remaining amount
- **THEN** the progress model uses `limit - remaining` as used and the default Tuxmeter `left` display shows the remaining amount

#### Scenario: Unlimited key

- **WHEN** the response contains no numeric key limit
- **THEN** the system shows daily, weekly, and monthly spend with an Unlimited indicator instead of a progress bar

#### Scenario: Invalid accounting values

- **WHEN** required usage, limit, or remaining values are missing, non-numeric, negative, or inconsistent
- **THEN** the system reports an invalid OpenRouter response
