## MODIFIED Requirements

### Requirement: Expanded provider card shows On-Demand metrics and links

When a dashboard provider card has On-Demand metric lines or quick links, it SHALL show a bottom expand row that is a chevron expand control with no hidden-count caption. When it has neither, the card SHALL NOT show an expand control and SHALL NOT reserve expand-row height; its bottom content padding SHALL match its top content padding. When expanded, the card SHALL reveal the provider's On-Demand metric lines and then its quick links in an equal-width grid of at most three columns; when collapsed, those lines and links SHALL be omitted. Cards SHALL be collapsed by default, and expansion state SHALL persist while the application runs.

#### Scenario: Expanding a provider card

- **WHEN** the user activates a collapsed provider card's expand control
- **THEN** the card reveals the provider's On-Demand metric lines and quick links

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

#### Scenario: Quick links share the row equally

- **WHEN** an expanded card has two quick links
- **THEN** those links render in two equal-width columns under the On-Demand metrics
- **AND** a card with more than three links still uses at most three columns
