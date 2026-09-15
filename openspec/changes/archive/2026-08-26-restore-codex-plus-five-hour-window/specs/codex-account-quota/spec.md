## ADDED Requirements

### Requirement: Plus five-hour account window is exposed as Session
When `plan_type` is `plus`, an account-level window whose `limit_window_seconds` is 18000 (5 hours) SHALL be exposed as exactly one `Session` progress line regardless of whether the API places it in `primary_window` or `secondary_window`. The line SHALL use the usage value correlated with that window, retain the window's actual reset instant, and expose a five-hour period duration. The Session line SHALL precede the account-level Weekly line when both are available.

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

### Requirement: Five-hour account window remains hidden outside Plus
A five-hour account-level window SHALL NOT be exposed as Session when `plan_type` is absent, unknown, or identifies any plan other than `plus`. The presence or position of a five-hour window SHALL NOT be used to infer the account plan.

#### Scenario: Pro response contains a five-hour window
- **WHEN** a response identifies the Pro plan and contains an account window with a five-hour duration
- **THEN** no account-level Session line is exposed
- **AND** any classifiable Weekly line remains exposed

#### Scenario: Response omits the plan
- **WHEN** a response contains a five-hour account window but omits `plan_type`
- **THEN** no account-level Session line is exposed

## REMOVED Requirements

### Requirement: Account-level five-hour Session line is not exposed
**Reason**: OpenAI now exposes the real five-hour account window again for Plus subscriptions, so suppressing it for every plan hides valid quota data.

**Migration**: Replace unconditional suppression with the plan-gated Session requirements above; non-Plus and unknown plans retain the previous suppression behavior.
