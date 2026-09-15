# customization-reset Specification

## Purpose

Defines the bulk reset of all provider customization: what it restores, the confirmation gate before the destructive action, and where it lives.

## Requirements

### Requirement: Reset-all entry point on Customize L1

The Customize list screen SHALL offer a reset action in the top bar (reset icon, "Reset all customization"). Other screens keep their existing top-bar actions.

#### Scenario: Reset action opens confirmation

- **WHEN** the user activates the top-bar reset action on Customize
- **THEN** a confirmation dialog appears instead of executing immediately

### Requirement: Reset confirmation dialog

The dialog SHALL identify itself as "Reset All Customization?", state that installed providers turn back on, every provider's metric visibility and order are restored, and Window Starter participation, runner, and window picks return to plugin defaults, and offer Cancel and destructive Reset All. Cancel, Escape, and backdrop dismiss SHALL abort with no state change. The dialog SHALL NOT claim that the global Window Starter switch is reset.

#### Scenario: Cancel aborts

- **WHEN** the user cancels, presses Escape, or clicks the backdrop
- **THEN** no settings change and no probe starts

#### Scenario: Confirm resets everything

- **WHEN** the user confirms Reset All
- **THEN** all providers are re-enabled, per-provider visible sets and line orders are cleared, Timeline dashboard card rows are restored to both visible, Timeline card visibility is unchanged, stored Window Starter participation, runner, and window keys are cleared, the global Window Starter switch is unchanged, and newly enabled providers are probed
