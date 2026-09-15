## Purpose

Defines the dashboard visual rendering contract that makes Quotracker look like the OpenUsage/OpenQuota reference: layered cards, state-colored meters, compact type scale, TotalSpend donut card, usage trend, and footer Options chrome.

## ADDED Requirements

### Requirement: Layered dashboard surfaces

The dashboard SHALL render provider metrics on layered cards lifted off the tray background with 12px corner radius, 14px horizontal content padding, and 14px gaps between cards. Provider header rows (icon, name, plan) SHALL sit directly on the tray background above their card, not inside it. Cards SHALL NOT be separated by divider lines; whitespace alone separates them.

#### Scenario: Cards float off tray

- **WHEN** the dashboard renders two or more provider cards in dark mode
- **THEN** each card background is visibly lighter than the tray background with 12px rounded corners and no divider line between cards

#### Scenario: Content padding

- **WHEN** the dashboard renders at the 320px default width
- **THEN** content keeps 14px horizontal padding and 14px gaps between the TotalSpend card and provider cards

### Requirement: State-colored meters

Each quota progress line SHALL render a 5px capsule meter whose track is derived from the foreground color and whose fill color encodes pace state: blue when comfortably on pace, yellow when under 10% spare, red when projected to run out or exhausted. Fill width SHALL have a 5px minimum for any non-zero value. A 2px pace tick in foreground color MAY overlay the meter.

#### Scenario: On-track fill is blue

- **WHEN** a quota line is on-track
- **THEN** the meter fill renders blue (`#1689ef` light / `#2997ff` dark)

#### Scenario: Warning and critical verdicts

- **WHEN** a quota line is projected to finish with under 10% spare
- **THEN** the meter fill renders yellow, and when projected to run out or exhausted it renders red

#### Scenario: Reading line toggles

- **WHEN** the user clicks the left reading value
- **THEN** the display toggles between used and left; clicking the reset label toggles between countdown and exact time

#### Scenario: No status dots

- **WHEN** a quota line renders its heading
- **THEN** no status dot precedes the label; pace detail stays available via the heading annotation tooltip

### Requirement: Compact type scale and header treatment

Provider names SHALL render at 14px semibold, metric labels at 13px semibold, readings at 12px tabular numerals, and auxiliary text at 10-11px secondary/tertiary. The header SHALL show name plus plain 11px secondary plan text on the left, and an always-visible reload button followed by the 16px provider mark on the right. The plan SHALL render as full plain text with no fixed width cap, truncating only under overflow.

#### Scenario: Header shows plain plan text

- **WHEN** a provider has plan "Pro"
- **THEN** "Pro" appears as plain secondary text after the provider name with no pill border

### Requirement: Dashboard tokens summary

The dashboard top SHALL show a slim tokens card with a "Tokens" title, a three-segment period pill (Today / Yesterday / 30 Days) with sliding selection, and a large compact total with its unit. The donut and legend SHALL NOT appear on the dashboard; tokens is the only metric shown there.

#### Scenario: Period switch updates the total

- **WHEN** the user selects "30 Days"
- **THEN** the selection pill slides to the third segment and the large total updates to that period

### Requirement: Cost page TotalSpend card

The Cost screen SHALL show the full TotalSpend card above its existing sections: title-metric selector (Cost / Cost-per-MTok / Tokens), period pill, 104px donut with per-provider segments (minimum 2.5% visible slice), centered total, and ranked legend with 8px color dots.

#### Scenario: Donut renders on Cost

- **WHEN** the user opens the Cost screen with sample data
- **THEN** the donut shows one sector per provider with brand colors and the center shows the compact total

### Requirement: Usage trend row

Providers exposing daily history SHALL show a Usage Trend row of 30 bars (18px tall) in meter-fill color, with hover revealing a detail card of exact values.

#### Scenario: Trend bars render

- **WHEN** a provider has 30-day history
- **THEN** the card shows 30 bars and hovering a bar highlights it while dimming the rest

