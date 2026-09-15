## ADDED Requirements

### Requirement: Unused five-hour windows are Not started

When a recognized five-hour pool (Session or Claude) is present but has no usage yet, that meter SHALL read `Not started` on the reset label instead of a countdown. Weekly meters SHALL keep a normal reset countdown whenever a reset time is present.

#### Scenario: Gemini five-hour window has not started

- **WHEN** the quota summary includes `gemini-5h` with no usage and no started reset countdown
- **THEN** the Session line is emitted without inventing a reset instant
- **AND** the visible reset label is `Not started`

#### Scenario: Weekly window still counts down

- **WHEN** the quota summary includes `gemini-weekly` with a reset time
- **THEN** Weekly keeps that countdown even if the five-hour Gemini window has not started

### Requirement: Local conversation spend is optional

When Antigravity conversation databases exist under `~/.gemini/antigravity-cli/conversations/`, the provider SHALL add Today, Yesterday, and Last 30 Days token/spend tiles from generation records. Missing databases SHALL omit those tiles without failing quota meters. Conversation data SHALL NOT leave the machine.

#### Scenario: Conversation databases exist

- **WHEN** a conversation database contains priced generation token counts for today
- **THEN** the provider emits a Today spend line
- **AND** Session/Weekly/Claude quota meters still come from the quota API

#### Scenario: No conversation databases

- **WHEN** quota retrieval succeeds and no conversation databases are present
- **THEN** the provider still returns the quota meters
- **AND** it does not emit spend tiles
