## Why

OpenCode Go meters dollar usage, and DeepSeek models on Go cost twice as much during DeepSeek's weekday peak windows. Quotracker already shows Z.ai Peak / Off-Peak in the provider header, but the OpenCode Go card gives no signal that DeepSeek traffic is currently expensive. Users in Japan need the official UTC windows, equivalent to 10:00-13:00 and 15:00-19:00 JST, labeled as DeepSeek rather than as a Go-wide rate.

The same card also mixes local Zen (`providerID` `opencode`) costs into Today / Yesterday / Last 30 Days. Quotracker does not support Zen quota or Zen as a provider. Those tiles should count Go spend only.

## What Changes

- Add an OpenCode Go header status chip that reads `DeepSeek Peak` or `DeepSeek Off-Peak`.
- Classify the instant from `ctx.nowIso` using DeepSeek's published Monday-Friday UTC windows: 01:00-04:00 and 06:00-10:00, with all other times including weekends as off-peak.
- Restrict local spend tiles to `opencode-go` message rows. Ignore Zen (`opencode`) and other provider IDs, including ChatGPT OAuth.
- Entitlement-only or missing-key probes that have no local Go spend fail closed instead of showing Zen tiles.
- Keep Go quota mapping, reset handling, and request behavior unchanged.
- Document the DeepSeek schedule, the DeepSeek-only meaning, Go-only spend, and the chip behavior on the OpenCode Go provider page.

## Capabilities

### New Capabilities

- `opencode-go-peak-hours`: Defines DeepSeek peak-window classification for OpenCode Go and its header status chip.

### Modified Capabilities

- `opencode-go-quota`: Local spend tiles count only `opencode-go` rows.

## Impact

- Affected files: `plugins/opencode-go/plugin.js`, `plugins/opencode-go/plugin.test.js`, `docs/providers/opencode-go.md`, `README.md`.
- No new network request, dependency, frontend component, IPC surface, persistence, or API contract.
- Existing Session, Weekly, and Monthly quota values remain unchanged.
- Mixed Go+Zen local databases will show lower spend totals (Zen portion dropped). Entitlement or missing-key probes with only Zen rows will throw instead of rendering spend tiles.
- The chip is informational only: GLM and other non-DeepSeek Go models keep flat rates.
