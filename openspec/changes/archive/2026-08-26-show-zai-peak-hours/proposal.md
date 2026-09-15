## Why

Z.ai charges GLM Coding Plan usage differently during its weekday peak window, but Tuxmeter currently shows quota consumption without indicating whether the higher-rate window is active. Users in Japan need to see that the official 14:00-18:00 UTC+8 window, equivalent to 15:00-19:00 JST, is currently peak or off-peak.

## What Changes

- Add a Z.ai `Peak Hours` status badge to the Overview and provider detail views.
- Derive `Peak` or `Off-Peak` from the current instant using Z.ai's fixed Monday-Friday 14:00-18:00 UTC+8 schedule.
- Use the established red/green status colors and keep existing quota calculations unchanged.
- Document the schedule, status behavior, and off-peak rate meaning for the Z.ai provider.
- Redact the existing Z.ai subscription `customerId` field from HTTP response-body logs, as required by the plugin security audit.

## Capabilities

### New Capabilities

- `zai-peak-hours`: Defines Z.ai peak-window classification and its status badge.

### Modified Capabilities

None.

## Impact

- Affected files: `plugins/zai/plugin.js`, `plugins/zai/plugin.json`, `plugins/zai/plugin.test.js`, `docs/providers/zai.md`, and `src-tauri/src/plugin_engine/host_api.rs`.
- No new network request, dependency, frontend component, IPC surface, persistence, or API contract.
- Existing session, weekly, and web-search quota values remain unchanged.
