## ADDED Requirements

### Requirement: Customize can hide the dashboard Timeline card independently

Customize SHALL show a Timeline visibility switch above the provider list, in its own list surface, not as a drag-and-drop provider row. The Timeline row SHALL include a chevron. Activating the row SHALL open a Timeline detail screen (`customize:timeline`) with switches for which dashboard card rows to show (`5-hour` and `Weekly`). That detail SHALL NOT use Always Visible / On Demand drag-and-drop. The dashboard Timeline card SHALL use the same card chrome as provider cards (header outside the card, `ui-card` body). It SHALL NOT reserve expand-row height; its bottom content padding SHALL match its top content padding. The dashboard Timeline card SHALL offer a context menu with Customize… (opens `customize:timeline`) and Hide Timeline (turns dashboard visibility off). Timeline remaining-time items SHALL use the shared tooltip surface, not a native `title`. Reset-all customization SHALL NOT change Timeline card visibility; it SHALL restore both dashboard card rows to visible.

#### Scenario: Timeline switch is independent of the provider list

- **WHEN** the Customize list screen renders
- **THEN** a Timeline switch appears above the provider list
- **AND** the Timeline row has a chevron
- **AND** dragging providers does not move the Timeline row

#### Scenario: Timeline detail lists dashboard card rows

- **WHEN** the user opens Customize Timeline
- **THEN** the screen lists `5-hour` and `Weekly` with visibility switches
- **AND** it does not show Always Visible / On Demand drag-and-drop

#### Scenario: Timeline card matches provider card chrome

- **WHEN** the dashboard Timeline card is visible
- **THEN** it uses the same header-plus-`ui-card` chrome as provider cards
- **AND** it does not reserve expand-row height
- **AND** its bottom content padding matches its top content padding

#### Scenario: Timeline card context menu

- **WHEN** the user opens the dashboard Timeline card context menu
- **THEN** Customize… and Hide Timeline are available

#### Scenario: Timeline item tooltip uses the shared surface

- **WHEN** the user hovers a Timeline card remaining-time item
- **THEN** the tooltip uses the shared popover tooltip, not a native title

## MODIFIED Requirements

### Requirement: Cross-link rows share one nav-row surface

A screen-to-screen shortcut row SHALL show a leading icon, a title, a one-line subtitle, and a trailing chevron, on the shared card surface at the 6px panel radius.

#### Scenario: Settings shortcut on Customize

- **WHEN** the Customize list screen renders
- **THEN** a Settings nav-row appears below the provider list with title, subtitle, and chevron

#### Scenario: Customize and Window Starter shortcuts on Timeline

- **WHEN** the Timeline screen renders
- **THEN** a Customize nav-row and a Window Starter nav-row appear below the timeline sections or empty state
- **AND** each row has an icon, title, subtitle, and chevron

### Requirement: Quota progress lines use a two-row compact face

Each quota progress line SHALL use two rows. The first row SHALL show the truncated metric label, a suffix-free used/left reading, and time chips. The second row SHALL be the full-width 2px verdict meter. The used/left toggle SHALL remain on the reading and SHALL NOT add a `left` or `used` suffix beside the number. Reset and run-out English prefixes SHALL NOT appear on the face; the existing long sentences SHALL remain in the tooltip and accessible name. A reset chip SHALL show a timer icon plus compact remaining time (`soon` under five minutes) or a compact clock (`HH:MM` when the reset is today, otherwise `M/D` plus time). A run-out chip SHALL appear only when the line is behind pace or already at the limit, as a flame icon plus compact remaining time, or the flame alone when the limit is reached. Remaining-time labels on the Timeline screen SHALL stay unchanged.

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
