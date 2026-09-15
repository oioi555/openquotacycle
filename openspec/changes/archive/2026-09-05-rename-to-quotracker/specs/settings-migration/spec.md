## Purpose

Carries user data from the legacy Tuxmeter app directory to the new Quotracker one so renaming the app identifier does not silently reset users' settings.

## ADDED Requirements

### Requirement: Legacy app data migration on first run

Quotracker SHALL, on startup, migrate user data from the legacy `com.debba.tuxmeter` app directory when the new app directory has no `settings.json` yet: every regular file in the legacy directory except log files SHALL be copied into the new directory before settings are first read.

#### Scenario: Legacy directory exists on first launch

- **WHEN** the legacy `com.debba.tuxmeter` directory contains a `settings.json`
- **AND** the new `io.github.oioi555.quotracker` directory has no `settings.json`
- **THEN** the legacy settings (and other non-log files such as saved window state) are copied into the new directory
- **AND** the app starts with the user's previous settings

#### Scenario: Already-migrated or fresh install

- **WHEN** the new app directory already contains a `settings.json`
- **THEN** no migration copy happens and existing new-directory data is never overwritten

#### Scenario: No legacy directory

- **WHEN** the legacy `com.debba.tuxmeter` directory does not exist
- **THEN** startup proceeds normally with default settings and migration is a no-op

#### Scenario: Legacy directory unreadable

- **WHEN** the legacy directory cannot be read
- **THEN** startup proceeds with default settings and the failure is logged, never fatal
