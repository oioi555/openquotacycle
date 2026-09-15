# codex-account-quota Specification

## Purpose
Defines how account-level Codex rate-limit windows are classified and exposed as quota status lines. Disables the five-hour Session line and classifies seven-day windows by their API-provided duration instead of their window position.

## ADDED Requirements

### Requirement: Account-level five-hour Session line is not exposed
The system SHALL NOT expose a "Session" progress line derived from the Codex account-level primary rate-limit window, and SHALL NOT assign the fixed five-hour period to any account-level window. When the API returns the weekly allowance in the primary position, it SHALL NOT be mislabeled as Session.

#### Scenario: Primary window carries the weekly allowance
- **WHEN** the account rate-limit response returns a seven-day window in `primary_window`
- **THEN** no Session line is emitted for that window
- **AND** no five-hour period is assigned to it

#### Scenario: Weekly-only response
- **WHEN** the response exposes only the account weekly allowance (no separate secondary window)
- **THEN** the plugin emits no Session line
- **AND** the account weekly allowance is still exposed

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

### Requirement: Model-specific limits and Reviews are unchanged
The model-specific lines derived from `additional_rate_limits` and the separate Reviews line derived from `code_review_rate_limit` SHALL keep their existing classification and period behavior. This capability SHALL NOT alter their exposure.

#### Scenario: Model-specific and Reviews lines still exposed
- **WHEN** the response contains `additional_rate_limits` and `code_review_rate_limit`
- **THEN** those lines continue to be exposed with their existing behavior
