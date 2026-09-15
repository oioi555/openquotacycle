## MODIFIED Requirements

### Requirement: Additional rate limits use stable On Demand labels

Lines from `additional_rate_limits` SHALL use stable labels so Customize can classify them. A limit whose name or metered feature contains `gpt-reserve` or `luna-reserve` (any case) SHALL emit exactly one `Luna Reserve` progress line from a seven-day window (`limit_window_seconds` 604800), regardless of whether that window is in `primary_window` or `secondary_window`. Duplicate seven-day reserve windows SHALL collapse to one line. A five-hour or unknown-duration reserve window SHALL NOT be emitted. A `GPT-<version>-Codex-Spark` limit, including `metered_feature` `codex_bengalfox`, SHALL be omitted. Other limits SHALL keep the `GPT-<version>-Codex-` prefix stripped from `limit_name`. Luna Reserve SHALL be unmarked in the Codex manifest so it defaults to On Demand. Reviews from `code_review_rate_limit` SHALL keep the existing Reviews line. Period duration SHALL still come from each window's `limit_window_seconds` when present.

#### Scenario: gpt-reserve maps to one weekly Luna Reserve

- **WHEN** `additional_rate_limits` includes `limit_name` `gpt-reserve` with a seven-day `primary_window` and a null `secondary_window`
- **THEN** the plugin emits exactly one `Luna Reserve` line with a seven-day period
- **AND** no line labeled `gpt-reserve` or `Luna Reserve Wk` is emitted

#### Scenario: Duplicate weekly reserve windows collapse

- **WHEN** `gpt-reserve` reports seven-day windows in both `primary_window` and `secondary_window`
- **THEN** the plugin emits exactly one `Luna Reserve` line from the first emit-capable weekly window

#### Scenario: Prefixed gpt-reserve still maps

- **WHEN** `limit_name` is `GPT-5.4-Codex-gpt-reserve` and the window is seven days
- **THEN** the weekly window is labeled `Luna Reserve`

#### Scenario: Spark additional limits are omitted

- **WHEN** `limit_name` is `GPT-5.3-Codex-Spark` or `metered_feature` is `codex_bengalfox`
- **THEN** the plugin emits neither `Spark` nor `Spark Wk`

#### Scenario: Luna Reserve defaults to On Demand

- **WHEN** the Codex manifest is loaded with no stored visible set
- **THEN** Luna Reserve is On Demand and omitted from the collapsed card
- **AND** it appears in Customize On Demand and on the expanded card when the probe emitted it

#### Scenario: Unknown additional limits keep stripped names

- **WHEN** `additional_rate_limits` includes an unlisted `limit_name` `GPT-5.4-Codex-Other`
- **THEN** the plugin emits `Other`, and `Other Wk` when a secondary window exists

#### Scenario: Reviews still exposed

- **WHEN** the response contains `code_review_rate_limit` with `used_percent`
- **THEN** a Reviews progress line is still emitted
