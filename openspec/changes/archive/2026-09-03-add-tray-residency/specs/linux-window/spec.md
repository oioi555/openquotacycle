## ADDED Requirements

### Requirement: Resident window close

Tuxmeter SHALL keep running when the user closes the main window: the close request MUST hide the window instead of terminating the application, so the tray icon, tray menu, and background usage refresh remain active.

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

Tuxmeter SHALL toggle main window visibility with the global shortcut: hidden windows are shown and focused, visible windows are hidden.

#### Scenario: Shortcut while window visible

- **WHEN** the user presses the global toggle shortcut while the main window is visible and focused
- **THEN** the main window is hidden

#### Scenario: Shortcut while window hidden

- **WHEN** the user presses the global toggle shortcut while the main window is hidden
- **THEN** the main window is shown and focused
