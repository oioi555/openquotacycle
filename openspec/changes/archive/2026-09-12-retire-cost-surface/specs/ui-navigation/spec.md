## REMOVED Requirements

### Requirement: Cost page is a layout-complete placeholder
**Reason**: The Cost page was an OpenQuota-shaped placeholder waiting on `add-cost-aggregation`. That change was withdrawn: Quotracker does not aggregate cross-provider spend.
**Migration**: Use the dashboard provider cards for per-provider quota. Today / Yesterday / Last 30 Days tiles on those cards stay. There is no Cost screen.

#### Scenario: Cost page renders with placeholder data
- **WHEN** the user opens the Cost page
- **THEN** the period selector, total area, and per-provider breakdown render with placeholder values

#### Scenario: Period selector changes selection state
- **WHEN** the user selects a different period on the Cost page
- **THEN** the selection state updates while values remain placeholders

### Requirement: Dashboard teaser entries for Cost and Timeline
**Reason**: The Cost teaser was sample data pending withdrawn aggregation. The Timeline card stays as its own requirement.
**Migration**: The dashboard Timeline card is unchanged in behavior. There is no Cost teaser.

#### Scenario: Cost teaser navigates to the Cost page
- **WHEN** the user activates the Cost teaser on the dashboard
- **THEN** the `cost` screen is displayed

#### Scenario: Cost teaser marks placeholder values
- **WHEN** the Cost teaser renders placeholder values
- **THEN** a sample-data marker is visible on or next to the teaser


## ADDED Requirements

### Requirement: Dashboard Timeline card
The dashboard SHALL render a Timeline card in the same chrome as provider cards. The Timeline card SHALL show up to two rows (five-hour and weekly). Each row SHALL list the next in-axis reset per quota as a provider icon plus compact remaining time, laid out horizontally on a single line. Cadence labels SHALL share a column so remaining-time items start at the same x. Items that do not fit SHALL scroll horizontally on that row by dragging, SHALL NOT wrap, and SHALL NOT chain into dashboard vertical scroll. Activating the Timeline card SHALL navigate to `timeline`. The Timeline card SHALL be hidden when the user turns it off on Customize; it SHALL be visible by default. The dashboard SHALL NOT render a Cost teaser, TotalSpend card, or sample-data spend summary.

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

## MODIFIED Requirements

### Requirement: Screen-stack navigation rooted at the dashboard
The UI SHALL present exactly these screens: `dashboard`, `timeline`, `customize`, `customize:<pluginId>`, `customize:timeline`, `settings`, and `window-starter`. `timeline` is the Timeline page. `customize:timeline` is a reserved Customize child, not a plugin. The dashboard SHALL be the root screen that lists all enabled providers stacked vertically. All other screens SHALL be secondary screens reached from the dashboard or from another secondary screen. Screen changes SHALL use directional slide transitions, and reduced-motion preferences SHALL replace transitions with an instant swap. The UI SHALL NOT present a `cost` screen.

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

### Requirement: Footer Options menu is the single secondary entry point
The footer SHALL provide one Options menu control listing: Customize, Timeline, Window Starter, Settings, About, and Help. Selecting Customize, Timeline, Window Starter, or Settings SHALL navigate to that screen. About SHALL open the existing About dialog. Help SHALL open the external issues URL. The footer SHALL continue to show the app version and the next-update countdown with click-to-refresh. The Options menu remains the complete catalog of those destinations; dashboard teasers, the Customize ↔ Settings shortcut rows, and the Timeline shortcut rows MAY also navigate to a subset of them. The Options menu SHALL NOT list Cost.

#### Scenario: Options menu opens Resets
- **WHEN** the user opens the Options menu and selects Timeline
- **THEN** the Timeline screen (`timeline`) is displayed

#### Scenario: About via Options menu
- **WHEN** the user selects About in the Options menu
- **THEN** the About dialog opens over the current screen

#### Scenario: Help opens externally
- **WHEN** the user selects Help in the Options menu
- **THEN** the external issues URL opens without changing the active screen

#### Scenario: Options still lists Settings after the Customize shortcut exists
- **WHEN** the user is on Customize and opens the Options menu
- **THEN** Settings remains listed and selecting it displays the Settings screen

#### Scenario: Options menu has no Cost entry
- **WHEN** the user opens the Options menu
- **THEN** Cost is not listed

### Requirement: Keyboard model
`Esc` SHALL move back one screen step and SHALL NOT hide the window; when a dialog (About, changelog) is open, `Esc` SHALL close that dialog and SHALL NOT also step the screen. `Enter` SHALL advance from the dashboard to Customize, and on secondary screens SHALL step back one level (from `customize:<pluginId>` to `customize`, from all other secondary screens to `dashboard`). `Ctrl+,` SHALL toggle between the Settings screen and the origin screen recorded when Settings was last entered — via `Ctrl+,` or the Options menu alike — defaulting to the dashboard when no origin was recorded. `Ctrl+R` SHALL trigger a manual usage refresh. The former ArrowUp/ArrowDown view cycling SHALL NOT be active.

#### Scenario: Esc steps back without hiding
- **WHEN** the user presses `Esc` on a secondary screen with no dialog open
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
- **WHEN** the user presses `Enter` on `customize`, `customize:<pluginId>`, `customize:timeline`, `timeline`, `settings`, or `window-starter`
- **THEN** the screen steps back one level toward the dashboard

#### Scenario: Ctrl+, toggles Settings
- **WHEN** the user presses `Ctrl+,` on the dashboard
- **THEN** the Settings screen is displayed
- **AND** pressing `Ctrl+,` again on Settings returns to the dashboard

#### Scenario: Ctrl+, preserves the originating screen
- **WHEN** the user presses `Ctrl+,` on the Timeline screen and then presses `Ctrl+,` again on Settings
- **THEN** the Timeline screen is displayed again

#### Scenario: Settings entered via the Options menu sets the same origin
- **WHEN** the user opens Settings from the footer Options menu and then presses `Ctrl+,`
- **THEN** the screen that was active before Settings is displayed again
