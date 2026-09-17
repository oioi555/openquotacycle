# ui-navigation Specification

## Purpose

Defines how users move between OpenQuotaCycle's screens: three footer root tabs (Overview, Timeline, Settings) with nested screens under their parent tab, back-bar chrome on nested screens, dashboard teaser entries, and keyboard/tray navigation — replacing the former side-nav activity rail.

## Requirements

### Requirement: Screen-stack navigation rooted at the dashboard
The UI SHALL present exactly these screens: `dashboard`, `timeline`, `customize`, `customize:<pluginId>`, `customize:timeline`, and `settings`. `timeline` is the Timeline page. `customize:timeline` is a reserved Customize child, not a plugin. The dashboard SHALL be the Overview root tab that lists all enabled providers stacked vertically. `timeline` and `settings` SHALL also be root tabs. `customize` and `customize:<pluginId>` SHALL be nested under Settings. `customize:timeline` SHALL be nested under Timeline. Screen changes SHALL use directional slide transitions, and reduced-motion preferences SHALL replace transitions with an instant swap. The UI SHALL NOT present a `cost` screen. The UI SHALL NOT present a `window-starter` screen.

#### Scenario: Dashboard is the default screen
- **WHEN** the application starts or the user closes and reopens the window
- **THEN** the dashboard screen is displayed

#### Scenario: Secondary screen slides in
- **WHEN** the user navigates from the dashboard to a secondary screen
- **THEN** the new screen slides in over the dashboard with a directional transition

#### Scenario: Customize detail is a child of Customize
- **WHEN** the user opens a specific provider's Customize view
- **THEN** the `customize:<pluginId>` screen slides in from the `customize` list screen

#### Scenario: Reduced motion disables sliding
- **WHEN** the user or the system requests reduced motion
- **THEN** screen changes swap content without slide animation

#### Scenario: Provider row in the Customize list opens its detail view
- **WHEN** the user activates a provider row (row click or chevron) in the `customize` list screen
- **THEN** the `customize:<pluginId>` screen for that provider is displayed

#### Scenario: Dashboard context menu opens the provider Customize view
- **WHEN** the user selects "Customize…" from a dashboard provider card's context menu
- **THEN** the `customize:<pluginId>` screen for that provider is displayed

#### Scenario: Timeline row in the Customize list opens its detail view
- **WHEN** the user activates the Timeline row in the `customize` list screen
- **THEN** the `customize:timeline` screen is displayed

#### Scenario: Dashboard context menu opens the Timeline Customize view
- **WHEN** the user selects "Customize…" from the dashboard Timeline card's context menu
- **THEN** the `customize:timeline` screen is displayed

#### Scenario: Cost screen is gone
- **WHEN** the application is running
- **THEN** no `cost` screen exists in the screen stack
- **AND** the UI does not navigate to `cost`

### Requirement: Dashboard home top bar
The dashboard SHALL show a top bar with a centered title Overview, no back control, the auto-refresh countdown on the left, and an icon-only Refresh action on the right.

#### Scenario: Dashboard has a top bar
- **WHEN** the dashboard screen is displayed
- **THEN** a top bar is rendered above the provider cards
- **AND** the title is Overview
- **AND** no back control is shown
- **AND** the left slot shows the auto-refresh countdown
- **AND** a Refresh control is shown on the right without the countdown face

### Requirement: Secondary screens show a top back bar
Root tabs (`dashboard`, `timeline`, `settings`) SHALL show a top bar with a centered title and no back control. Nested screens SHALL show a back control. `customize:<pluginId>` SHALL show the provider name as the title and `customize:timeline` SHALL show Timeline. Activating the back control SHALL move one step toward the parent tab (`customize:<pluginId>` to `customize`, `customize` to `settings`, `customize:timeline` to `timeline`). Timeline SHALL show a sliders action that opens `customize:timeline` and SHALL NOT show Refresh or the countdown.

#### Scenario: Back from Settings
- **WHEN** the Settings screen is displayed
- **THEN** the top bar has no back control

#### Scenario: Back from a provider Customize view
- **WHEN** the user activates the back control on `customize:<pluginId>`
- **THEN** the `customize` list screen is displayed

#### Scenario: Back from Timeline Customize
- **WHEN** the user activates the back control on `customize:timeline`
- **THEN** the Timeline screen (`timeline`) is displayed

#### Scenario: Dashboard has no top bar
- **WHEN** the dashboard screen is displayed
- **THEN** the top bar has no back control

#### Scenario: Window Starter refresh shows the countdown
- **WHEN** the Timeline screen is displayed
- **THEN** the top bar does not show a Refresh control or the auto-refresh countdown
- **AND** there is no `window-starter` screen

#### Scenario: Timeline has no auto-refresh countdown
- **WHEN** the Timeline screen is displayed
- **THEN** the top bar has no back control
- **AND** the right action is sliders that open `customize:timeline`
- **AND** the top bar does not show a Refresh control or the auto-refresh countdown

