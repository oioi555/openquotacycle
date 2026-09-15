## ADDED Requirements

### Requirement: Overview footer shows per-provider reset timeline
The system SHALL render, in the Overview page's footer region (above the global app-shell `PanelFooter`), a stacked timeline that contains exactly one row per provider currently shown on the Overview page. Rows SHALL appear in the same order as the Overview cards so users can correlate a row with its card by position. The footer region SHALL NOT add left/right horizontal padding — it aligns flush with the cards above it, since the user runs the window at narrow sidebar-style widths and any inset makes the timeline look detached from the rest of the page.

#### Scenario: Timeline visible on Overview
- **WHEN** the active view is the Overview (`activeView === "home"`)
- **THEN** the footer quota timeline region is rendered with one row per provider shown on the Overview page, in card order
- **AND** the global `PanelFooter` (version + update countdown) remains visible below it

#### Scenario: Timeline hidden outside Overview
- **WHEN** the active view is a provider detail page or the settings page
- **THEN** the footer quota timeline region is not rendered

### Requirement: Time axis spans 12 hours from the current instant
The timeline axis SHALL span from the current instant (`now`, left edge, offset 0%) to 12 hours after `now` (right edge, offset 100%). All rows SHALL share this single axis so that reset instants at the same wall-clock hour line up vertically. The axis SHALL advance in real time using the existing `useNowTicker`. The 12-hour span was chosen because it fits two consecutive 5h windows (the most common provider period) while leaving room for an HH:MM gutter on the right (see the Layout requirement).

#### Scenario: Now line at the left edge
- **WHEN** the timeline is rendered at any instant T
- **THEN** a vertical "now" line is drawn at the leftmost position of the axis (0% offset)
- **AND** the axis right edge corresponds to `T + 12h`

#### Scenario: Real-time movement
- **WHEN** `useNowTicker` emits a new tick
- **THEN** all reset markers shift left as time advances
- **AND** any reset instant older than `now` is no longer rendered

### Requirement: Each row renders up to two upcoming resets
For each provider row, the system SHALL render up to two reset markers representing the provider's **next reset** (at `resetsAt`) and the **reset after that** (at `resetsAt + periodDurationMs`), as long as each instant falls within the 12-hour axis. Past instants are skipped by advancing `periodDurationMs` until strictly after `now`. Showing the next + next-next pair exposes how a rolling 5h cadence drifts across days (5h does not divide 24h evenly, so the reset time slides later each cycle), letting the user plan sleep / wake / work-start around the cadence.

Both reset markers on a row SHALL share a single visual style — solid 2px foreground line, HH:MM label to the RIGHT of the line, font-semibold — so the eye can scan a column of HH:MM labels without zig-zagging between sides.

#### Scenario: Provider with full data and both resets in-axis
- **WHEN** a provider exposes a `MetricLine.Progress` with `resetsAt = now + 1h` and `periodDurationMs = 5h`
- **THEN** the row renders TWO reset markers: at `now + 1h` and `now + 6h`
- **AND** both markers display their absolute HH:MM in the user's local timezone, on the RIGHT of each marker's line

#### Scenario: Next-next reset beyond axis
- **WHEN** `resetsAt = now + 8h` and `periodDurationMs = 5h` (next-next would be `now + 13h`)
- **THEN** the row renders ONE reset marker (the next reset only)

#### Scenario: Past resetsAt with periodDurationMs
- **WHEN** `resetsAt = now - 1h` and `periodDurationMs = 5h`
- **THEN** the row skips the past instant and renders the next two future cycles: `now + 4h` and `now + 9h`

#### Scenario: periodDurationMs absent
- **WHEN** a provider's representative progress line has `resetsAt` but no `periodDurationMs`
- **THEN** the row renders at most ONE reset marker (the next reset itself)

#### Scenario: Short-period providers may overlap labels; accepted
- **WHEN** a provider has `periodDurationMs` of 1h and both upcoming resets land in-axis
- **THEN** both markers render with the same style (label on the right)
- **AND** the two HH:MM labels MAY visually overlap when axis spacing is narrower than the label width — this is explicitly accepted because the alternative (splitting labels left/right) caused worse collisions on narrow windows where the user runs the app

#### Scenario: Provider without any resetsAt
- **WHEN** a provider has no progress line with `resetsAt`
- **THEN** the row is rendered as a muted placeholder showing the provider name and a "no reset data" indicator
- **AND** the row preserves its position in the card order

