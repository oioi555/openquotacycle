## Why

After a PC boot, Antigravity quota fails because no language server is running and the stored access token has expired. Only Antigravity/`agy` refreshes that token; Quotracker must not call Google's OAuth endpoint. The previous plan left the user with "Start Antigravity or agy and try again," which is the original inconvenience. `agy -p "/quota"` is a verified quota-free one-shot that refreshes the keyring, so the application can wake the official CLI instead of asking the user to do it by hand.

## What Changes

- Keep the display-only quota snapshot and the read-only `agy` keyring Cloud Code source (unchanged policy: no plugin-owned OAuth).
- When a live probe cannot run (expired token, no local server), the application MAY start the official CLI with argv `agy -p /quota --print-timeout 1m` — not a model prompt, not Window Starter's pin table.
- Customize L2 for Antigravity gains an **Auto-start agy** toggle, default off. On: a Stale result or the start-agy error runs the one-shot once, then re-probes (including the moment the toggle is turned on while already Stale). The card **Start agy** action stays visible while wake is still needed (icon-only refresh + tooltip; spins in flight) so a failed or in-flight wake is not a dead end. Off: the same action, click to run.
- Snapshot fallback MUST return the snapshot lines **and** the same actionable `error` string so the card callout stays (host: non-empty `error` + lines = stale notice, not a blocking empty card).
- The host MUST read `agy`'s Secret Service item when its content type is `text/plain; charset=utf8` (vendored `oo7` 0.6 + type-before-`;`).
- Do not spawn a second `agy` if an exact `agy` process is already running. Do not leave a daemon; `/quota` is one-shot and exits.
- Snapshot remains the fallback while wake is off, in flight, or failed. The plugin still never calls Google's token endpoint, never submits a refresh token, and never writes keyring entries.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `antigravity-quota`: successful probes persist a display-only snapshot; expired credentials with a snapshot show `Stale` plus the actionable callout `error`; the `agy` keyring access token is a read-only Cloud Code candidate (including `text/plain; charset=utf8`); when live fetch fails, the application can wake `agy -p /quota` automatically or via a card action, then retry the probe. Plugin-owned OAuth remains forbidden.

## Impact

- `plugins/antigravity/plugin.js` (+ tests): snapshot + keyring + snapshot `error` field (already implemented).
- Host: bounded `agy -p /quota --print-timeout 1m` spawn (new IPC, not Window Starter's model-prompt pin), skip if `agy` already exists, 60s timeout. Vendored `oo7` so Secret Service `text/plain; charset=utf8` is readable. Probe runtime keeps `error` + lines as a stale notice (`docs/plugins/schema.md`).
- Frontend: Antigravity Customize L2 toggle; provider-card Start agy (icon + tooltip) on Stale/error even when auto is on; probe controller auto-wake (toggle rising edge + probe) + re-probe + cooldown.
- Settings: persist the toggle (default off); Reset All Customization restores it.
- `docs/providers/antigravity.md`, `docs/window-starter.md`: snapshot, keyring, `/quota` wake vs Window Starter's quota-consuming `-p --model`.
