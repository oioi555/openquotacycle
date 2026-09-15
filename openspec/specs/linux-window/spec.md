# linux-window Specification

## Purpose
Defines Quotracker's native Linux window behavior, tray residency, and consistent show, hide, close, and shortcut interactions.
## Requirements
### Requirement: Main window presentation on Linux

Quotracker SHALL present its main interface as a standard decorated, resizable Linux window instead of a custom tray-positioned panel. The status icon SHALL be a StatusNotifierItem on the session bus. Left-click (SNI Activate) SHALL toggle the main window: hide it when it is already visible, unminimized, and focused; otherwise show it, raise it above other windows, and focus it. Raise SHALL use a Plasma `ProvideXdgActivationToken` value when one was supplied immediately before the click, and SHALL NOT rely on GTK `GDK_CURRENT_TIME` (timestamp 0) as the only activation timestamp on X11.

#### Scenario: Application starts

- **WHEN** Quotracker starts
- **THEN** the main window is visible with native decorations and a normal default size

#### Scenario: Status icon activation

- **WHEN** the user left-clicks the status icon and the desktop delivers the click event
- **THEN** Quotracker toggles the main window: hidden, minimized, or unfocused windows are shown, raised, and focused; a visible focused window is hidden

#### Scenario: Status icon activation shows a hidden window

- **WHEN** the user left-clicks the status icon while the main window is hidden
- **THEN** Quotracker shows the main window, raises it above other windows, and focuses it

#### Scenario: Status icon activation raises a covered window

- **WHEN** the user left-clicks the status icon while the main window is visible but not focused
- **THEN** Quotracker raises the main window above other windows and focuses it
- **AND** the window is not hidden

#### Scenario: Status icon activation hides a focused window

- **WHEN** the user left-clicks the status icon while the main window is visible, unminimized, and focused
- **THEN** Quotracker hides the main window and keeps running with a visible status icon

#### Scenario: Panel-only behavior removed

- **WHEN** the main window loses focus or Escape is pressed
- **THEN** Quotracker does not auto-hide the window through panel-specific logic

#### Scenario: Status icon is a StatusNotifierItem

- **WHEN** Quotracker is running on a desktop that hosts StatusNotifierWatcher
- **THEN** a StatusNotifierItem for Quotracker is registered
- **AND** the process does not load libayatana-appindicator or libappindicator for that icon

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

### Requirement: Resident window close

Quotracker SHALL keep running when the user closes the main window: the close request MUST hide the window instead of terminating the application, so the tray icon, tray menu, and background usage refresh remain active.

#### Scenario: Window close hides instead of quitting

- **WHEN** the user closes the main window with the window manager close button (or the keyboard equivalent such as Alt+F4)
- **THEN** the main window is hidden and the application keeps running with a visible tray icon

#### Scenario: Background work continues while hidden

- **WHEN** the main window is hidden and a usage refresh is due
- **THEN** the application refreshes usage data as usual while the window stays hidden

#### Scenario: Quit only via explicit Quit

- **WHEN** the user selects "Quit" in the tray menu
- **THEN** the application exits and the tray icon disappears

### Requirement: Global shortcut toggles main window visibility

Quotracker SHALL toggle main window visibility with the global shortcut: hidden, minimized, or unfocused windows are shown, raised, and focused; a visible focused window is hidden.

#### Scenario: Shortcut while window visible

- **WHEN** the user presses the global toggle shortcut while the main window is visible and focused
- **THEN** the main window is hidden

#### Scenario: Shortcut while window hidden

- **WHEN** the user presses the global toggle shortcut while the main window is hidden
- **THEN** the main window is shown, raised, and focused

#### Scenario: Shortcut while window covered

- **WHEN** the user presses the global toggle shortcut while the main window is visible but not focused
- **THEN** the main window is raised and focused
- **AND** the window is not hidden
