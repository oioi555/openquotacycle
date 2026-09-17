## Purpose

Carries user data and XDG config from the Quotracker identifier and config directory into OpenQuotaCycle so renaming the app does not silently reset settings or drop saved keys.

## ADDED Requirements

### Requirement: Legacy app data migration on first run

OpenQuotaCycle SHALL, on startup, migrate user data from the legacy `io.github.oioi555.quotracker` app directory when the new app directory has no `settings.json` yet: every regular file in the legacy directory except log files SHALL be copied into the new directory before settings are first read. Failures SHALL be logged and SHALL NOT abort startup.

#### Scenario: Legacy directory exists on first launch

- **WHEN** the legacy `io.github.oioi555.quotracker` directory contains a `settings.json`
- **AND** the new `io.github.oioi555.openquotacycle` directory has no `settings.json`
- **THEN** the legacy settings and other non-log files are copied into the new directory
- **AND** the app starts with the user's previous settings

#### Scenario: Already-migrated or fresh install

- **WHEN** the new app directory already contains a `settings.json`
- **THEN** no migration copy happens and existing new-directory data is never overwritten

#### Scenario: No legacy directory

- **WHEN** the legacy `io.github.oioi555.quotracker` directory does not exist
- **THEN** startup proceeds normally with default settings and migration is a no-op

#### Scenario: Legacy directory unreadable

- **WHEN** the legacy directory cannot be read
- **THEN** startup proceeds with default settings and the failure is logged, never fatal

### Requirement: Legacy XDG config migration on first run

OpenQuotaCycle SHALL, on startup, copy `~/.config/quotracker/` into `~/.config/openquotacycle/` when the new config directory does not yet exist and the legacy directory does. The copy SHALL include `config.json` and `openrouter.json` when present. Failures SHALL be logged and SHALL NOT abort startup. After a successful copy, runtime config and OpenRouter key reads SHALL use the new directory.

#### Scenario: Legacy config directory exists on first launch

- **WHEN** `~/.config/quotracker/` exists
- **AND** `~/.config/openquotacycle/` does not exist
- **THEN** the legacy config files are copied into `~/.config/openquotacycle/`
- **AND** proxy and OpenRouter key reads use the new directory

#### Scenario: New config directory already present

- **WHEN** `~/.config/openquotacycle/` already exists
- **THEN** no config copy happens and existing new-directory files are never overwritten

#### Scenario: No legacy config directory

- **WHEN** `~/.config/quotracker/` does not exist
- **THEN** config migration is a no-op
