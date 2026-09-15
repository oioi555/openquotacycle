## Purpose

Defines that the plugin host does not spawn the inherited ccusage CLI, and that Claude and Codex probes do not declare or emit the local token-spend tiles that used it.

## ADDED Requirements

### Requirement: Host has no ccusage query surface

The plugin host SHALL NOT inject a `ccusage` object on `ctx.host`. The host SHALL NOT spawn `ccusage`, `@ccusage/codex`, or any other package CLI whose purpose is local token aggregation.

#### Scenario: Probe context has no ccusage API

- **WHEN** a plugin `probe` runs
- **THEN** `ctx.host.ccusage` is absent
- **AND** the host process does not start `bunx`, `pnpm dlx`, `yarn dlx`, `npm exec`, or `npx` to fetch or run those packages

#### Scenario: Missing package runner does not change quota probing

- **WHEN** the machine has no bun, pnpm, yarn, npm, or npx on PATH
- **THEN** Claude and Codex live quota probes still succeed or fail solely from their provider APIs and local credentials
- **AND** no token-spend tile is omitted as a `no_runner` fallback because those tiles are not emitted

### Requirement: Claude and Codex omit local token-spend tiles

Claude and Codex probes SHALL NOT emit `Today`, `Yesterday`, or `Last 30 Days` lines from local session logs or a token-usage CLI. Those labels MAY still appear on other providers whose spend comes from a local database, not from ccusage.

#### Scenario: Authenticated Claude probe has no token-spend tiles

- **WHEN** an authenticated Claude probe completes successfully with Session and Weekly data
- **THEN** the result contains no `Today`, `Yesterday`, or `Last 30 Days` line
- **AND** Session, Weekly, Extra usage, and Fable remain governed by the Anthropic usage payload

#### Scenario: Authenticated Codex probe has no token-spend tiles

- **WHEN** an authenticated Codex probe completes successfully with Session and Weekly data
- **THEN** the result contains no `Today`, `Yesterday`, or `Last 30 Days` line
- **AND** Session, Weekly, Luna Reserve, Reviews, Extra Usage, and Rate Limit Resets remain governed by the Codex usage payload
