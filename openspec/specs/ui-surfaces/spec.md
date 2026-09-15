# ui-surfaces Specification

## Purpose

Defines the shared visual contract for tray, cards, meters, warning notices, and screen cross-link rows so every screen paints from one token and surface vocabulary instead of per-file class copies.

## Requirements

### Requirement: Shared tray and card surfaces

The panel SHALL paint on a tray background. Provider cards, the dashboard tokens card, grouped lists, and settings sections SHALL lift off that tray with the shared panel corner radius of 6px. Divider lines SHALL NOT separate stacked dashboard cards; whitespace alone separates them. All such surfaces SHALL use the shared card and tray tokens, not a one-off background.

#### Scenario: Cards lift off the tray

- **WHEN** the dashboard renders two or more provider cards
- **THEN** each card background is distinct from the tray and uses the 6px panel radius with no divider line between cards

#### Scenario: Grouped lists share the card surface

- **WHEN** Customize lists providers
- **THEN** the list uses the same card token and 6px radius as dashboard cards

### Requirement: Thin verdict meters

Each quota progress line SHALL render a 4px-tall capsule meter. Track color SHALL derive from the foreground on the tray. Fill SHALL encode pace: brand green derived from `#00E676` when on pace, yellow when projected to finish with under 10% spare, red when projected to run out or already exhausted. Fill width SHALL have a 4px minimum for any non-zero value. A 2×12px pace tick MAY overlay the meter and SHALL extend past the meter height so the tick stays readable against the thicker bar. Fill SHALL NOT use the provider brand color. When the line is crossing-go, that tick SHALL use the meter-fill color at full opacity, SHALL be 4px wide and 16px tall, and SHALL NOT carry a glow. When the line is not crossing-go, the tick SHALL use the muted foreground treatment at 2×12px. Weekly meters SHALL NOT use the crossing-go tick. A started meter with a reset and a positive period whose usage is below the pace tick SHALL hatch unused-vs-tick (used mode: fill to tick; left mode: tick to leftover). Solid fill SHALL stop at the hatch so leftover past the tick is not painted as kept quota. That hatch SHALL use unmixed brand green `#00E676` (`--meter-headroom`), not the muted meter-fill mix and not the warning yellow. When that line is crossing-go, the hatch SHALL cover leftover to burn across reset (used mode: fill to 100%; left mode: 0 to leftover), SHALL carry a short glow so leftover reads as melting at reset, and the reset chip SHALL name `N% ahead of pace · melts at reset`. Light theme SHALL use dedicated `#00A152` as the glow color; dark theme SHALL use `#00E676`. Idle leftover hatch SHALL NOT glow. When it is ahead but not crossing-go, the reset chip SHALL name `N% ahead of pace` only. Weekly and other non-5-hour meters MAY hatch unused-vs-tick and name ahead of pace; they SHALL NOT name melts at reset and SHALL NOT glow. Meters with no parseable reset SHALL NOT hatch.

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
- **AND** when a pace tick is shown and the line is not crossing-go it is 2px wide and 12px tall

#### Scenario: Crossing-go tick uses meter fill without glow

- **WHEN** an Overview 5-hour progress line is crossing-go and shows a pace tick
- **THEN** the tick uses `--meter-fill` at full opacity
- **AND** the tick is 4px wide and 16px tall
- **AND** the tick does not carry a glow

#### Scenario: Idle tick stays muted

- **WHEN** an Overview progress line shows a pace tick and is not crossing-go
- **THEN** the tick uses the muted foreground treatment

#### Scenario: 5-hour meter names last-hour leftover in the last hour

- **WHEN** an Overview 5-hour progress line is started and has `used` 0 of 100 with 1 hour until reset
- **THEN** the meter shades leftover from fill to 100% in used mode
- **AND** that leftover hatch glows
- **AND** the reset chip names `80% ahead of pace · melts at reset`

#### Scenario: 5-hour meter names unused vs tick earlier in the window

- **WHEN** an Overview 5-hour progress line is started and has `used` 0 of 100 with 4 hours until reset
- **THEN** the meter shades fill to the pace tick in used mode
- **AND** the unused-vs-tick shade uses `--meter-headroom`
- **AND** that hatch does not glow
- **AND** the reset chip names `20% ahead of pace`
- **AND** it does not name melts at reset

#### Scenario: 5-hour leftover shade is visible in left mode

- **WHEN** an Overview 5-hour progress line is started, has `used` 0 of 100 with 4 hours until reset, and display mode is left
- **THEN** the meter shades tick to leftover
- **AND** that shade uses `--meter-headroom`, not `--meter-fill` and not `--meter-warning`

#### Scenario: Weekly meter hatches leftover without cross the reset

