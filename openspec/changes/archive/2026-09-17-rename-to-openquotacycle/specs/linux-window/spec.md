## MODIFIED Requirements

### Requirement: Status icon menu and tooltip

The status icon SHALL expose a context menu with Overview, Timeline, Settings, About OpenQuotaCycle, and Quit. Overview SHALL show the window and navigate to Overview. Timeline SHALL show the window and navigate to Timeline. Settings SHALL show the window and navigate to Settings. About OpenQuotaCycle SHALL show the window and open About. Quit SHALL exit the application. The tooltip SHALL be plain text; it MAY summarize enabled providers and SHALL start as "OpenQuotaCycle" before the UI updates it. The icon image SHALL remain the static full-color app icon.

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
- **AND** the tooltip text updates to the plain-text provider summary (or "OpenQuotaCycle" when none are enabled)
