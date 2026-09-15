## MODIFIED Requirements

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
