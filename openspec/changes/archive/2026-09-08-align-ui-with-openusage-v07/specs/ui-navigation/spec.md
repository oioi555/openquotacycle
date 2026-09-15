## Purpose

Defines how users move between Quotracker's screens: a fixed screen stack rooted at the dashboard, back-bar chrome on secondary screens, a single footer Options menu, dashboard teaser entries, and keyboard/tray navigation — replacing the former side-nav activity rail.

## ADDED Requirements

### Requirement: Screen-stack navigation rooted at the dashboard
The UI SHALL present exactly these screens: `dashboard`, `cost`, `resets`, `customize`, `customize:<pluginId>`, `settings`, and `window-starter`. The dashboard SHALL be the root screen that lists all enabled providers stacked vertically. All other screens SHALL be secondary screens reached from the dashboard or from another secondary screen. Screen changes SHALL use directional slide transitions, and reduced-motion preferences SHALL replace transitions with an instant swap.

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

### Requirement: Secondary screens show a top back bar
The dashboard SHALL have no top bar. Every secondary screen SHALL show a top bar with a back control and a centered screen title, except that `customize:<pluginId>` SHALL show the provider name as the title. Activating the back control SHALL move one step toward the dashboard (`customize:<pluginId>` to `customize`, all others to `dashboard`).

#### Scenario: Back from Settings
- **WHEN** the user activates the back control on the Settings screen
- **THEN** the dashboard is displayed

#### Scenario: Back from a provider Customize view
- **WHEN** the user activates the back control on `customize:<pluginId>`
- **THEN** the `customize` list screen is displayed

#### Scenario: Dashboard has no top bar
- **WHEN** the dashboard screen is displayed
- **THEN** no top bar is rendered above the provider cards

### Requirement: Footer Options menu is the single secondary entry point
The footer SHALL provide one Options menu control listing: Customize, Resets, Cost, Window Starter, Settings, About, and Help. Selecting Customize, Resets, Cost, Window Starter, or Settings SHALL navigate to that screen. About SHALL open the existing About dialog. Help SHALL open the external issues URL. The footer SHALL continue to show the app version and the next-update countdown with click-to-refresh.

#### Scenario: Options menu opens Resets
- **WHEN** the user opens the Options menu and selects Resets
- **THEN** the Resets screen is displayed

#### Scenario: About via Options menu
- **WHEN** the user selects About in the Options menu
- **THEN** the About dialog opens over the current screen

#### Scenario: Help opens externally
- **WHEN** the user selects Help in the Options menu
- **THEN** the external issues URL opens without changing the active screen

### Requirement: Dashboard teaser entries for Cost and Resets
The dashboard SHALL render a compact Cost teaser summarizing aggregate usage, and a next-reset row naming the nearest upcoming quota reset. Until real cost aggregation lands (the `add-cost-aggregation` change), the Cost teaser's values SHALL be placeholder values accompanied by a visible sample-data marker. Activating the Cost teaser SHALL navigate to `cost`; activating the next-reset row SHALL navigate to `resets`.

#### Scenario: Cost teaser navigates to the Cost page
- **WHEN** the user activates the Cost teaser on the dashboard
- **THEN** the `cost` screen is displayed

#### Scenario: Cost teaser marks placeholder values
- **WHEN** the Cost teaser renders placeholder values
- **THEN** a sample-data marker is visible on or next to the teaser

#### Scenario: Next-reset row navigates to Resets
- **WHEN** the user activates the next-reset row on the dashboard
- **THEN** the `resets` screen is displayed

### Requirement: Cost page is a layout-complete placeholder
The Cost page SHALL present the full target layout — a period selector (daily / weekly / monthly), an aggregate total area, and a per-provider breakdown list — populated with clearly placeholder values. It SHALL NOT compute or persist real aggregate usage data; real data arrives with the cost aggregation change.

#### Scenario: Cost page renders with placeholder data
- **WHEN** the user opens the Cost page
- **THEN** the period selector, total area, and per-provider breakdown render with placeholder values

#### Scenario: Period selector changes selection state
- **WHEN** the user selects a different period on the Cost page
- **THEN** the selection state updates while values remain placeholders

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
- **WHEN** the user presses `Enter` on `customize`, `customize:<pluginId>`, `cost`, `resets`, `settings`, or `window-starter`
- **THEN** the screen steps back one level toward the dashboard

#### Scenario: Ctrl+, toggles Settings
- **WHEN** the user presses `Ctrl+,` on the dashboard
- **THEN** the Settings screen is displayed
- **AND** pressing `Ctrl+,` again on Settings returns to the dashboard

#### Scenario: Ctrl+, preserves the originating screen
- **WHEN** the user presses `Ctrl+,` on the Resets screen and then presses `Ctrl+,` again on Settings
- **THEN** the Resets screen is displayed again

#### Scenario: Settings entered via the Options menu sets the same origin
- **WHEN** the user opens Settings from the footer Options menu and then presses `Ctrl+,`
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
