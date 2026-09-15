## MODIFIED Requirements

### Requirement: Dashboard Timeline card

The dashboard SHALL render a Timeline card in the same chrome as provider cards. The Timeline card body SHALL use the same pressable hover lift as provider cards (`ui-pressable` and `hover:bg-card-hover`). The Timeline card SHALL show up to two rows (five-hour and weekly). Each row SHALL list the next in-axis reset per quota as a provider icon plus compact remaining time, laid out horizontally on a single line. Cadence labels SHALL share a column so remaining-time items start at the same x. Items that do not fit SHALL scroll horizontally on that row by dragging, SHALL NOT wrap, and SHALL NOT chain into dashboard vertical scroll. Activating the Timeline card SHALL navigate to `timeline`. The Timeline card SHALL be hidden when the user turns it off on Customize; it SHALL be visible by default. The dashboard SHALL NOT render a Cost teaser, TotalSpend card, or sample-data spend summary. On the 5-hour row, crossing-go items SHALL appear as meter-fill pills (remaining time in meter-fill on a meter-fill-tinted chip) and SHALL appear before non-crossing-go items (then soonest reset). 5-hour item labels SHALL include unused vs the pace tick, and crossing-go items SHALL include dump-and-cross. Weekly-row item color, chrome, and sort SHALL NOT use crossing-go, and weekly items SHALL NOT include that accelerator text.

#### Scenario: Next-reset row navigates to Resets

- **WHEN** the user activates the Timeline card on the dashboard
- **THEN** the Timeline screen (`timeline`) is displayed

#### Scenario: Timeline card lists per-provider remaining times

- **WHEN** the dashboard Timeline card is visible and at least one five-hour and one weekly quota reset fall inside their axes
- **THEN** the card shows a 5-hour row and a Weekly row
- **AND** each row lists provider icons with compact remaining times horizontally on one line
- **AND** remaining-time items in both rows start at the same x
- **AND** items that overflow a row scroll horizontally on that line by dragging rather than wrap

#### Scenario: Hidden Timeline card

- **WHEN** Timeline visibility is off
- **THEN** the dashboard does not render the Timeline card

#### Scenario: No Cost teaser

- **WHEN** the dashboard is displayed
- **THEN** it does not show a Cost teaser, TotalSpend card, or sample-data marker

#### Scenario: Crossing-go 5-hour items lead and use meter fill

- **WHEN** the dashboard Timeline card 5-hour row includes one crossing-go reset and one later non-crossing-go reset
- **THEN** the crossing-go remaining time uses `--meter-fill` on a meter-fill-tinted pill
- **AND** the crossing-go item is listed before the other 5-hour item
- **AND** the Weekly row items stay muted and ordered by soonest reset

#### Scenario: 5-hour Timeline items name unused vs tick and dump-and-cross

- **WHEN** the dashboard Timeline card 5-hour row includes a started 5-hour quota that is crossing-go
- **THEN** that item's accessible name includes ahead of pace and dump-and-cross
- **AND** weekly items on the same card omit that comparison

#### Scenario: Timeline card lifts on hover

- **WHEN** the pointer hovers the dashboard Timeline card body
- **THEN** the card uses the same pressable lift as provider cards
