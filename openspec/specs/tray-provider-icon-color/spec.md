# tray-provider-icon-color Specification

## Purpose
Defines the fixed full-color application icon in the system tray and plain-text provider summaries, independent of provider selection and theme changes.
## Requirements
### Requirement: Tray icon is the fixed app icon

The tray SHALL always show the static full-color app icon. No provider
symbol, progress bars, donut, percentage text, or brand color SHALL appear
in the tray, and no light/dark theme variant of the icon SHALL be tracked —
the color icon is legible on both panel styles and removes panel-color
recoloring as a failure source. (macOS may render it as a mask via a single
`setIconAsTemplate` call.) The tooltip SHALL keep plain-text provider
summaries.

#### Scenario: Providers update

- **WHEN** probe results arrive or providers are enabled, disabled, or reordered
- **THEN** the tray icon image does not change; only the tooltip text updates

#### Scenario: Theme toggles at runtime

- **WHEN** the user toggles between light and dark theme
- **THEN** no tray icon re-render is triggered for theme reasons
