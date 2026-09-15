## ADDED Requirements

### Requirement: Codex Plus Session and Weekly resets use their matching timeline sections
When the Codex plugin exposes both an account-level Plus Session line with a five-hour period and an account-level Weekly line with a seven-day period, the timeline SHALL render the Session quota in the five-hour section and the Weekly quota in the weekly section. If no eligible Plus Session line is exposed, Codex SHALL continue to appear only in the weekly section when Weekly reset data is available.

#### Scenario: Codex Plus exposes both account windows
- **WHEN** Codex Plus output contains a Session progress line with a five-hour period and a Weekly progress line with a seven-day period
- **THEN** the Session row appears in the five-hour timeline section
- **AND** the Weekly row appears in the weekly timeline section

#### Scenario: Codex output has no eligible Plus Session
- **WHEN** Codex output contains a Weekly line but no Session line
- **THEN** Codex appears in the weekly timeline section
- **AND** no Codex row is added to the five-hour section

## REMOVED Requirements

### Requirement: Codex row uses the account-level Weekly reset as its representative
**Reason**: The timeline now retains separate rows for every supported quota definition, and Codex Plus can again provide both a five-hour Session definition and a seven-day Weekly definition.

**Migration**: Render each restored Codex Plus quota in the section selected by its period duration; retain Weekly-only behavior for responses without an eligible Session line.
