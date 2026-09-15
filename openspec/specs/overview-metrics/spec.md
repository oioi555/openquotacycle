# overview-metrics Specification

## Purpose
Defines which provider progress and statistics lines appear on Overview and how users persistently control optional summary metrics.

## Requirements

### Requirement: Overview metric visibility

The Overview page SHALL display the provider metric lines needed for the
summary view. A progress or text line SHALL be visible when the user
explicitly enabled it (stored visible set) or, absent a stored set, when the
manifest marks it `visibleByDefault` (`manifest-display-defaults`); other
lines SHALL be omitted from the collapsed card and remain available behind
the card's expand caret. No progress or text line is locked visible. Status
chips and notices SHALL NOT participate in this classification.

#### Scenario: Provider has multiple metric scopes

- **WHEN** a provider exposes a metric line outside the `overview` scope and
  the line is selected by the stored visible set or, absent that set, by its
  manifest default
- **THEN** the Overview page includes that metric line in the summary

#### Scenario: User hides an optional progress bar

- **WHEN** the user disables a progress line for a provider
- **THEN** the Overview page omits that progress bar while continuing to show
  the provider's other selected progress bars and text lines

#### Scenario: User hides provider statistics

- **WHEN** the user disables one of a provider's text lines for Overview
- **THEN** the Overview page omits that text line while continuing to
  show selected progress bars and other text lines

#### Scenario: First progress bar remains visible

- **WHEN** every progress line of a provider is hidden (unmarked and not
  explicitly enabled)
- **THEN** the collapsed card shows no progress bars beyond the provider
  header, and the lines stay available behind the card's expand caret
- **AND** no progress line is forced to stay visible

#### Scenario: Manifest marks hide unlisted lines

- **WHEN** a manifest marks only Session `visibleByDefault` and the user
  has no stored visible set for Weekly
- **THEN** Weekly is hidden from the collapsed Overview card but remains
  available behind the card's expand caret

#### Scenario: No visibility preference exists

- **WHEN** an existing installation or a newly discovered progress or text line has no
  stored visible set
- **THEN** visibility follows the manifest marks (unmarked lines stay hidden),
  so explicit per-provider curation is preserved

#### Scenario: Required progress data is unavailable

- **WHEN** a selected progress line has no runtime value but an On-Demand
  progress line is available
- **THEN** Overview does not promote the On-Demand line into the collapsed
  card; only selected available lines are shown
- **AND** the available On-Demand line remains accessible by expanding the card

### Requirement: Overview progress-bar selection

The Customize screen SHALL provide a per-provider detail view with metric
visibility controls. Each progress line and each text line SHALL be independently
classifiable as Always Visible or On-Demand in one shared list — there is no
Statistics section and no locked first line. A line's default
classification follows its manifest `visibleByDefault` mark
(`manifest-display-defaults`); a stored explicit visible set wins. Changed
classifications SHALL be persisted and applied to the collapsed dashboard
card without changing the provider's metric data. Legacy stored hidden-line
preferences (including legacy hidden statistics) SHALL be migrated into
explicit visible sets.

#### Scenario: Settings lists progress-bar choices

- **WHEN** a provider exposes multiple progress lines
- **THEN** the provider's Customize detail view shows each progress line as
  an independently classifiable item in Always Visible or On Demand

#### Scenario: Settings keeps metric choices collapsed

- **WHEN** the Customize list screen is opened
- **THEN** each provider's metric classifications live in that provider's
  detail view rather than inline in the list, so the list stays scannable

#### Scenario: Settings lists statistics choice

- **WHEN** a provider exposes text-based metric lines
- **THEN** the provider's Customize detail view shows each text line in the
  same Always Visible / On Demand lists as progress lines, and hiding one
  hides only that line from the collapsed dashboard card

#### Scenario: Selection is persisted

- **WHEN** the user classifies a progress line as On-Demand and later
  restarts the application
- **THEN** the line is not shown on the collapsed dashboard card while other
  classifications are retained

#### Scenario: Existing hidden-line preferences carry over

- **WHEN** an installation has stored hidden-line preferences (or legacy
  hidden statistics) from a previous version
