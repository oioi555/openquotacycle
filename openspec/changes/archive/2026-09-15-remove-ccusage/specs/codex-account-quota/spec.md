## ADDED Requirements

### Requirement: Codex omits local token-spend tiles

Codex probes SHALL NOT emit `Today`, `Yesterday`, or `Last 30 Days` lines from local session logs or a package CLI. Account Session, Weekly, Luna Reserve, Reviews, Extra Usage, and Rate Limit Resets SHALL continue to come from the Codex usage API.

#### Scenario: Successful Codex probe has no local token-spend tiles

- **WHEN** an authenticated Codex probe returns usable account windows
- **THEN** the result contains no `Today`, `Yesterday`, or `Last 30 Days` line
- **AND** Session and Weekly remain classified by `limit_window_seconds` as in the existing Codex account-quota requirements

#### Scenario: Empty Codex usage payload still has no token-spend tiles

- **WHEN** the Codex usage request succeeds with no classifiable rate-limit windows
- **THEN** the result still contains no `Today`, `Yesterday`, or `Last 30 Days` line
