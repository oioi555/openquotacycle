## ADDED Requirements

### Requirement: Linux keychain access for plugin credentials

Tuxmeter SHALL read and write plugin credentials through the Linux Secret Service API without requiring an external `secret-tool` executable.

#### Scenario: Store service credential

- **WHEN** the host API stores a credential for a service
- **THEN** it writes the secret with a `service` attribute in the default Secret Service keyring

#### Scenario: Store account credential

- **WHEN** the host API stores a credential for a service/account pair
- **THEN** it writes the secret with both `service` and `account` attributes

#### Scenario: Missing credential

- **WHEN** no matching keyring item exists
- **THEN** credential lookup returns an explicit error instead of silently succeeding
