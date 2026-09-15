## ADDED Requirements

### Requirement: Quota progress lines use a two-row compact face

Each quota progress line SHALL use two rows. The first row SHALL show the truncated metric label, a suffix-free used/left reading, and time chips. The second row SHALL be the full-width 2px verdict meter. The used/left toggle SHALL remain on the reading and SHALL NOT add a `left` or `used` suffix beside the number. Reset and run-out English prefixes SHALL NOT appear on the face; the existing long sentences SHALL remain in the tooltip and accessible name. A reset chip SHALL show a timer icon plus compact remaining time (`soon` under five minutes) or a compact clock (`HH:MM` when the reset is today, otherwise `M/D` plus time). A run-out chip SHALL appear only when the line is behind pace or already at the limit, as a flame icon plus compact remaining time, or the flame alone when the limit is reached. Remaining-time labels on the Resets screen SHALL stay unchanged.

#### Scenario: Meter is on the second row

- **WHEN** a progress line renders on a dashboard card
- **THEN** the verdict meter is on a row below the label, reading, and time chips
- **AND** that meter row spans the card content width

#### Scenario: Reading has no used/left suffix

- **WHEN** display mode is left and a line is at 100 percent remaining
- **THEN** the face reading is `100%` without a `left` suffix

#### Scenario: Reset chip is compact

- **WHEN** a line has a reset more than five minutes away
- **THEN** the face shows a timer icon and compact remaining time without a `Resets in` prefix
- **AND** the tooltip or accessible name still uses the long `Resets in …` sentence

#### Scenario: Absolute reset uses numeric date

- **WHEN** reset display is absolute and the reset is after today
- **THEN** the face clock uses `M/D` plus time (for example `9/12 1:05`) without a month name or `Resets` prefix

#### Scenario: Run-out chip only when behind

- **WHEN** a line is on pace
- **THEN** no run-out chip is shown on the face
