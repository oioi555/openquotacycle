# leftover-notify Specification

## Purpose

Pings the desktop at most once per window when a 5-hour quota line becomes crossing-go, so leftover that will melt at reset is noticed in time to spend it.

## Requirements

### Requirement: Notify when leftover starts melting

When Notify is on, Quotracker SHALL send a desktop notification the first time a 5-hour progress line becomes crossing-go (false→true) for a given `pluginId`, line `label`, and `resetsAt`. Edge detection SHALL use the same remaining band as crossing-go. Edge detection SHALL NOT run until the snapshot is ready: every enabled plugin has data, an error, or finished loading. An empty plugin list SHALL NOT be ready. The first ready snapshot of already-crossing-go lines SHALL record those keys and SHALL NOT notify. The same key SHALL NOT notify again until `resetsAt` changes. Notify off SHALL still record keys so turning Notify on later does not replay in-band leftover. Weekly lines SHALL NEVER notify. The notification title SHALL be `Leftover melting`. The body SHALL name the provider, the line, leftover percent (`100 − used%` rounded), and remaining time as `gone in {face}` (or `gone soon` when the remaining face is `soon`, or `gone at reset` when remaining face is missing). Failures talking to the notification daemon SHALL be logged and SHALL NOT surface as in-app toasts. Linux SHALL send via `org.freedesktop.Notifications`. Other platforms SHALL treat the command as success without sending. The UI SHALL re-evaluate on input changes and at least every 30 seconds.

#### Scenario: Entering the remaining band notifies once

- **WHEN** Notify is on
- **AND** a 5-hour leftover line is observed not crossing-go
- **AND** the next observation has that same `pluginId`, label, and `resetsAt` as crossing-go
- **THEN** one desktop notification is sent for that key

#### Scenario: Already in-band at first snapshot does not notify

- **WHEN** Notify is on
- **AND** the first ready snapshot includes a 5-hour line that is already crossing-go
- **THEN** no desktop notification is sent for that line
- **AND** a later observation of the same key still does not notify

#### Scenario: Snapshot waits while a plugin is still loading

- **WHEN** an enabled plugin has no data, no error, and is still loading
- **THEN** melting leftover keys are not seeded
- **AND** no desktop notification is sent

#### Scenario: Notify off records the edge without pinging

- **WHEN** Notify is off
- **AND** a 5-hour leftover line becomes crossing-go
- **THEN** no desktop notification is sent
- **AND** turning Notify on while that key is still in-band does not notify

#### Scenario: Widening the remaining band can notify

- **WHEN** Notify is on
- **AND** a 5-hour leftover line is not crossing-go at Last 1 hour
- **AND** the user changes From to Last 1.5 hours or Last 2 hours so that line becomes crossing-go
- **THEN** one desktop notification is sent for that key

#### Scenario: Notification names leftover that will disappear

- **WHEN** a notification is sent for Claude Session with 58% leftover and remaining face `1h 4m`
- **THEN** the title is `Leftover melting`
- **AND** the body is `Claude Session · 58% left · gone in 1h 4m`

#### Scenario: Missing remaining face says gone at reset

- **WHEN** a notification is sent for a line whose remaining face is missing
- **THEN** the body ends with `gone at reset`

### Requirement: Persist leftover notify

`leftoverNotifyEnabled` SHALL persist as a boolean. Absent or invalid stored value SHALL mean on. Reset settings SHALL restore Notify to on.

#### Scenario: Missing leftover notify setting is on

- **WHEN** settings storage has no `leftoverNotifyEnabled`
- **THEN** Notify is on

### Requirement: Linux leftover card stays readable

A Linux leftover-melting notification SHALL display the Quotracker app icon. It SHALL NOT show an empty image slot. The popup SHALL remain visible until the user dismisses it.

#### Scenario: Card shows the app icon

- **WHEN** a leftover melting notification is shown on Linux
- **AND** the bundled app icon file is present
- **THEN** the notification card displays the Quotracker icon

#### Scenario: Card stays until dismissed

- **WHEN** a leftover melting notification is shown on Linux
- **THEN** the popup remains until the user closes it
