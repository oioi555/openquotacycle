## Why

Crossing-go is the sit-down band before a 5-hour reset: leftover that will melt, ready to spend across the next window. That band was hardcoded at 60 minutes. Some sessions want a longer warning. When leftover enters that band, a desktop ping is the same message as the glow — leftover is about to disappear — and it belongs next to the band, not under Usage Display. This change is reverse-engineered from the working tree after Settings → Melting leftover shipped.

## What Changes

- Persist `crossingGoRemainingMinutes`: 30, 60 (default), 90, or 120. Drop Whole window (300). Absent or invalid stored value (including 300) means 60 minutes.
- Settings → **5-hour leftover** (independent of Usage Display): **From** (Last 30 min / Last 1 hour / Last 1.5 hours / Last 2 hours) and **Notify** (default on). The title names the 5-hour cadence so weekly leftover is not implied.
- `isCrossingGo` uses the stored remaining band. Unused-vs-tick, weekly-never-go, and weekly-behind-blocks-go stay as they are.
- Overview chip and Timeline 5-hour labels name `N% ahead of pace · melts at reset` when crossing-go.
- Desktop notification on false→true crossing-go (once per `pluginId + label + resetsAt`). First observation already in-band does not notify. Notify off still records the edge so turning it on later does not flood.

## Capabilities

### New Capabilities

- `leftover-notify`: edge-triggered desktop ping when 5-hour leftover enters the remaining band.

### Modified Capabilities

- `crossing-go`: remaining band is the user-configured value (default 60 minutes); GO copy is leftover that melts at reset.
- `ui-surfaces`: Settings 5-hour leftover section; meter/chip copy `melts at reset`.
- `ui-navigation`: Timeline 5-hour GO labels include melts at reset.

## Impact

- `src/lib/crossing-go.ts`, `src/lib/settings.ts`, `src/lib/leftover-notify.ts`, Settings page, Overview meters, dashboard Timeline card, Tauri `show_desktop_notification`
- Tests for the predicate, persistence, Settings control, notify edges, and IPC contract
