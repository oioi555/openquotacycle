## Purpose

Defines the shared visual contract for tray, cards, meters, warning notices, and screen cross-link rows so every screen paints from one token and surface vocabulary instead of per-file class copies.

## ADDED Requirements

### Requirement: Shared tray and card surfaces

The panel SHALL paint on a tray background. Provider cards, the dashboard tokens card, grouped lists, and settings sections SHALL lift off that tray with the shared panel corner radius of 6px. Divider lines SHALL NOT separate stacked dashboard cards; whitespace alone separates them. All such surfaces SHALL use the shared card and tray tokens, not a one-off background.

#### Scenario: Cards lift off the tray

- **WHEN** the dashboard renders two or more provider cards
- **THEN** each card background is distinct from the tray and uses the 6px panel radius with no divider line between cards

#### Scenario: Grouped lists share the card surface

- **WHEN** Customize lists providers
- **THEN** the list uses the same card token and 6px radius as dashboard cards

### Requirement: Thin verdict meters

Each quota progress line SHALL render a 2px-tall capsule meter. Track color SHALL derive from the foreground on the tray. Fill SHALL encode pace: brand green derived from `#00E676` when on pace, yellow when projected to finish with under 10% spare, red when projected to run out or already exhausted. Fill width SHALL have a 2px minimum for any non-zero value. A 2×6px pace tick MAY overlay the meter. Fill SHALL NOT use the provider brand color.

#### Scenario: On-pace fill is brand green

- **WHEN** a quota line is on-pace
- **THEN** the meter fill uses the brand-green meter token, not a provider color and not system blue

#### Scenario: Warning and critical verdicts

- **WHEN** a quota line is projected to finish with under 10% spare
- **THEN** the meter fill is yellow, and when projected to run out or exhausted it is red

### Requirement: Plugin failures are warning callouts

A plugin error on a provider card SHALL render as a warning callout, not a destructive red alert. The first sentence SHALL be the title; remaining text SHALL be supporting detail when present. Stale-data warnings SHALL use the same warning tone.

#### Scenario: Blocking error is a warning callout

- **WHEN** a provider card has a blocking error whose message contains two sentences
- **THEN** the first sentence renders as the title, the rest as detail, and the callout uses the warning tone rather than destructive red

#### Scenario: Stale error uses warning tone

- **WHEN** a provider card shows a stale-data warning above cached metrics
- **THEN** that warning uses the warning tone, not destructive red

### Requirement: Cross-link rows share one nav-row surface

A screen-to-screen shortcut row SHALL show a leading icon, a title, a one-line subtitle, and a trailing chevron, on the shared card surface at the 6px panel radius.

#### Scenario: Settings shortcut on Customize

- **WHEN** the Customize list screen renders
- **THEN** a Settings nav-row appears below the provider list with title, subtitle, and chevron
