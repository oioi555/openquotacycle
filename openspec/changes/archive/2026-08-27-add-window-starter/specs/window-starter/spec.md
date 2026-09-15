## Purpose

Provide an auditable, opt-in mechanism that starts supported idle five-hour quota windows with one minimal provider request and never retries that request automatically.

## ADDED Requirements

### Requirement: Global Window Starter control
The system SHALL provide one persisted global control for Window Starter, SHALL default the control to disabled, and SHALL initiate no window-start requests while it is disabled.

#### Scenario: Feature is disabled by default
- **WHEN** a user has not previously enabled Window Starter
- **THEN** the system shows Window Starter as disabled and does not execute provider CLIs

#### Scenario: User disables the feature
- **WHEN** the user disables Window Starter
- **THEN** the system prevents new window-start attempts while retaining existing activity history

### Requirement: Supported providers are detected automatically
The system SHALL automatically associate enabled Claude, Codex, and Z.ai providers with their fixed `claude`, `codex`, and `zcode` executables, respectively. A provider SHALL be eligible only when its latest successful quota data contains a valid five-hour window that is expired or has zero usage with no active reset time, and its corresponding executable is available.

#### Scenario: Supported idle provider is detected
- **WHEN** an enabled supported provider reports a valid idle five-hour window and its executable is available
- **THEN** the Window Starter page identifies the provider as ready without requiring provider-specific configuration

#### Scenario: Usage data is incomplete
- **WHEN** a provider response lacks a valid usage value or otherwise cannot establish an idle five-hour window
- **THEN** the system treats the provider state as unknown and does not execute its CLI

#### Scenario: CLI is unavailable
- **WHEN** an eligible provider's fixed executable cannot be found
- **THEN** the system displays the CLI as unavailable and does not create repeated execution records during quota refreshes

#### Scenario: Weekly quota is exhausted
- **WHEN** a provider's latest quota data indicates that an applicable weekly quota is exhausted
- **THEN** the system does not start that provider's five-hour window

### Requirement: One minimal request starts an eligible window
For each eligible idle episode, the system SHALL execute the provider's fixed non-interactive CLI at most once with a minimal prompt containing the local date, time, and time zone. The system SHALL invoke the executable directly without a shell and SHALL apply read-only or tool-disabled arguments supported by that CLI.

#### Scenario: Z.ai window is started
- **WHEN** Z.ai becomes eligible while Window Starter is enabled
- **THEN** the system executes `zcode --prompt <prompt>` once without additional command-line options

#### Scenario: Claude window is started
- **WHEN** Claude becomes eligible while Window Starter is enabled
- **THEN** the system executes `claude -p` once with Claude Haiku 4.5, no tools, one maximum turn, and no session persistence

#### Scenario: Codex window is started
- **WHEN** Codex becomes eligible while Window Starter is enabled
- **THEN** the system executes `codex exec` once using an ephemeral read-only session, GPT-5.6 Luna, no reasoning effort, and no Git repository requirement

### Requirement: Activation is confirmed without model retries
After a CLI attempt, the system SHALL refresh only the provider's quota data for a bounded confirmation period. It SHALL mark the attempt confirmed when the five-hour reset moves into the future, and SHALL mark it unconfirmed when confirmation expires. The system MUST NOT automatically execute another model request for the same idle episode, including when rounded usage remains at zero percent.

#### Scenario: Reset time advances
- **WHEN** refreshed quota data shows a future five-hour reset after the CLI attempt
- **THEN** the system marks the existing attempt as confirmed and records the new reset time

#### Scenario: Quota update is delayed or absent
- **WHEN** the bounded confirmation period ends without a future reset time
- **THEN** the system marks the attempt as unconfirmed and does not automatically send another prompt for that idle episode

#### Scenario: CLI execution fails
- **WHEN** the fixed CLI exits unsuccessfully or exceeds its execution timeout
- **THEN** the system marks the attempt as failed and suppresses automatic retries for five hours

### Requirement: Independent Window Starter page
The system SHALL provide a dedicated Window Starter navigation destination containing the global control, current supported-provider states, executable availability, and activity history. These controls SHALL not be added to the general Settings page.

#### Scenario: User opens Window Starter
- **WHEN** the user selects Window Starter from the side navigation
- **THEN** the system displays the current state of Claude, Codex, and Z.ai together with recent start attempts

### Requirement: Activity history is bounded and execution-focused
The system SHALL persist at most 500 Window Starter attempt records. Each record SHALL represent one actual CLI execution and SHALL be updated with its final confirmed, unconfirmed, or failed outcome. Routine quota probes, confirmation polls, ineligible checks, and repeated CLI-unavailable observations MUST NOT create history records.

#### Scenario: Confirmation polling occurs
- **WHEN** the system polls quota data multiple times after one CLI execution
- **THEN** the activity history contains one attempt record updated with the final result

#### Scenario: History reaches its limit
- **WHEN** a new attempt would increase persisted history beyond 500 records
- **THEN** the system removes the oldest records and retains the newest 500
