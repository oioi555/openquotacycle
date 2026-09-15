## ADDED Requirements

### Requirement: Extra Usage and Rate Limit Resets are display-only

When the usage payload includes flex/extra credits, the provider SHALL expose an Extra Usage line with the reported dollar and credit amounts. When it includes an available rate-limit-reset count, the provider SHALL expose a Rate Limit Resets count. The provider SHALL NOT claim or spend a reset credit.

#### Scenario: Extra usage is present

- **WHEN** the usage response reports extra-usage dollars and credits
- **THEN** the provider emits an Extra Usage line that includes both figures

#### Scenario: Reset credits are counted but not claimed

- **WHEN** the usage response or reset-credit endpoint reports a non-negative available count
- **THEN** the provider emits a Rate Limit Resets line with that count
- **AND** no reset credit is consumed

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Five-hour account window remains hidden outside Plus
**Reason**: OpenUsage classifies Session by window duration, not by Plus plan membership. Hiding five-hour windows on other plans drops a real meter.
**Migration**: Any account-level window with `limit_window_seconds` 18000 is Session; Weekly classification is unchanged.
