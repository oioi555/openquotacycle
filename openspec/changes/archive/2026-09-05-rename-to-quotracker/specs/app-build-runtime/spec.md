## ADDED Requirements

### Requirement: No inherited telemetry destination

Quotracker SHALL NOT send analytics events to an account or endpoint owned by an upstream project. No replacement telemetry SHALL be enabled unless it is explicitly configured and documented for Quotracker.

#### Scenario: Application use

- **WHEN** a user starts Quotracker or changes settings, providers, or update state
- **THEN** the application sends no Aptabase analytics event
- **AND** no upstream analytics application key is bundled
