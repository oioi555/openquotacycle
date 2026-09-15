## MODIFIED Requirements

### Requirement: Dedicated Resets page shows per-provider reset timeline
The system SHALL provide a dedicated Resets screen (`resets` in the navigation model) that renders up to two independent timeline sections: a five-hour quota section and a weekly quota section. A section SHALL be rendered only when it has at least one matching quota row. Each section SHALL contain one row for every matching quota definition, in provider order and then source-line order. A provider MAY therefore appear more than once in a section when it exposes multiple quotas of that cadence. Each section SHALL be rendered as a card with a header showing its axis span and row count. The Resets screen SHALL show a top bar with title and back control.

#### Scenario: Resets page shows both defined quota sections
- **WHEN** the active screen is Resets (`resets`) and at least one five-hour quota and one weekly quota are defined
- **THEN** the five-hour and weekly timeline sections are rendered in the Resets screen
- **AND** each section contains only its matching quota rows

#### Scenario: Resets page opened from side navigation
- **WHEN** the user selects Resets from the footer Options menu or activates the dashboard next-reset teaser row (the former side-navigation entry, now removed)
- **THEN** the system displays the Resets screen with current five-hour and weekly quota states

#### Scenario: Provider with multiple matching quotas keeps each definition
- **WHEN** one provider exposes two progress quota lines with the same supported cadence
- **THEN** the section renders two distinct rows for that provider
- **AND** each row exposes its quota label via visible text or via row title and marker tooltip so the definitions are distinguishable

#### Scenario: Undefined quota section is omitted
- **WHEN** no five-hour quota definition matches any provider
- **THEN** the five-hour section is not rendered
- **AND** a weekly section is still rendered when weekly quota rows exist

#### Scenario: Timeline hidden outside Resets page
- **WHEN** the active screen is any screen other than `resets` (dashboard, cost, customize, settings, window-starter)
- **THEN** neither quota timeline section is rendered

### Requirement: Provider icons stay legible on both light and dark themes
Provider icons in the row label column SHALL be rendered via CSS mask + `backgroundColor: getIconColor(brandColor, isDark)` — the same mechanism the dashboard provider cards use — rather than as a plain `<img>`. Dark brand colors (e.g. Z.ai, OpenCode-GO) SHALL be replaced with `#ffffff` in dark themes so they do not disappear into the background; light brand colors SHALL fall back to `currentColor` in light themes for the symmetric case. `getIconColor` SHALL live in a shared util (`src/lib/color.ts`) so dashboard provider cards and `TimelineRow` apply the same contrast rule.

#### Scenario: Dark brand color in dark theme
- **WHEN** a provider's `brandColor` has relative luminance < 0.15 AND the active theme is dark
- **THEN** the icon is painted `#ffffff` (not the brand color)

#### Scenario: Shared util with SideNav
- **WHEN** the timeline renders an icon
- **THEN** it uses the same `getIconColor` function that the dashboard provider cards use (the SideNav successor as single source of truth for the contrast rule)
