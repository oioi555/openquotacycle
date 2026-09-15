## REMOVED Requirements

### Requirement: Model-specific limits and Reviews are unchanged

**Reason**: `gpt-reserve` was an unlisted additional limit, so it bypassed Customize and stayed on the collapsed card after the fallback pool fired. Spark already had a stable short name; Luna Reserve needs the same treatment.

**Migration**: Additional rate limits follow "Additional rate limits use stable On Demand labels". Reviews keep the existing `code_review_rate_limit` line.

## ADDED Requirements

### Requirement: Additional rate limits use stable On Demand labels

Lines from `additional_rate_limits` SHALL use stable labels so Customize can classify them. A limit whose name or metered feature contains `gpt-reserve` or `luna-reserve` (any case) SHALL be labeled `Luna Reserve` for the primary window and `Luna Reserve Wk` for the secondary window. A `GPT-<version>-Codex-Spark` limit SHALL remain `Spark` / `Spark Wk`. Other limits SHALL keep the `GPT-<version>-Codex-` prefix stripped from `limit_name`. Luna Reserve and Spark SHALL be unmarked in the Codex manifest so they default to On Demand. Reviews from `code_review_rate_limit` SHALL keep the existing Reviews line. Period duration SHALL still come from each window's `limit_window_seconds` when present.

#### Scenario: gpt-reserve maps to Luna Reserve

- **WHEN** `additional_rate_limits` includes `limit_name` `gpt-reserve` with primary and secondary `used_percent`
- **THEN** the plugin emits `Luna Reserve` and `Luna Reserve Wk`
- **AND** no line labeled `gpt-reserve` is emitted

#### Scenario: Prefixed gpt-reserve still maps

- **WHEN** `limit_name` is `GPT-5.4-Codex-gpt-reserve`
- **THEN** the primary window is labeled `Luna Reserve`

#### Scenario: Spark mapping is unchanged

- **WHEN** `limit_name` is `GPT-5.4-Codex-Spark`
- **THEN** the plugin emits `Spark` / `Spark Wk`

#### Scenario: Luna Reserve defaults to On Demand

- **WHEN** the Codex manifest is loaded with no stored visible set
- **THEN** Luna Reserve and Luna Reserve Wk are On Demand and omitted from the collapsed card
- **AND** they appear in Customize On Demand and on the expanded card when the probe emitted them

#### Scenario: Unknown additional limits keep stripped names

- **WHEN** `additional_rate_limits` includes an unlisted `limit_name` `GPT-5.4-Codex-Other`
- **THEN** the plugin emits `Other`, and `Other Wk` when a secondary window exists

#### Scenario: Reviews still exposed

- **WHEN** the response contains `code_review_rate_limit` with `used_percent`
- **THEN** a Reviews progress line is still emitted
