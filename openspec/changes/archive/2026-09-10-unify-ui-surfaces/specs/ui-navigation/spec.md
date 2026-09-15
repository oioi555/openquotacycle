## ADDED Requirements

### Requirement: Customize and Settings offer each other as a shortcut

The Customize list screen SHALL include a Settings shortcut row. The Settings screen SHALL include a Customize shortcut row. Activating either row SHALL navigate to that screen. The footer Options menu and `Ctrl+,` origin rules SHALL remain unchanged.

#### Scenario: Customize opens Settings

- **WHEN** the user activates the Settings row on the Customize list screen
- **THEN** the Settings screen is displayed

#### Scenario: Settings opens Customize

- **WHEN** the user activates the Customize row on the Settings screen
- **THEN** the Customize list screen is displayed

## MODIFIED Requirements

### Requirement: Footer Options menu is the single secondary entry point

The footer SHALL provide one Options menu control listing: Customize, Resets, Cost, Window Starter, Settings, About, and Help. Selecting Customize, Resets, Cost, Window Starter, or Settings SHALL navigate to that screen. About SHALL open the existing About dialog. Help SHALL open the external issues URL. The footer SHALL continue to show the app version and the next-update countdown with click-to-refresh. The Options menu remains the complete catalog of those destinations; dashboard teasers and the Customize ↔ Settings shortcut rows MAY also navigate to a subset of them.

#### Scenario: Options menu opens Resets

- **WHEN** the user opens the Options menu and selects Resets
- **THEN** the Resets screen is displayed

#### Scenario: About via Options menu

- **WHEN** the user selects About in the Options menu
- **THEN** the About dialog opens over the current screen

#### Scenario: Help opens externally

- **WHEN** the user selects Help in the Options menu
- **THEN** the external issues URL opens without changing the active screen

#### Scenario: Options still lists Settings after the Customize shortcut exists

- **WHEN** the user is on Customize and opens the Options menu
- **THEN** Settings remains listed and selecting it displays the Settings screen
