# claude-quota Specification

## Purpose

Defines Claude live-quota authentication, Fable/Sonnet windows, and Session not-started handling for Linux Claude Code logins.

## Requirements

### Requirement: File or keychain login owns live meters

When a Claude Code file or keychain OAuth login is present, the provider SHALL use that login for Session, Weekly, Fable, Sonnet, and Extra usage. A `CLAUDE_CODE_OAUTH_TOKEN` environment value SHALL NOT replace that login for live meters. If the environment token is the only credential, the provider MAY use it for inference-only access. The provider SHALL NOT emit local token-spend tiles.

#### Scenario: Environment token does not blank live usage

- **WHEN** `~/.claude/.credentials.json` or the Claude keychain item has a usable OAuth login with `user:profile` scope
- **AND** `CLAUDE_CODE_OAUTH_TOKEN` is also set
- **THEN** Session and Weekly are fetched with the stored login
- **AND** the environment token is not used for those meters

#### Scenario: Environment-only credential skips live meters

- **WHEN** no file or keychain OAuth login is present
- **AND** `CLAUDE_CODE_OAUTH_TOKEN` is set
- **THEN** the provider does not fetch live Session/Weekly
- **AND** the provider does not emit Today, Yesterday, or Last 30 Days spend tiles

### Requirement: Fable is a separate weekly window

When the usage payload's `limits` array includes a model-scoped weekly Fable window with a numeric utilization, the provider SHALL expose a `Fable` progress line with a 100-percent limit and that window's reset time.

#### Scenario: Fable limit is present

- **WHEN** the usage response includes a Fable weekly limit with utilization 20
- **THEN** the provider emits a Fable progress line with used 20 and limit 100
- **AND** Sonnet, Session, and Weekly remain independently mapped from their existing fields

#### Scenario: Fable limit is absent

- **WHEN** the usage response has no Fable limit
- **THEN** the provider omits the Fable line

### Requirement: Unstarted Session has no countdown

When the five-hour usage window has a numeric utilization but no reset time, the Session line SHALL NOT invent a reset instant. The visible reset label SHALL read `Not started` rather than a countdown.

#### Scenario: Session has usage below one percent with a reset time

- **WHEN** Session utilization is 0 and a reset time is present
- **THEN** the Session line keeps that reset time
- **AND** the visible label is the countdown, not `Not started`

#### Scenario: Session has not begun

- **WHEN** Session utilization is present and the usage API reports no reset time
- **THEN** the Session line has no `resetsAt`
- **AND** the visible reset label is `Not started`
