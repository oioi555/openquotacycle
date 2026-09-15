## ADDED Requirements

### Requirement: Main window presentation on Linux

Tuxmeter SHALL present its main interface as a standard decorated, resizable Linux window instead of a custom tray-positioned panel.

#### Scenario: Application starts

- **WHEN** Tuxmeter starts
- **THEN** the main window is visible with native decorations and a normal default size

#### Scenario: Status icon activation

- **WHEN** the user left-clicks the status icon and the desktop delivers the click event
- **THEN** Tuxmeter shows and focuses the main window

#### Scenario: Panel-only behavior removed

- **WHEN** the main window loses focus or Escape is pressed
- **THEN** Tuxmeter does not auto-hide the window through panel-specific logic
