## ADDED Requirements

### Requirement: Window geometry persistence

Tuxmeter SHALL restore the main window size and position from the previous session when supported by the platform.

#### Scenario: Restore saved geometry

- **WHEN** the user launches Tuxmeter after resizing or moving the main window
- **THEN** the main window opens with the previously saved geometry

#### Scenario: First launch

- **WHEN** no saved window state exists
- **THEN** Tuxmeter uses the configured default window size
