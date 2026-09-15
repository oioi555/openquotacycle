## MODIFIED Requirements

### Requirement: Unused five-hour windows are Not started
When a recognized five-hour pool (Session or Claude) is present but the quota summary has no reset time, that meter SHALL read `Not started` on the reset label instead of a countdown. The plugin MUST NOT drop a server-provided reset time just because rounded usage is 0%. A started five-hour window MAY still read 0% used after a tiny request.

The Overview meter MUST show that countdown whenever `resetsAt` is parseable. It MUST NOT hide the countdown behind `Not started` when used is 0%. OpenQuota's `isFreshSessionWindow` overlay (`sessionWindow && usedPercent === 0 && future resetsAt`) SHALL NOT be ported. The same rule applies to Claude (`3p-5h`) as to Session (`gemini-5h`). Weekly meters SHALL keep a normal reset countdown whenever a reset time is present.

#### Scenario: Gemini five-hour window has not started
- **WHEN** the quota summary includes `gemini-5h` with no usage and no reset time
- **THEN** the Session line is emitted without inventing a reset instant
- **AND** the visible reset label is `Not started`

#### Scenario: Tiny usage still has a five-hour countdown
- **WHEN** the quota summary includes `gemini-5h` with remaining fraction at or near 1 and a future reset time
- **THEN** the Session line keeps that `resetsAt`
- **AND** the visible reset label is the countdown, not `Not started`

#### Scenario: Claude tiny usage still has a five-hour countdown
- **WHEN** the quota summary includes `3p-5h` with remaining fraction at or near 1 and a future reset time
- **THEN** the Claude line keeps that `resetsAt`
- **AND** the visible reset label is the countdown, not `Not started`

#### Scenario: Overview does not hide a live five-hour countdown at 0%
- **WHEN** a five-hour Session or Claude progress line has used 0 and a parseable future `resetsAt`
- **THEN** the Overview reset label is the countdown
- **AND** it is not `Not started`

#### Scenario: Weekly window still counts down
- **WHEN** the quota summary includes `gemini-weekly` with a reset time
- **THEN** Weekly keeps that countdown even if the five-hour Gemini window has not started