### Requirement: Footer Options menu is the single secondary entry point
The footer SHALL provide three root tabs: Overview (`dashboard`), Timeline (`timeline`), and Settings (`settings`). The footer SHALL remain visible on nested screens. Activating a tab SHALL display that tab's root screen. The Settings tab SHALL stay selected on `customize` and `customize:<pluginId>`. The Timeline tab SHALL stay selected on `customize:timeline`. The footer SHALL NOT show an Options menu, Help, the app version, or the next-update countdown. About SHALL live on the Settings screen. Cost SHALL NOT be a tab. Window Starter SHALL NOT be a tab.

#### Scenario: Options menu opens Resets
- **WHEN** the user activates the Timeline tab
- **THEN** the Timeline screen (`timeline`) is displayed

#### Scenario: About via Options menu
- **WHEN** the user activates the About row on the Settings screen
- **THEN** the About dialog opens over the current screen

#### Scenario: Help opens externally
- **WHEN** the application is running
- **THEN** no Help control is shown in the footer or on Settings

#### Scenario: Options still lists Settings after the Customize shortcut exists
- **WHEN** the user is on Customize
- **THEN** the Settings tab is selected
- **AND** activating the Settings tab displays the Settings screen

#### Scenario: Options menu has no Cost entry
- **WHEN** the footer tabs are displayed
- **THEN** Cost is not a tab

#### Scenario: Footer has no auto-refresh countdown
- **WHEN** the dashboard is displayed
- **THEN** the footer does not show a next-update countdown, Paused label, or app version
- **AND** the footer shows Overview, Timeline, and Settings tabs

### Requirement: Customize and Settings offer each other as a shortcut
The Settings screen SHALL include a Customize shortcut row. Activating it SHALL navigate to Customize. The Settings screen SHALL NOT include a Window Starter shortcut row. The Customize list screen SHALL NOT include a Settings shortcut row. `Ctrl+,` SHALL still toggle Settings against its recorded origin.

#### Scenario: Customize opens Settings
- **WHEN** the Customize list screen renders
- **THEN** it does not show a Settings nav-row
- **AND** the Settings tab is selected

#### Scenario: Settings opens Customize
- **WHEN** the user activates the Customize row on the Settings screen
- **THEN** the Customize list screen is displayed

#### Scenario: Settings opens Window Starter
- **WHEN** the Settings screen is displayed
- **THEN** it does not show a Window Starter nav-row

### Requirement: Dashboard Timeline card
The dashboard SHALL render a Timeline card in the same chrome as provider cards. The Timeline card body SHALL use the same pressable hover lift as provider cards (`ui-pressable` and `hover:bg-card-hover`). The Timeline card SHALL show up to two rows (five-hour and weekly). Each row SHALL list the next in-axis reset per quota as a provider icon plus compact remaining time, laid out horizontally on a single line. Cadence labels SHALL share a column so remaining-time items start at the same x. Items that do not fit SHALL scroll horizontally on that row by dragging, SHALL NOT wrap, and SHALL NOT chain into dashboard vertical scroll. Activating the Timeline card SHALL navigate to `timeline`. The Timeline card SHALL be hidden when the user turns it off on Customize; it SHALL be visible by default. The dashboard SHALL NOT render a Cost teaser, TotalSpend card, or sample-data spend summary. On the 5-hour row, crossing-go items SHALL appear as meter-fill pills (remaining time in meter-fill on a meter-fill-tinted chip) and SHALL appear before non-crossing-go items (then soonest reset). 5-hour item labels SHALL include unused vs the pace tick, and crossing-go items SHALL include melts at reset. Weekly-row item color, chrome, and sort SHALL NOT use crossing-go, and weekly items SHALL NOT include that accelerator text.

#### Scenario: Next-reset row navigates to Resets
- **WHEN** the user activates the Timeline card on the dashboard
- **THEN** the Timeline screen (`timeline`) is displayed

#### Scenario: Timeline card lists per-provider remaining times
- **WHEN** the dashboard Timeline card is visible and at least one five-hour and one weekly quota reset fall inside their axes
- **THEN** the card shows a 5-hour row and a Weekly row
- **AND** each row lists provider icons with compact remaining times horizontally on one line
- **AND** remaining-time items in both rows start at the same x
- **AND** items that overflow a row scroll horizontally on that line by dragging rather than wrap

#### Scenario: Hidden Timeline card
- **WHEN** Timeline visibility is off
- **THEN** the dashboard does not render the Timeline card

#### Scenario: No Cost teaser
- **WHEN** the dashboard is displayed
- **THEN** it does not show a Cost teaser, TotalSpend card, or sample-data marker

#### Scenario: Crossing-go 5-hour items lead and use meter fill
- **WHEN** the dashboard Timeline card 5-hour row includes one crossing-go reset and one later non-crossing-go reset
- **THEN** the crossing-go remaining time uses `--meter-fill` on a meter-fill-tinted pill
- **AND** the crossing-go item is listed before the other 5-hour item
- **AND** the Weekly row items stay muted and ordered by soonest reset

