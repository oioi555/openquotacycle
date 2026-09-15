## MODIFIED Requirements

### Requirement: Main window presentation on Linux

Quotracker SHALL present its main interface as a standard decorated, resizable Linux window instead of a custom tray-positioned panel. The status icon SHALL be a StatusNotifierItem on the session bus. Left-click (SNI Activate) SHALL show and focus the main window. The icon SHALL NOT require libayatana-appindicator or libappindicator.

#### Scenario: Application starts

- **WHEN** Quotracker starts
- **THEN** the main window is visible with native decorations and a normal default size

#### Scenario: Status icon activation

- **WHEN** the user left-clicks the status icon
- **THEN** Quotracker shows and focuses the main window

#### Scenario: Panel-only behavior removed

- **WHEN** the main window loses focus or Escape is pressed
- **THEN** Quotracker does not auto-hide the window through panel-specific logic

#### Scenario: Status icon is a StatusNotifierItem

- **WHEN** Quotracker is running on a desktop that hosts StatusNotifierWatcher
- **THEN** a StatusNotifierItem for Quotracker is registered
- **AND** the process does not load libayatana-appindicator or libappindicator for that icon

## ADDED Requirements

### Requirement: Status icon menu and tooltip

The status icon SHALL expose a context menu with Overview, Timeline, Settings, About Quotracker, and Quit. Overview SHALL show the window and navigate to Overview. Timeline SHALL show the window and navigate to Timeline. Settings SHALL show the window and navigate to Settings. About Quotracker SHALL show the window and open About. Quit SHALL exit the application. The tooltip SHALL be plain text; it MAY summarize enabled providers and SHALL start as "Quotracker" before the UI updates it. The icon image SHALL remain the static full-color app icon.

#### Scenario: Context menu opens Overview

- **WHEN** the user selects Overview from the status icon menu
- **THEN** the main window is shown and focused
- **AND** the current screen is Overview

#### Scenario: Quit from the status icon

- **WHEN** the user selects Quit in the status icon menu
- **THEN** the application exits and the status icon disappears

#### Scenario: Tooltip follows usage

- **WHEN** probe results arrive or enabled providers change
- **THEN** the status icon image does not change
- **AND** the tooltip text updates to the plain-text provider summary (or "Quotracker" when none are enabled)
