## MODIFIED Requirements

### Requirement: Read OpenRouter key accounting

The system SHALL read an OpenRouter API key from the first usable source in this order: `~/.config/openquotacycle/openrouter.json` `apiKey`, then `OPENROUTER_API_KEY`, then the `openrouter` entry in OpenCode's `~/.local/share/opencode/auth.json`. It SHALL query the key accounting endpoint with that key. Missing credentials SHALL tell the user to set an API key, not only to configure OpenCode.

#### Scenario: Configured OpenRouter key

- **WHEN** any of the key sources contains a non-empty key
- **THEN** the system queries the OpenRouter key endpoint and parses its accounting data

#### Scenario: Environment key is used

- **WHEN** `OPENROUTER_API_KEY` is set
- **AND** no saved config-file key is present
- **THEN** the provider uses the environment key

#### Scenario: OpenCode fallback key is used

- **WHEN** no environment or config key is present
- **AND** `~/.local/share/opencode/auth.json` contains an `openrouter` entry with a non-empty `key`
- **THEN** the provider uses that OpenCode key

#### Scenario: Missing or invalid key

- **WHEN** no key source has a usable key, or the endpoint rejects the key
- **THEN** the system reports that an OpenRouter API key must be configured or updated

#### Scenario: Management credits endpoint

- **WHEN** the system obtains OpenRouter accounting
- **THEN** it queries both the normal key endpoint and the account `/credits` endpoint with the same key
- **AND** it does not require a management-key-only credential
