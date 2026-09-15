## MODIFIED Requirements

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
