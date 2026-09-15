## MODIFIED Requirements

### Requirement: Thin verdict meters

Each quota progress line SHALL render a 4px-tall capsule meter. Track color SHALL derive from the foreground on the tray. Fill SHALL encode pace: brand green derived from `#00E676` when on pace, yellow when projected to finish with under 10% spare, red when projected to run out or already exhausted. Fill width SHALL have a 4px minimum for any non-zero value. A 2×12px pace tick MAY overlay the meter and SHALL extend past the meter height so the tick stays readable against the thicker bar. Fill SHALL NOT use the provider brand color.

#### Scenario: On-pace fill is brand green

- **WHEN** a quota line is on-pace
- **THEN** the meter fill uses the brand-green meter token, not a provider color and not system blue

#### Scenario: Warning and critical verdicts

- **WHEN** a quota line is projected to finish with under 10% spare
- **THEN** the meter fill is yellow, and when projected to run out or exhausted it is red

#### Scenario: Meter is 4px with a long pace tick

- **WHEN** a quota progress line renders on a dashboard card
- **THEN** the capsule meter is 4px tall
- **AND** a non-zero fill is at least 4px wide
- **AND** when a pace tick is shown it is 2px wide and 12px tall

### Requirement: Quota progress lines use a two-row compact face

Each quota progress line SHALL use two rows. The first row SHALL show the truncated metric label, a suffix-free used/left reading, and time chips. The second row SHALL be the full-width 4px verdict meter. The used/left toggle SHALL remain on the reading and SHALL NOT add a `left` or `used` suffix beside the number. Reset and run-out English prefixes SHALL NOT appear on the face; the existing long sentences SHALL remain in the tooltip and accessible name. A reset chip SHALL show a timer icon plus compact remaining time (`soon` under five minutes) or a compact clock (`HH:MM` when the reset is today, otherwise `M/D` plus time). A run-out chip SHALL appear only when the line is behind pace or already at the limit, as a flame icon plus compact remaining time, or the flame alone when the limit is reached. Remaining-time labels on the Timeline screen SHALL stay unchanged.

#### Scenario: Meter is on the second row

- **WHEN** a progress line renders on a dashboard card
- **THEN** the verdict meter is on a row below the label, reading, and time chips
- **AND** that meter row spans the card content width
- **AND** that meter is 4px tall

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

## ADDED Requirements

### Requirement: Settings sections put the title outside the card

Each Settings section SHALL render its group title above a `ui-list` of rows, not inside the list, using the same header chrome as dashboard provider cards (`text-sm font-semibold`, not uppercase group labels). Witty subtitle copy SHALL NOT appear under those titles. Multi-choice Settings SHALL use a compact end-aligned menu that shows the current value, not a full-width segmented control. Boolean Settings rows SHALL place a switch on the same row as the label, not a checkbox, and SHALL NOT add a description under the title. Global Shortcut SHALL sit on a General row with a compact recorder, not its own card. The Settings screen SHALL include Customize and Window Starter shortcut rows using the shared nav-row chrome, including each subtitle. The Settings top bar SHALL offer a reset action (reset icon, "Reset settings") that restores that screen's preferences to defaults and SHALL NOT refresh providers.

#### Scenario: Section title sits above the card

- **WHEN** the Settings screen renders
- **THEN** each settings group title is outside the list surface
- **AND** the title uses the dashboard card header type, not an uppercase group label
- **AND** the rows for that group sit in the list below the title

#### Scenario: Witty subtitles are gone

- **WHEN** the Settings screen renders
- **THEN** Auto Refresh, Usage Mode, Reset Timers, App Theme, and Start on Login have no subtitle under a title

#### Scenario: Start on login is a switch

- **WHEN** the Settings screen renders
- **THEN** Start on Login uses a switch
- **AND** it does not use a checkbox
- **AND** the switch sits on the same row as the Start on Login label

#### Scenario: Choices use compact menus

- **WHEN** a Settings multi-choice row renders
- **THEN** the current value is shown in a compact menu trigger
- **AND** that trigger does not use a full-width filled segment

#### Scenario: Settings top bar resets defaults

- **WHEN** the Settings screen renders
- **THEN** the top-bar action is Reset settings, not Refresh
- **AND** activating it restores Auto Refresh, Theme, Show Usage As, Reset Times, Global Shortcut, and Start on Login to defaults

#### Scenario: Settings shortcut rows

- **WHEN** the Settings screen renders
- **THEN** a Customize nav-row and a Window Starter nav-row appear below the grouped lists
- **AND** each row has an icon, title, subtitle, and chevron

### Requirement: Pressable controls lift on hover

A pressable button SHALL move up and gain a shadow on hover in addition to any color change, so it is recognizable as pressable. The same lift SHALL apply to text-only pressable controls that currently change only color (used/left reading, reset chip), to screen-to-screen nav-rows, and to compact outline chips (Settings menus, Record Shortcut, Customize L2 runner menu, footer Options trigger). A dashboard provider card body SHALL lift and tint its whole background on hover. The expand chevron SHALL remain visible but SHALL NOT independently lift or tint a strip. Switches and Settings list surfaces SHALL NOT lift. When the user prefers reduced motion, pressable controls SHALL NOT translate.

#### Scenario: A button lifts on hover

- **WHEN** the pointer hovers a pressable button that is not disabled
- **THEN** the button translates upward and shows a shadow
- **AND** a color change alone is not the only hover cue

#### Scenario: Text toggles lift on hover

- **WHEN** the pointer hovers a used/left reading or a pressable reset chip
- **THEN** that control lifts the same way as a pressable button

#### Scenario: Provider card body lifts as one surface

- **WHEN** the pointer hovers a dashboard provider card body
- **THEN** the whole card body lifts and its background tints
- **AND** the expand chevron does not independently lift or tint a horizontal strip

#### Scenario: Nav-rows and compact chips lift on hover

- **WHEN** the pointer hovers a screen-to-screen nav-row or a compact outline chip
- **THEN** that control lifts the same way as a pressable button

#### Scenario: Switches and Settings lists do not lift

- **WHEN** the pointer hovers a switch or a Settings list surface
- **THEN** that control does not translate

#### Scenario: Reduced motion skips the lift

- **WHEN** the user prefers reduced motion
- **THEN** hovering a pressable control does not translate it
