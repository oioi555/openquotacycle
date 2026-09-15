## Why

Customize L1 had no bulk reset: restoring per-provider visibility, order, and enablement required manual per-row work. OpenQuota offers a top-bar reset with confirmation; Quotracker now matches it.

## What Changes

- Customize L1 top bar gains a reset action (reset icon, "Reset all customization") opening a confirmation dialog.
- `Reset All Customization?` dialog states scope (re-enable providers, restore visibility + order) with Cancel (also Esc/backdrop) and destructive Reset All.
- Confirm runs `handleResetAllCustomization`: clears `disabled`, drops per-provider visible sets and line orders, re-probes newly enabled providers, reschedules tray icon update.

## Capabilities

### New Capabilities
- `customization-reset`: reset-all semantics, confirmation gate, and top-bar entry point.

### Modified Capabilities
(none — no existing requirement text changes; overview-metrics reset scenarios already cover per-provider reset)

## Impact

- `settings-controller` (+1 handler), `app-ui-controller` (+1 dialog flag), `app-shell` (TopBar wiring + dialog render), new `reset-customization-dialog.svelte`.
- Tests: handler (re-enable + clear + probe), dialog (render/confirm/cancel/Esc), top-bar icon variant.
