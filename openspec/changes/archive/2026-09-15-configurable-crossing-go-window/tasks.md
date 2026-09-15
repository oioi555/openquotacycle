## 1. Predicate and persistence

- [x] 1.1 Add `crossingGoRemainingMinutes` (30 | 60 | 90 | 120), default 60, load/save, invalid (including 300) → 60. `isCrossingGo` takes remaining-band ms (default 60 minutes). Tests: persist, fallback, last-hour still go, 4h remaining not go at 60, 80 min go at 90 not at 60, 100 min not go at 90, 40 min not go at 30.
- [x] 1.2 Thread the stored band through Overview meters and `selectTimelineCardItems`. Timeline 5-hour sort/pills follow the same band.

## 2. Settings UI

- [x] 2.1 Settings section **5-hour leftover** (not under Usage Display): **From** Last 30 min / Last 1 hour / Last 1.5 hours / Last 2 hours, and **Notify** switch (default on). Title names the 5-hour cadence. Wire bootstrap, change, and reset-to-defaults for both keys. Page test for the section.

## 3. Copy

- [x] 3.1 Chip and Timeline GO labels: `N% ahead of pace · melts at reset`. README: last hour is the default band. Never `dump`. Never “Cross reset” in the UI.

## 4. Notify

- [x] 4.1 Pure edge detector: first snapshot no notify; false→true once per `pluginId + label + resetsAt`; notify-off still records; collect leftover % + remaining face.
- [x] 4.2 Tauri `show_desktop_notification` (Linux `org.freedesktop.Notifications`). `TAURI_COMMANDS` subset. Controller + 30s ticker from App.svelte.

## 5. Verify

- [x] 5.1 Touched vitest, `openspec validate configurable-crossing-go-window --strict`, live Settings + band-entry notification, restore Dark / Left / Last 1 hour.
