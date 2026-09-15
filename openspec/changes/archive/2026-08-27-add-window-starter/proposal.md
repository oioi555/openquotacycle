## Why

Some subscription providers leave a fresh five-hour quota window idle until the first model request, so the reset countdown does not begin when the previous window expires. Users need an opt-in way to start supported idle windows automatically without repeatedly consuming quota or inspecting CLI output manually.

## What Changes

- Add a globally controlled, default-off Window Starter that detects eligible idle five-hour windows for enabled Claude, Codex, and Z.ai providers.
- Start eligible windows with one minimal, timestamped request through each provider's fixed first-party CLI command.
- Confirm activation from refreshed quota data without retrying the model request automatically.
- Add an independent Window Starter page showing the global control, detected provider state, CLI availability, and bounded execution history.
- Persist only actual CLI attempts and their final outcomes; routine quota refreshes and confirmation polls are not activity records.

## Capabilities

### New Capabilities

- `window-starter`: Opt-in detection, safe activation, confirmation, status display, and activity history for supported five-hour quota windows.

### Modified Capabilities

None.

## Impact

- Frontend navigation, application state, settings persistence, probe scheduling, and a new Window Starter page.
- Tauri commands for fixed executable discovery and bounded non-interactive CLI execution.
- Provider quota normalization must preserve enough validity information to avoid treating missing usage values as an idle window.
- No public API or plugin SDK behavior is changed, and no new provider or model dependency is introduced.
