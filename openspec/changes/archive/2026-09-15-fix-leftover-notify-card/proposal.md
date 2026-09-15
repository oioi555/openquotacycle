## Why

Leftover melting pings the desktop so leftover that melts at reset is noticed in time. The Linux card showed a blank image on the right and closed after eight seconds, so the ping was easy to miss. The Notify call already landed; this Change records the card contract.

## What Changes

- Linux `org.freedesktop.Notifications` uses a real icon file path (or empty) as `app_icon`, not the desktop-id.
- The call sets hint `desktop-entry` to the app identifier so the daemon can attach the card to Quotracker.
- `expire_timeout` is 0: the popup stays until the user dismisses it. Title `Leftover melting` and body copy stay.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `leftover-notify`: The Linux desktop card shows the app icon and stays until dismissed.

## Impact

- `src-tauri/src/notify.rs` only. Frontend IPC `{ title, body }` is unchanged.
- Bundled resource `icons/icon.png` is the icon source (same file as the tray).
- No settings key. Notify on/off and once-per-window edge detection stay as they are.
