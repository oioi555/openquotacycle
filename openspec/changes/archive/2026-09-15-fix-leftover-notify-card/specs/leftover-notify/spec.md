## ADDED Requirements

### Requirement: Linux leftover card stays readable

A Linux leftover-melting notification SHALL display the Quotracker app icon. It SHALL NOT show an empty image slot. The popup SHALL remain visible until the user dismisses it.

#### Scenario: Card shows the app icon

- **WHEN** a leftover melting notification is shown on Linux
- **AND** the bundled app icon file is present
- **THEN** the notification card displays the Quotracker icon

#### Scenario: Card stays until dismissed

- **WHEN** a leftover melting notification is shown on Linux
- **THEN** the popup remains until the user closes it