### Requirement: Footer Options chrome

The footer SHALL show a two-line identity block (version above, live "Next update in…" below, 10px secondary) on the left that refreshes everything on click, and a 26px pill Options trigger with foreground-bright label on the right that opens a 172px floating panel (radius 10) above the footer. The version SHALL NOT open About (About lives in the Options menu).

#### Scenario: Options opens upward

- **WHEN** the user clicks Options
- **THEN** a floating panel appears above the footer with Customize, Resets, Cost, Window Starter, Settings, About, Help entries

### Requirement: Options menu icons

Each Options menu entry SHALL show a leading 14px muted icon before its label: Customize (sliders), Resets (timer), Cost (currency), Window Starter (rocket), Settings (gear), About (info), Help (help-circle).

#### Scenario: Menu entries show icons

- **WHEN** the user opens the Options menu
- **THEN** every entry displays its icon left of the label and all entries remain navigable as before

### Requirement: Customize list provider icons

Each Customize provider row SHALL show the provider's brand icon (16px mask painted with the contrast-resolved brand color, `currentColor` fallback) before the provider name. Rows without a known icon SHALL render name-only with no layout shift beyond the missing glyph.

#### Scenario: Provider rows show brand icons

- **WHEN** the Customize screen lists providers with known icons
- **THEN** each row shows the provider icon left of the name while reorder, toggle, and detail-open behaviors stay unchanged

### Requirement: Provider card expansion

Progress and text classifications SHALL follow `manifest-display-defaults` and `overview-metrics`: stored visible sets take precedence over `visibleByDefault`, no progress line is mandatory, and missing data SHALL NOT promote an On-Demand line. Provider cards SHALL expose expansion only through a divider placed between the Always Visible section and the On-Demand section (same as OpenQuota), so the divider never moves on expand; content grows below it. The collapsed divider SHALL show the hidden count ("N more") beside the chevron. The header SHALL have no expand control. The header SHALL show name plus plain 11px secondary plan text on the left, and chevron, reload button, then the 16px provider mark on the right. The reload button SHALL stay hover-revealed when idle, show a spinner while loading/refreshing, and hide again after.

#### Scenario: Divider toggles expansion

- **WHEN** a card has on-demand content and the user clicks the bottom divider
- **THEN** the card expands or collapses with the same state as before

#### Scenario: No on-demand content means no divider

- **WHEN** a card has no hidden lines and no links
- **THEN** no divider renders and the card shows all lines

### Requirement: Customize switch controls with metric counts

Customize L1 rows SHALL show the provider name with an "N metrics" subtitle and a 28x16px switch for enablement, rendered as a single grouped list with separator lines between rows (no per-row cards). Customize L2 SHALL use an independent switch for each progress and text line, keeping drag-reorder and Always visible / On demand labels. Switch state SHALL follow the stored visible set or, absent that set, the manifest `visibleByDefault` mark; no provider-wide statistics switch or locked first line SHALL be introduced.

#### Scenario: L1 rows show counts and switches

- **WHEN** the Customize screen lists providers
- **THEN** each row shows "N metrics" under the name and a switch reflecting enablement; toggling it enables/disables without opening the detail

#### Scenario: L2 rows use switches

- **WHEN** the provider detail lists progress and text lines
- **THEN** each line shows a switch for Always visible / On demand with no behavior change

#### Scenario: L2 sections split Always Visible / On Demand

- **WHEN** the provider detail renders
- **THEN** checked lines list under Always Visible and unchecked under On Demand as separator rows; drag works within and across sections (cross-section drops reclassify), and order persists combined

#### Scenario: Provider detail top bar resets order

- **WHEN** the active screen is `customize:<pluginId>`
- **THEN** the top bar shows back plus a reset action (reset icon) that restores that screen's default display settings — manifest order and the `visibleByDefault` set for progress and text lines, leaving unmarked lines On-Demand; global refresh is not offered there
