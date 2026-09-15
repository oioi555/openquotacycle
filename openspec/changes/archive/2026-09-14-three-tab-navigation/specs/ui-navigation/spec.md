## ADDED Requirements

### Requirement: Dashboard home top bar

The dashboard SHALL show a top bar with a centered title Overview, no back
control, the auto-refresh countdown on the left, and an icon-only Refresh
action on the right.

#### Scenario: Dashboard has a top bar

- **WHEN** the dashboard screen is displayed
- **THEN** a top bar is rendered above the provider cards
- **AND** the title is Overview
- **AND** no back control is shown
- **AND** the left slot shows the auto-refresh countdown
- **AND** a Refresh control is shown on the right without the countdown face

## MODIFIED Requirements

### Requirement: Screen-stack navigation rooted at the dashboard

The UI SHALL present exactly these screens: `dashboard`, `timeline`, `customize`, `customize:<pluginId>`, `customize:timeline`, `settings`, and `window-starter`. `timeline` is the Timeline page. `customize:timeline` is a reserved Customize child, not a plugin. The dashboard SHALL be the Overview root tab that lists all enabled providers stacked vertically. `timeline` and `settings` SHALL also be root tabs. `customize`, `customize:<pluginId>`, and `window-starter` SHALL be nested under Settings. `customize:timeline` SHALL be nested under Timeline. Screen changes SHALL use directional slide transitions, and reduced-motion preferences SHALL replace transitions with an instant swap. The UI SHALL NOT present a `cost` screen.

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

### Requirement: Secondary screens show a top back bar

Root tabs (`dashboard`, `timeline`, `settings`) SHALL show a top bar with a centered title and no back control. Nested screens SHALL show a back control. `customize:<pluginId>` SHALL show the provider name as the title and `customize:timeline` SHALL show Timeline. Activating the back control SHALL move one step toward the parent tab (`customize:<pluginId>` to `customize`, `customize` and `window-starter` to `settings`, `customize:timeline` to `timeline`). Window Starter's Refresh action SHALL include the compact auto-refresh countdown. Timeline SHALL show a sliders action that opens `customize:timeline` and SHALL NOT show Refresh or the countdown.

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

- **WHEN** the Window Starter screen is displayed
- **THEN** the top-bar Refresh control includes the compact auto-refresh countdown
- **AND** a back control is shown

#### Scenario: Timeline has no auto-refresh countdown

- **WHEN** the Timeline screen is displayed
- **THEN** the top bar has no back control
- **AND** the right action is sliders that open `customize:timeline`
- **AND** the top bar does not show a Refresh control or the auto-refresh countdown

### Requirement: Footer Options menu is the single secondary entry point

The footer SHALL provide three root tabs: Overview (`dashboard`), Timeline (`timeline`), and Settings (`settings`). The footer SHALL remain visible on nested screens. Activating a tab SHALL display that tab's root screen. The Settings tab SHALL stay selected on `customize`, `customize:<pluginId>`, and `window-starter`. The Timeline tab SHALL stay selected on `customize:timeline`. The footer SHALL NOT show an Options menu, Help, the app version, or the next-update countdown. About SHALL live on the Settings screen. Cost SHALL NOT be a tab.

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

The Settings screen SHALL include a Customize shortcut row and a Window Starter shortcut row. Activating a row SHALL navigate to that screen. The Customize list screen SHALL NOT include a Settings shortcut row. `Ctrl+,` SHALL still toggle Settings against its recorded origin.

#### Scenario: Customize opens Settings

- **WHEN** the Customize list screen renders
- **THEN** it does not show a Settings nav-row
- **AND** the Settings tab is selected

#### Scenario: Settings opens Customize

- **WHEN** the user activates the Customize row on the Settings screen
- **THEN** the Customize list screen is displayed

#### Scenario: Settings opens Window Starter

- **WHEN** the user activates the Window Starter row on the Settings screen
- **THEN** the Window Starter screen is displayed

### Requirement: Timeline offers Customize and Window Starter shortcuts

The Timeline screen SHALL NOT include shortcut rows to Customize or Window Starter. Timeline card editing SHALL be the top-bar sliders action that opens `customize:timeline`. Window Starter SHALL be reached from Settings.

#### Scenario: Timeline opens Timeline customize

- **WHEN** the user activates the Timeline top-bar sliders action
- **THEN** the `customize:timeline` screen is displayed

#### Scenario: Timeline opens Window Starter

- **WHEN** the Timeline screen is displayed
- **THEN** it does not show a Window Starter nav-row

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

- **WHEN** the user presses `Enter` on `customize`, `customize:<pluginId>`, `customize:timeline`, or `window-starter`
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