### Requirement: Three-column row layout with right-side HH:MM gutter
Each row SHALL use a three-column flex layout: `[ provider icon + name (w-32) | axis track (flex-1) | HH:MM gutter (w-12 shrink-0) ]`. The trailing gutter is empty; it reserves space for the HH:MM label of a marker anchored near the right edge (100%), which would otherwise be clipped by the track's overflow boundary. The `HourTicks` header SHALL use the same three-column structure (same widths, same outer gap) so per-row markers and the hour scale line up horizontally.

#### Scenario: Right-edge marker keeps its HH:MM visible
- **WHEN** a marker is anchored at axis offset 100% (or very close)
- **THEN** its HH:MM label extends into the right gutter and is fully visible (not clipped)

#### Scenario: HourTicks aligns with rows
- **WHEN** the timeline renders
- **THEN** the hour scale and the per-row tracks share the same horizontal start and end positions (same left spacer width, same right gutter width, same outer gap)

### Requirement: Out-of-span content is clipped; overflow indicator shown
Reset markers that fall outside the `[now, now + 12h]` span SHALL NOT be rendered inside the axis. When a provider exposes a `resetsAt` but no upcoming reset lands in-axis (e.g. the next reset is more than 12h away and `periodDurationMs` is absent), the row SHALL display an overflow indicator at the right edge so the user can tell "reset exists, just off-screen" from "no data".

#### Scenario: Reset beyond 12 hours, no period to step with
- **WHEN** a provider's `resetsAt` is more than 12 hours after `now` AND `periodDurationMs` is absent
- **THEN** no in-axis marker is drawn
- **AND** the row shows a single overflow indicator (e.g. a chevron at the right edge)

#### Scenario: Past resetsAt, no period
- **WHEN** `resetsAt` is before `now` AND `periodDurationMs` is absent
- **THEN** the row renders the overflow indicator only (no in-axis marker)

### Requirement: First resetsAt progress line represents the row
Within a provider, the system SHALL use the first `MetricLine.Progress` line that exposes `resetsAt` as the representative line for that row. Additional progress lines with `resetsAt` (e.g. a provider's secondary window) SHALL NOT spawn additional rows.

#### Scenario: Multiple progress lines, only one has resetsAt
- **WHEN** a provider exposes multiple progress lines but only one has `resetsAt`
- **THEN** the row uses the line that has `resetsAt`

#### Scenario: Multiple progress lines with resetsAt
- **WHEN** a provider exposes multiple progress lines that each carry `resetsAt`
- **THEN** the row uses the first such line
- **AND** other `resetsAt` lines are ignored by the timeline

### Requirement: Source data is the existing probe state
The timeline SHALL source per-provider progress data exclusively from the `pluginStates` already maintained by `useProbeState` (the same state that drives the Overview cards). No new probe, IPC channel, Tauri command, or persistence layer SHALL be introduced.

#### Scenario: No additional IPC
- **WHEN** the timeline renders
- **THEN** no new Tauri command invocation or event subscription is used beyond what `OverviewPage` already consumes

### Requirement: Hover or focus on a marker shows details
The system SHALL expose, on hover or keyboard focus of any reset marker, a tooltip containing the provider name, the absolute reset time (`HH:MM`, local), and the remaining time until that specific reset (e.g. "Resets in 2h 14m").

#### Scenario: Hover a reset marker
- **WHEN** the user hovers or focuses a reset marker
- **THEN** a tooltip appears with the provider name, the local `HH:MM` of that marker's reset instant, and a "Resets in Xh Ym" suffix

### Requirement: Provider icons stay legible on both light and dark themes
Provider icons in the row label column SHALL be rendered via CSS mask + `backgroundColor: getIconColor(brandColor, isDark)` — the same mechanism `SideNav` uses — rather than as a plain `<img>`. Dark brand colors (e.g. Z.ai, OpenCode-GO) SHALL be replaced with `#ffffff` in dark themes so they do not disappear into the background; light brand colors SHALL fall back to `currentColor` in light themes for the symmetric case. `getIconColor` SHALL live in a shared util (`src/lib/color.ts`) so `SideNav` and `TimelineRow` apply the same contrast rule.

#### Scenario: Dark brand color in dark theme
- **WHEN** a provider's `brandColor` has relative luminance < 0.15 AND the active theme is dark
- **THEN** the icon is painted `#ffffff` (not the brand color)

#### Scenario: Shared util with SideNav
- **WHEN** the timeline renders an icon
- **THEN** it uses the same `getIconColor` function that `SideNav` uses (single source of truth for the contrast rule)