#### Scenario: 5-hour Timeline items name unused vs tick and cross the reset
- **WHEN** the dashboard Timeline card 5-hour row includes a started 5-hour quota that is crossing-go
- **THEN** that item's accessible name includes ahead of pace and melts at reset
- **AND** weekly items on the same card omit that comparison

#### Scenario: Timeline card lifts on hover
- **WHEN** the pointer hovers the dashboard Timeline card body
- **THEN** the card uses the same pressable lift as provider cards

### Requirement: Timeline offers Customize and Window Starter shortcuts
The Timeline screen SHALL NOT include shortcut rows to Customize or Window Starter. Timeline card editing SHALL be the top-bar sliders action that opens `customize:timeline`. Window Starter SHALL be a section on the Timeline screen below the plots or empty state, not a separate screen.

#### Scenario: Timeline opens Timeline customize
- **WHEN** the user activates the Timeline top-bar sliders action
- **THEN** the `customize:timeline` screen is displayed

#### Scenario: Timeline opens Window Starter
- **WHEN** the Timeline screen is displayed
- **THEN** it does not show a Window Starter nav-row
- **AND** it shows the Window Starter section

### Requirement: Keyboard model
`Esc` SHALL move back one nested step and SHALL NOT hide the window; on a root tab (`dashboard`, `timeline`, `settings`) `Esc` SHALL do nothing to the screen. When a dialog (About, changelog) is open, `Esc` SHALL close that dialog and SHALL NOT also step the screen. `Enter` SHALL advance from the dashboard to Customize, SHALL do nothing on other root tabs, and on nested screens SHALL step back one level. `Ctrl+,` SHALL toggle between the Settings screen and the origin screen recorded when Settings was last entered — via `Ctrl+,` or the Settings tab alike — defaulting to the dashboard when no origin was recorded. `Ctrl+R` SHALL trigger a manual usage refresh. The former ArrowUp/ArrowDown view cycling SHALL NOT be active.

#### Scenario: Esc steps back without hiding
- **WHEN** the user presses `Esc` on a nested screen with no dialog open
- **THEN** the previous screen is displayed and the window remains visible

#### Scenario: Esc on the dashboard does not hide the window
- **WHEN** the user presses `Esc` on the dashboard
- **THEN** the window remains visible and the screen does not change

#### Scenario: Esc closes an open dialog first
- **WHEN** the user presses `Esc` while the About dialog is open
- **THEN** the dialog closes and the active screen is unchanged

#### Scenario: Enter advances from the dashboard
- **WHEN** the user presses `Enter` on the dashboard
- **THEN** the `customize` screen is displayed

#### Scenario: Enter steps back on secondary screens
- **WHEN** the user presses `Enter` on `customize`, `customize:<pluginId>`, or `customize:timeline`
- **THEN** the screen steps back one level toward its parent tab
- **AND** `Enter` on `timeline` or `settings` does not change the screen

#### Scenario: Ctrl+, toggles Settings
- **WHEN** the user presses `Ctrl+,` on the dashboard
- **THEN** the Settings screen is displayed
- **AND** pressing `Ctrl+,` again on Settings returns to the dashboard

#### Scenario: Ctrl+, preserves the originating screen
- **WHEN** the user presses `Ctrl+,` on the Timeline screen and then presses `Ctrl+,` again on Settings
- **THEN** the Timeline screen is displayed again

#### Scenario: Settings entered via the Options menu sets the same origin
- **WHEN** the user opens Settings from the Settings tab and then presses `Ctrl+,`
- **THEN** the screen that was active before Settings is displayed again

### Requirement: Tray navigation targets map to screens
Tray-driven navigation events SHALL map their payload onto the screen enum: `home` SHALL map to `dashboard`, `settings` SHALL map to `settings`, and any other payload (including provider ids and unknown values) SHALL map to `dashboard`. The tray's emitted payload set SHALL NOT be extended by this change.

#### Scenario: Tray requests the dashboard
- **WHEN** a tray navigation event carries the payload `home`
- **THEN** the `dashboard` screen is displayed

#### Scenario: Tray requests Settings
- **WHEN** a tray navigation event carries the payload `settings`
- **THEN** the `settings` screen is displayed

#### Scenario: Tray sends a provider or unknown payload
- **WHEN** a tray navigation event carries a payload other than `home` or `settings`
- **THEN** the `dashboard` screen is displayed

### Requirement: Disabled active provider falls back to the dashboard
When the active screen is `customize:<pluginId>` and that plugin becomes disabled, the UI SHALL fall back to the dashboard.

#### Scenario: Active plugin is disabled while its Customize view is open
- **WHEN** the plugin shown by `customize:<pluginId>` is disabled
- **THEN** the dashboard is displayed
