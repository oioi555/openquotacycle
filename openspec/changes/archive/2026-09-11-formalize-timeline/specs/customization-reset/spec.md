## MODIFIED Requirements

### Requirement: Reset confirmation dialog

The dialog SHALL identify itself as "Reset All Customization?", state that installed providers turn back on and every provider's metric visibility and order are restored, and offer Cancel and destructive Reset All. Cancel, Escape, and backdrop dismiss SHALL abort with no state change.

#### Scenario: Cancel aborts

- **WHEN** the user cancels, presses Escape, or clicks the backdrop
- **THEN** no settings change and no probe starts

#### Scenario: Confirm resets everything

- **WHEN** the user confirms Reset All
- **THEN** all providers are re-enabled, per-provider visible sets and line orders are cleared, Timeline dashboard card rows are restored to both visible, Timeline card visibility is unchanged, and newly enabled providers are probed
