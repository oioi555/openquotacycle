# codex-account-quota Specification

## Purpose
Defines how account-level Codex rate-limit windows are classified and exposed as quota status lines. Disables the five-hour Session line and classifies seven-day windows by their API-provided duration instead of their window position.

## Requirements

### Requirement: Seven-day window is classified by API duration, not position
A window whose `limit_window_seconds` is 604800 (7 days) SHALL be classified as an account-level "Weekly" line regardless of whether the response places it in `primary_window` or `secondary_window`. The Weekly line SHALL retain the API-provided reset time (`reset_at` / `reset_after_seconds`) as its reset instant and the seven-day period as its period duration, so downstream consumers can show the real weekly reset.

#### Scenario: Seven-day window in the primary position
- **WHEN** `primary_window.limit_window_seconds` is 604800
- **THEN** the primary window is exposed as a Weekly line
- **AND** the line keeps the primary window's actual reset time and a seven-day period

#### Scenario: Seven-day window in the secondary position
- **WHEN** `secondary_window.limit_window_seconds` is 604800
- **THEN** the secondary window is exposed as a Weekly line
- **AND** the line keeps the secondary window's actual reset time and a seven-day period

### Requirement: Duplicate seven-day windows collapse to one Weekly line
When both `primary_window` and `secondary_window` expose a seven-day window, the system SHALL expose exactly one account-level Weekly line, retaining the actual reset time and the seven-day period. No duplicate Weekly line SHALL be emitted.

#### Scenario: Both primary and secondary are seven-day windows
- **WHEN** both `primary_window` and `secondary_window` have `limit_window_seconds` of 604800
- **THEN** exactly one account-level Weekly line is exposed
- **AND** the line keeps a single actual reset time and a seven-day period

### Requirement: Unknown or absent durations get no Session fallback
A window whose duration is absent or unknown SHALL NOT be relabeled as a five-hour Session line through a fixed-duration fallback. Account-level windows without a usable duration SHALL NOT be exposed as Session lines.

#### Scenario: Missing duration in the primary position
- **WHEN** the account primary window has no `limit_window_seconds` and no duration can be determined
- **THEN** no Session line is emitted for it
- **AND** no five-hour period is assigned to the account rate limit

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

### Requirement: Extra Usage and Rate Limit Resets are display-only

When the usage payload includes flex/extra credits, the provider SHALL expose an Extra Usage line with the reported dollar and credit amounts. When it includes an available rate-limit-reset count, the provider SHALL expose a Rate Limit Resets count. The provider SHALL NOT claim or spend a reset credit.

#### Scenario: Extra usage is present

- **WHEN** the usage response reports extra-usage dollars and credits
- **THEN** the provider emits an Extra Usage line that includes both figures

#### Scenario: Reset credits are counted but not claimed

- **WHEN** the usage response or reset-credit endpoint reports a non-negative available count
- **THEN** the provider emits a Rate Limit Resets line with that count
- **AND** no reset credit is consumed

### Requirement: Plus five-hour account window is exposed as Session

When `plan_type` is `plus`, an account-level window whose `limit_window_seconds` is 18000 (5 hours) SHALL be exposed as exactly one `Session` progress line regardless of whether the API places it in `primary_window` or `secondary_window`. The line SHALL use the usage value correlated with that window, retain the window's actual reset instant, and expose a five-hour period duration. The Session line SHALL precede the account-level Weekly line when both are available.

The same duration rule SHALL apply when `plan_type` is absent or names a plan other than `plus`: a five-hour account window is Session, a seven-day window is Weekly, and unknown durations are still not invented.

#### Scenario: Plus response has Session and Weekly windows
- **WHEN** a Plus response contains one five-hour account window and one seven-day account window
- **THEN** the plugin exposes one Session line followed by one Weekly line
- **AND** each line retains the usage and reset metadata from its corresponding window

#### Scenario: Plus five-hour window is in the secondary position
- **WHEN** a Plus response places a seven-day window in `primary_window` and a five-hour window in `secondary_window`
- **THEN** the five-hour window is exposed as Session and the seven-day window as Weekly
- **AND** Session is emitted before Weekly regardless of API position

#### Scenario: Plus response has duplicate five-hour windows
- **WHEN** both account window positions in a Plus response report a five-hour duration
- **THEN** exactly one account-level Session line is exposed

#### Scenario: Non-Plus response has a five-hour window
- **WHEN** a response identifies a plan other than Plus, or omits `plan_type`, and contains one five-hour account window and one seven-day account window
- **THEN** the plugin exposes one Session line followed by one Weekly line