- **WHEN** an Overview weekly progress line is started, has `used` 0 of 100 with 3.5 days until reset, and display mode is left
- **THEN** the meter hatches tick to leftover
- **AND** the reset chip names `50% ahead of pace`
- **AND** it does not name melts at reset
- **AND** the tick is not crossing-go
- **AND** the hatch does not glow

#### Scenario: Light GO hatch glow is a dedicated dark green

- **WHEN** an Overview 5-hour progress line is crossing-go on light theme
- **THEN** the leftover hatch glow color is `#00A152`
- **AND** the glow is not mixed with `--foreground`

### Requirement: Plugin failures are warning callouts

A plugin error on a provider card SHALL render as a warning callout, not a destructive red alert. The first sentence SHALL be the title; remaining text SHALL be supporting detail when present. Stale-data warnings SHALL use the same warning tone.

#### Scenario: Blocking error is a warning callout

- **WHEN** a provider card has a blocking error whose message contains two sentences
- **THEN** the first sentence renders as the title, the rest as detail, and the callout uses the warning tone rather than destructive red

#### Scenario: Stale error uses warning tone

- **WHEN** a provider card shows a stale-data warning above cached metrics
- **THEN** that warning uses the warning tone, not destructive red

### Requirement: Cross-link rows share one nav-row surface

A screen-to-screen shortcut row SHALL show a leading icon, a title, a one-line subtitle, and a trailing chevron, on the shared card surface at the 6px panel radius. The Settings screen SHALL use that surface for Customize and About. The Customize list and Timeline screens SHALL NOT show screen-to-screen nav-rows.

#### Scenario: Settings shortcut on Customize

- **WHEN** the Customize list screen renders
- **THEN** it does not show a Settings nav-row

#### Scenario: Customize and Window Starter shortcuts on Timeline

- **WHEN** the Timeline screen renders
- **THEN** it does not show a Customize nav-row or a Window Starter nav-row

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

### Requirement: Settings sections put the title outside the card

Each Settings section SHALL render its group title above a `ui-list` of rows, not inside the list, using the same header chrome as dashboard provider cards (`text-sm font-semibold`, not uppercase group labels). Witty subtitle copy SHALL NOT appear under those titles. Multi-choice Settings SHALL use a compact end-aligned menu that shows the current value, not a full-width segmented control. Boolean Settings rows SHALL place a switch on the same row as the label, not a checkbox, and SHALL NOT add a description under the title. Global Shortcut SHALL sit on a General row with a compact recorder, not its own card. Usage Display SHALL contain Show Usage As and Reset Times only. 5-hour leftover SHALL be its own Settings section, independent of Usage Display, with a From remaining-band menu (Last 30 min, Last 1 hour, Last 1.5 hours, Last 2 hours) and a Notify switch. The group title SHALL name the 5-hour cadence so From and Notify are not read as applying to weekly leftover. The Settings screen SHALL include a Customize shortcut row using the shared nav-row chrome, and an About nav-row that shows the app name and version and opens the About dialog. The Settings screen SHALL NOT include a Window Starter shortcut row. The Settings top bar SHALL offer a reset action (reset icon, "Reset settings") that restores that screen's preferences to defaults and SHALL NOT refresh providers. The Settings top bar SHALL have no back control.

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
- **AND** activating it restores Auto Refresh, Theme, Show Usage As, Reset Times, 5-hour leftover From, Notify, Global Shortcut, and Start on Login to defaults

#### Scenario: Settings shortcut rows

- **WHEN** the Settings screen renders
- **THEN** a Customize nav-row appears below the grouped lists
- **AND** that row has an icon, title, subtitle, and chevron
- **AND** no Window Starter nav-row is shown
- **AND** an About nav-row shows the app name and version and opens the About dialog

#### Scenario: 5-hour leftover is its own section

- **WHEN** the Settings screen renders
- **THEN** 5-hour leftover is a group title outside a list
- **AND** that title names the 5-hour cadence
- **AND** that list contains From and Notify
- **AND** Usage Display does not contain From, Notify, or Cross reset

### Requirement: Pressable controls lift on hover

A pressable button SHALL move up and gain a shadow on hover in addition to any color change, so it is recognizable as pressable. The same lift SHALL apply to text-only pressable controls that currently change only color (used/left reading, reset chip), to screen-to-screen nav-rows, and to compact outline chips (Settings menus, Record Shortcut, Customize L2 runner menu). Footer tabs SHALL NOT lift. A dashboard provider card body SHALL lift and tint its whole background on hover. The expand chevron SHALL remain visible but SHALL NOT independently lift or tint a strip. Switches and Settings list surfaces SHALL NOT lift. When the user prefers reduced motion, pressable controls SHALL NOT translate.

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
