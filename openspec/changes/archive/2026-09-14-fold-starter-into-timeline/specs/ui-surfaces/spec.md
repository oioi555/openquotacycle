## MODIFIED Requirements

### Requirement: Cross-link rows share one nav-row surface

A screen-to-screen shortcut row SHALL show a leading icon, a title, a one-line subtitle, and a trailing chevron, on the shared card surface at the 6px panel radius. The Settings screen SHALL use that surface for Customize and About. The Customize list and Timeline screens SHALL NOT show screen-to-screen nav-rows.

#### Scenario: Settings shortcut on Customize

- **WHEN** the Customize list screen renders
- **THEN** it does not show a Settings nav-row

#### Scenario: Customize and Window Starter shortcuts on Timeline

- **WHEN** the Timeline screen renders
- **THEN** it does not show a Customize nav-row or a Window Starter nav-row

### Requirement: Settings sections put the title outside the card

Each Settings section SHALL render its group title above a `ui-list` of rows, not inside the list, using the same header chrome as dashboard provider cards (`text-sm font-semibold`, not uppercase group labels). Witty subtitle copy SHALL NOT appear under those titles. Multi-choice Settings SHALL use a compact end-aligned menu that shows the current value, not a full-width segmented control. Boolean Settings rows SHALL place a switch on the same row as the label, not a checkbox, and SHALL NOT add a description under the title. Global Shortcut SHALL sit on a General row with a compact recorder, not its own card. The Settings screen SHALL include a Customize shortcut row using the shared nav-row chrome, and an About nav-row that shows the app name and version and opens the About dialog. The Settings screen SHALL NOT include a Window Starter shortcut row. The Settings top bar SHALL offer a reset action (reset icon, "Reset settings") that restores that screen's preferences to defaults and SHALL NOT refresh providers. The Settings top bar SHALL have no back control.

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
- **THEN** a Customize nav-row appears below the grouped lists
- **AND** that row has an icon, title, subtitle, and chevron
- **AND** no Window Starter nav-row is shown
- **AND** an About nav-row shows the app name and version and opens the About dialog
