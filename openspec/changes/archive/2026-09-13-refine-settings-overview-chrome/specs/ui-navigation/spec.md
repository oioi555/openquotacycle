## MODIFIED Requirements

### Requirement: Customize and Settings offer each other as a shortcut
The Customize list screen SHALL include a Settings shortcut row. The Settings screen SHALL include a Customize shortcut row and a Window Starter shortcut row. Activating a row SHALL navigate to that screen. The footer Options menu and `Ctrl+,` origin rules SHALL remain unchanged.

#### Scenario: Customize opens Settings
- **WHEN** the user activates the Settings row on the Customize list screen
- **THEN** the Settings screen is displayed

#### Scenario: Settings opens Customize
- **WHEN** the user activates the Customize row on the Settings screen
- **THEN** the Customize list screen is displayed

#### Scenario: Settings opens Window Starter
- **WHEN** the user activates the Window Starter row on the Settings screen
- **THEN** the Window Starter screen is displayed
