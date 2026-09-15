## MODIFIED Requirements

### Requirement: Overview metric visibility

The Overview page SHALL display provider metric lines needed for the summary
view and SHALL display the first progress line for each provider. Additional
progress lines SHALL be displayed by default and SHALL be omitted only when the
user disables those lines. Text-based statistics SHALL also be displayed by
default and SHALL be omitted when the user disables that provider's statistics.
Badge lines remain visible when statistics are hidden.

#### Scenario: Provider has multiple metric scopes

- **WHEN** a provider exposes a metric line outside the `overview` scope and
  the line is not disabled for Overview
- **THEN** the Overview page includes that metric line in the summary

#### Scenario: User hides an optional progress bar

- **WHEN** the user disables an additional progress line for a provider
- **THEN** the Overview page omits that progress bar while continuing to show
  the provider's other selected progress bars, statistics, and badge lines

#### Scenario: User hides provider statistics

- **WHEN** the user disables a provider's text-based statistics for Overview
- **THEN** the Overview page omits that provider's text lines while continuing to
  show selected progress bars and badge lines

#### Scenario: First progress bar remains visible

- **WHEN** a provider exposes one or more progress lines
- **THEN** the first progress line remains visible in Overview and cannot be
  disabled by the user

#### Scenario: No visibility preference exists

- **WHEN** an existing installation or a newly discovered progress line has no
  stored visibility preference
- **THEN** the progress line and provider statistics are visible so the current
  all-metrics behavior is preserved

#### Scenario: Required progress data is unavailable

- **WHEN** the required first progress line has no runtime value but another
  progress line is available
- **THEN** Overview displays the first available progress line so the provider
  still has a visible progress bar

## ADDED Requirements

### Requirement: Overview progress-bar selection

The Settings page SHALL provide per-provider controls for Overview progress
lines and text-based statistics. The controls SHALL be collapsed by default.
The first progress line SHALL be shown as selected and non-disableable; each
additional progress line SHALL have an independent checkbox. A provider with
text lines SHALL have one statistics checkbox that controls those text lines.
A changed selection SHALL be persisted and applied to Overview without changing
the provider's metric data.

#### Scenario: Settings lists progress-bar choices

- **WHEN** a provider exposes multiple progress lines
- **THEN** Settings shows the first line as a checked mandatory item and shows
  each additional line as an independently checkable item

#### Scenario: Settings keeps metric choices collapsed

- **WHEN** the Settings page is opened
- **THEN** each provider's Overview metric choices are collapsed until the user
  expands that provider's Overview display control

#### Scenario: Settings lists statistics choice

- **WHEN** a provider exposes text-based metric lines
- **THEN** Settings shows one statistics checkbox for that provider, and
  unchecking it hides those text lines from Overview

#### Scenario: Selection is persisted

- **WHEN** the user unchecks an optional progress line and later restarts the
  application
- **THEN** the line remains hidden from Overview while other selected lines
  retain their visibility

#### Scenario: Provider has no progress lines

- **WHEN** a provider exposes no progress lines
- **THEN** Settings shows no progress-bar choices for that provider and Overview
  does not create a synthetic progress bar

#### Scenario: Detail view is opened

- **WHEN** the user opens a provider's detail view
- **THEN** the detail view continues to show all of that provider's metric lines
  regardless of Overview progress-bar selections
