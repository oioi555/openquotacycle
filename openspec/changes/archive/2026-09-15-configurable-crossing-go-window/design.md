## Context

Crossing-go is true only in the remaining band of a started 5-hour quota that is below linear pace, when weekly is not behind. The default band is 60 minutes (sit-down). Headroom hatch still appears whenever usage is below the pace tick. README already names leftover that melts at reset. There is no notification plugin; Linux uses `org.freedesktop.Notifications`.

## Goals / Non-Goals

**Goals:**
- User-configurable remaining band: 30, 60, 90, 120 minutes. Default 60.
- Settings section **5-hour leftover**, independent of Usage Display (Show Usage As / Reset Times). The title names the cadence.
- Same band on Overview meters and the dashboard Timeline card 5-hour row.
- Optional desktop notification when a 5-hour leftover line *enters* that band.
- Shared copy: leftover that will disappear / melts at reset.

**Non-Goals:**
- Free-form minutes.
- Whole-window (300) preset.
- Scaling the band with leftover size.
- Weekly dump-and-cross / weekly GO notify.
- Click-to-focus from the notification.
- macOS / Windows notification backends.

## Decisions

- **Presets, not a slider.** Last 30 min / Last 1 hour / Last 1.5 hours / Last 2 hours. Matches Theme / Show Usage As / Auto Refresh.
- **Default stays 60 minutes.** Existing users and the README sit-down story do not change until they pick another option.
- **Notify default on.** Once per window after a prior not-go observation; a sit-down ping, not a nag. Recorded in choices.md.
- **Section name 5-hour leftover.** Matches Timeline cadence label. Time row **From**; switch **Notify**. Not “Melting leftover”, not “Cross reset”. Notification title stays `Leftover melting`.
- **Chip `N% ahead of pace · melts at reset`.** Notification title `Leftover melting`; body `{Provider} {Line} · {n}% left · gone in {remaining}` using leftover % (`100 − used%`) and the compact remaining face. `soon` → `gone soon`. Missing face → `gone at reset`.
- **Predicate takes remaining band as an argument.** Default argument is still 60 minutes so unit tests that omit it keep the old meaning.
- **Edge detect in the UI.** Key `pluginId + label + resetsAt`. Do not seed until every enabled plugin has data, an error, or finished loading. First ready snapshot seeds without notify. Widening the band can create a false→true edge and should notify. Notify off still records seen keys. 30s ticker so band entry between probes is not missed.
- **Linux D-Bus via a Tauri command.** `show_desktop_notification` using zbus 5 (`org.freedesktop.Notifications`), not `tauri-plugin-notification`. Frontend camelCase `{ title, body }`. Non-Linux returns success without sending. Failures log; they do not toast in-app.

## Risks / Trade-offs

- [Stored 300 from the unshipped Whole window option] → invalid → 60 minutes.
- [First probe after boot already in-band] → seed, no ping (would be noise at launch).
- [Notification daemon missing] → command errors, logged, no retry loop.

## Migration Plan

Absent `crossingGoRemainingMinutes` or `leftoverNotifyEnabled` = defaults (60 minutes, notify on). No rewrite of stored settings. Stored `300` falls back to 60.

## Open Questions

None.
