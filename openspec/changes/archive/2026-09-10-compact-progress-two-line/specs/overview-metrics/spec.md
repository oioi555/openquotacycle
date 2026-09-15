## MODIFIED Requirements

### Requirement: Expanded provider card shows On-Demand metrics and links

Each dashboard provider card SHALL reserve a bottom expand row of the same height whether or not the card can expand. When the card has On-Demand metric lines or quick links, that row SHALL be a chevron expand control with no hidden-count caption. When it has neither, the row SHALL be an empty spacer and SHALL NOT show an expand control. When expanded, the card SHALL reveal the provider's On-Demand metric lines and then its quick links in an equal-width grid of at most three columns; when collapsed, those lines and links SHALL be omitted. Cards SHALL be collapsed by default, and expansion state SHALL persist while the application runs.

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
- **AND** it still reserves the same bottom expand-row height as expandable cards

#### Scenario: Quick links share the row equally

- **WHEN** an expanded card has two quick links
- **THEN** those links render in two equal-width columns under the On-Demand metrics
- **AND** a card with more than three links still uses at most three columns
