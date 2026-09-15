## Context

See proposal.md — Why. Linux leftover pings already go through `org.freedesktop.Notifications` (`src-tauri/src/notify.rs`). The first version passed the desktop-id as `app_icon`, sent no `desktop-entry` hint, and expired after 8000 ms. That code is already replaced; this design is the record.

## Goals / Non-Goals

**Goals:**

- Give the notification server an icon it can load, and keep the popup until dismiss so the once-per-window ping can be read.

**Non-Goals:**

- Click-to-focus from the notification (already out of leftover-notify).
- macOS / Windows backends.
- Changing title, body, Notify setting, or edge detection.

## Decisions

### 1. Icon path, not desktop-id

Freedesktop `app_icon` is a themed icon name or a file path. Passing `io.github.oioi555.quotracker` makes Plasma reserve the right-hand image slot and then fail the lookup. Resolve bundled `icons/icon.png` (same resource as the tray). If the file is missing, send empty `app_icon` rather than a fake name.

Alternative: empty `app_icon` and rely on `desktop-entry` only. Dev builds often have no installed `.desktop` file, so the card would have no icon.

### 2. `desktop-entry` hint

Set hint `desktop-entry` to the Tauri identifier (`io.github.oioi555.quotracker`) so the daemon can attach the card to the app. Urgency is normal (`1`). Do not send `image-data` (Plasma has crashed on that hint).

Alternative: omit hints. Then even a valid path is an unidentified flash on some desktops.

### 3. Expire timeout 0

Freedesktop: `0` = do not expire until dismissed; `-1` = server default. Default on Plasma is about five seconds. 8000 ms was still too short for leftover that melts at reset. Notify fires at most once per window, so a sticky popup is not a nag.

Alternative: `-1`. User DE timeout would hide the ping again. Alternative: a longer millisecond value. Still races the reader.

## Risks / Trade-offs

- [Sticky popup until dismiss] → Once per `pluginId`+label+`resetsAt`. User closes it.
- [Icon file missing in a broken resource dir] → Empty `app_icon`; no blank slot from a fake name.
- [Daemon ignores timeout 0] → History still keeps the card when `desktop-entry` is set.

## Migration Plan

No user data. Restart the app to pick up the Rust command. Rollback is a source revert.

## Open Questions

None.
