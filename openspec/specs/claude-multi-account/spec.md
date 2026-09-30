# claude-multi-account Specification

## Purpose

Lets one OpenQuotaCycle install track and start five-hour windows for several Claude Code logins, one per Claude config directory, so inactive accounts stay warm while another account is in use.

## Requirements

### Requirement: Claude accounts are discovered per config directory

At app start the system SHALL discover Claude accounts from:

- the primary directory: the app's `CLAUDE_CONFIG_DIR` when set, else `~/.claude`
- every directory directly under the home directory whose name starts with `.claude-` and that contains `.credentials.json`
- every directory listed in `~/.config/openquotacycle/config.json` at `claude.accountDirs` (`~` expanded) that contains `.credentials.json`

The primary directory SHALL always map to provider id `claude`. Each other discovered directory SHALL map to its own provider instance. Directories without `.credentials.json` SHALL be ignored, except the primary. Discovery SHALL NOT run again while the app is running.

#### Scenario: Only the default login exists

- **WHEN** `~/.claude/.credentials.json` exists and no `~/.claude-*` directory or configured directory has credentials
- **THEN** the provider list contains exactly one Claude provider with id `claude`

#### Scenario: Second login in a suffixed directory

- **WHEN** `~/.claude-b/.credentials.json` exists in addition to `~/.claude`
- **THEN** the provider list contains `claude` and one additional Claude instance for `~/.claude-b`

#### Scenario: Configured directory outside the naming convention

- **WHEN** `claude.accountDirs` lists `/srv/claude/acc1` and that directory contains `.credentials.json`
- **THEN** a Claude instance is created for `/srv/claude/acc1`

#### Scenario: Directory without credentials

- **WHEN** `~/.claude-old` exists but has no `.credentials.json`
- **THEN** no Claude instance is created for it

### Requirement: Account identity, label, and dedupe

For each directory the system SHALL read `oauthAccount.accountUuid` and `oauthAccount.emailAddress` from the account config file: `<dir>/.claude.json` for non-primary directories; for the primary directory `<dir>/.claude.json` when `CLAUDE_CONFIG_DIR` is set, else `~/.claude.json`. A non-primary instance id SHALL be `claude@` followed by the first 8 characters of `accountUuid`, or `claude@` followed by the directory base name without the leading `.` when the uuid is unavailable. When two directories resolve to the same `accountUuid`, only the first in discovery order (primary, then scanned in name order, then configured) SHALL be kept. The primary card name SHALL stay `Claude`. A non-primary card name SHALL be `Claude · <label>` where the label is the directory base name without the leading `.claude-` prefix (`~/.claude-sub` → `sub`), or without only the leading `.` for other names. When at least one non-primary instance exists, every Claude card title SHALL show the account's full `emailAddress` as hover text when known. Missing or malformed `.claude.json` SHALL NOT prevent the instance from loading.

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
- **THEN** only `claude` is listed

#### Scenario: Single account keeps the plain name

- **WHEN** only the primary directory is discovered
- **THEN** the card name is `Claude`

### Requirement: Account instances behave as independent providers

Each Claude instance SHALL have the Claude manifest's lines, links, icon, brand color, and Window Starter capability. Order, enable/disable, Customize, Window Starter participation, runner, history, five-hour lock, leftover notify, crossing-go, and local HTTP API snapshots SHALL be keyed by the instance id. A newly discovered instance SHALL be enabled by default like `claude`. Existing `claude` settings and history SHALL keep applying to the primary directory.

#### Scenario: Independent Window Starter lock

- **WHEN** `claude` was started 1 hour ago and `claude@1234abcd` is idle, participating, and `claude` CLI is available
- **THEN** the system may start `claude@1234abcd` and MUST NOT treat the `claude` lock as blocking it

#### Scenario: Separate Window Starter cards

- **WHEN** two Claude instances are listed
- **THEN** the Window Starter section shows one card per instance, in provider order

### Requirement: Probes stay inside the account directory

A probe of a Claude instance SHALL read credentials from, refresh tokens for, and write refreshed tokens to only that instance's directory. `CLAUDE_CONFIG_DIR` observed by the plugin SHALL be the instance's directory. The app process environment SHALL NOT change.

#### Scenario: Token refresh writes back to its own directory

- **WHEN** the access token in `~/.claude-b/.credentials.json` is expired and refresh succeeds during the `claude@1234abcd` probe
- **THEN** the refreshed token is written to `~/.claude-b/.credentials.json`
- **AND** `~/.claude/.credentials.json` is unchanged

### Requirement: Window Starter runs the account's Claude Code

When starting a window for a non-primary Claude instance, the native host SHALL execute the same `claude` argv as for `claude` with environment `CLAUDE_CONFIG_DIR` set to that instance's directory. For `claude` the host SHALL NOT add or change `CLAUDE_CONFIG_DIR`. The WebView SHALL send only the instance id, runner id, window line, and prompt; it MUST NOT supply the directory or environment. Allowed runners for every Claude instance SHALL be `claude` only. The copied Customize command for a non-primary instance SHALL be prefixed with `CLAUDE_CONFIG_DIR=<POSIX-quoted dir>`.

#### Scenario: Account instance start

- **WHEN** `claude@1234abcd` (directory `~/.claude-b`) becomes eligible
- **THEN** the host runs `claude -p <prompt> --model claude-haiku-4-5 ...` once with `CLAUDE_CONFIG_DIR` set to the absolute `~/.claude-b` path

#### Scenario: Unknown instance id

- **WHEN** the frontend requests a start for `claude@ffffffff` that was not discovered
- **THEN** the host returns unsupported without spawning a process

#### Scenario: Third-party runner rejected for an instance

- **WHEN** a start is requested for `claude@1234abcd` with runner `opencode`
- **THEN** the host returns unsupported without spawning a process
