# Spec Delta

## MODIFIED Requirements

### Requirement: Account identity, label, and dedupe

For each directory the system SHALL read `oauthAccount.accountUuid` and `oauthAccount.emailAddress` from the account config file: `<dir>/.claude.json` for non-primary directories; for the primary directory `<dir>/.claude.json` when `CLAUDE_CONFIG_DIR` is set, else `~/.claude.json`. A non-primary instance id SHALL be `claude@` followed by the first 8 characters of `accountUuid`, or `claude@` followed by the directory base name without the leading `.` when the uuid is unavailable. When two non-primary directories resolve to the same `accountUuid`, only the first in discovery order (scanned in name order, then configured) SHALL be kept. When the primary directory resolves to the same `accountUuid` as a kept non-primary directory, the primary SHALL be omitted from the provider list, so dedicated directories stay stable while an account switcher changes the primary login. A primary without a known `accountUuid` SHALL be kept. The primary card name SHALL stay `Claude`. A non-primary card name SHALL be `Claude · <label>` where the label is the directory base name without the leading `.claude-` prefix (`~/.claude-sub` → `sub`), or without only the leading `.` for other names. When at least one non-primary instance exists, every Claude card title SHALL show the account's full `emailAddress` as hover text when known. Missing or malformed `.claude.json` SHALL NOT prevent the instance from loading.

#### Scenario: Label from directory, email on hover

- **WHEN** `~/.claude-sub/.claude.json` has `oauthAccount.emailAddress` `work@example.com` and `accountUuid` `1234abcd-...`
- **THEN** the instance id is `claude@1234abcd`
- **AND** its card name is `Claude · sub`
- **AND** hovering its title shows `work@example.com`
- **AND** the primary card name stays `Claude` with its own email on hover

#### Scenario: Missing account file falls back to directory name

- **WHEN** `~/.claude-b/.claude.json` does not exist
- **THEN** the instance id is `claude@claude-b` and its card name is `Claude · b`
- **AND** its title has no hover text

#### Scenario: Same account in two directories

- **WHEN** `~/.claude` and `~/.claude-b` report the same `accountUuid`
- **THEN** only the `~/.claude-b` instance is listed
- **AND** no provider with id `claude` is listed

#### Scenario: Switcher changes the primary account

- **WHEN** `~/.claude-a` holds account A, `~/.claude-b` holds account B, and `~/.claude` currently holds account B
- **THEN** the listed Claude cards are `Claude · a` and `Claude · b`
- **AND** no `Claude` card is listed

#### Scenario: Two dedicated directories share an account

- **WHEN** `~/.claude-b` and `~/.claude-c` report the same `accountUuid`
- **THEN** only the `~/.claude-b` instance is listed

#### Scenario: Primary without account uuid is kept

- **WHEN** `~/.claude.json` has no `oauthAccount.accountUuid` and `~/.claude-b` has credentials
- **THEN** both `claude` and the `~/.claude-b` instance are listed

#### Scenario: Single account keeps the plain name

- **WHEN** only the primary directory is discovered
- **THEN** the card name is `Claude`
