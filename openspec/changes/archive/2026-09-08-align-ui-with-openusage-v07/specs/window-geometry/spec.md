## MODIFIED Requirements

### Requirement: Window geometry persistence
Quotracker SHALL open its main window at the default size of 320 × 700 logical pixels on first launch, SHALL let the user freely resize both width and height, and SHALL restore the previously saved size and position from the last session when supported by the platform. The configured minimum-width hint SHALL be 320 px; widths below 320 px are not a supported target for layout quality.

#### Scenario: Restore saved geometry

- **WHEN** the user launches Quotracker after resizing or moving the main window
- **THEN** the main window opens with the previously saved size and position

#### Scenario: First launch

- **WHEN** no saved window state exists
- **THEN** Quotracker opens at 320 × 700

#### Scenario: Free resize

- **WHEN** the user resizes the main window
- **THEN** both width and height follow the drag within platform limits

#### Scenario: Layout stays usable at the minimum width

- **WHEN** the main window is at or above the 320 px minimum width
- **THEN** no screen shows horizontal content overflow