- **THEN** they are migrated into explicit visible sets, and visibility on
  the collapsed dashboard card is unchanged

#### Scenario: Provider has no progress lines

- **WHEN** a provider exposes no progress lines and no text lines
- **THEN** the Customize detail view shows no metric choices and the
  dashboard card does not create a synthetic progress bar

#### Scenario: Detail view is opened

- **WHEN** the user expands a provider's dashboard card
- **THEN** the card shows all of that provider's metric lines regardless of
  On-Demand classifications — classification changes only collapsed-card
  visibility, never the provider's metric data

### Requirement: Overview metric ordering

The Customize screen SHALL let users reorder a provider's overview progress and text lines by dragging them, and the persisted order SHALL determine the row order of those lines on the dashboard card, both collapsed and expanded. Labels without a stored order position SHALL keep their manifest order after the stored ones. The ordering SHALL persist across restarts.

#### Scenario: Dragging reorders dashboard rows

- **WHEN** the user drags a progress or text line to a new position in the provider's Customize detail view
- **THEN** the dashboard card renders that provider's metric lines in the new order

#### Scenario: Order persists across restarts

- **WHEN** the user reorders a provider's metric lines and restarts the application
- **THEN** the dashboard card keeps the reordered layout

#### Scenario: New manifest lines append to the stored order

- **WHEN** a provider's manifest gains a progress or text line that has no stored order position
- **THEN** the new line renders after the lines with stored positions, in manifest order

### Requirement: Expanded provider card shows On-Demand metrics and links

When a dashboard provider card has On-Demand metric lines or quick links, it SHALL show a bottom expand row that is a chevron expand control with no hidden-count caption. Activating the chevron or clicking the card body (`ui-card`, the lifted surface under the header) SHALL toggle expansion. Nested pressable controls inside that body — used/left reading, reset chip, wake action, and quick links — SHALL NOT toggle expansion. The header row outside the card body SHALL NOT toggle expansion. When the card has neither On-Demand lines nor quick links, it SHALL NOT show an expand control, SHALL NOT toggle on card-body click, and SHALL NOT reserve expand-row height; its bottom content padding SHALL match its top content padding. When expanded, the card SHALL reveal the provider's On-Demand metric lines and then its quick links in an equal-width grid of at most three columns; when collapsed, those lines and links SHALL be omitted. Cards SHALL be collapsed by default, and expansion state SHALL persist while the application runs.

#### Scenario: Expanding a provider card

- **WHEN** the user activates a collapsed provider card's expand control
- **THEN** the card reveals the provider's On-Demand metric lines and quick links

#### Scenario: Card body click toggles expansion

- **WHEN** the user clicks the card body of a collapsed expandable provider card, not a nested pressable control
- **THEN** the card expands
- **AND** the chevron expand control remains visible

#### Scenario: Nested controls do not toggle expansion

- **WHEN** the user clicks a used/left reading, reset chip, wake action, or quick link on an expandable provider card
- **THEN** that control's own action runs
- **AND** the card's expanded state does not change from that click

#### Scenario: Header click does not toggle expansion

- **WHEN** the user clicks the provider name, plan, status chip, retry, or mark in the header above the card body
- **THEN** the card's expanded state does not change from that click

#### Scenario: Collapsed card hides On-Demand content

- **WHEN** a provider card is collapsed
- **THEN** On-Demand metric lines and quick links are not rendered for that provider

#### Scenario: Expansion persists during the session

- **WHEN** the user expands a provider card, navigates to another screen, and returns to the dashboard
- **THEN** that card is still expanded

#### Scenario: Expand control is chevron only

- **WHEN** a collapsed card has On-Demand lines or quick links
- **THEN** the expand control is a chevron with no hidden-count caption

#### Scenario: Card without On-Demand content keeps bottom space

- **WHEN** a provider has no On-Demand metric lines and no quick links
- **THEN** the card has no expand control
- **AND** it does not reserve expand-row height
- **AND** its bottom content padding matches its top content padding
- **AND** clicking the card body does not expand it

#### Scenario: Quick links share the row equally

- **WHEN** an expanded card has two quick links
- **THEN** those links render in two equal-width columns under the On-Demand metrics
- **AND** a card with more than three links still uses at most three columns
