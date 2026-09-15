## MODIFIED Requirements

### Requirement: Quota output and fallback behavior

The plugin MUST prefer `RetrieveUserQuotaSummary` on both the local language server and Cloud Code. It MUST map exact bucket IDs `gemini-5h`, `gemini-weekly`, `3p-5h`, and `3p-weekly` to `Session`, `Weekly`, `Claude`, and `Claude Wk`, with five-hour or seven-day period metadata. A parsed empty summary is authoritative and MUST NOT fall through to legacy model endpoints. When the summary endpoint is unavailable, the plugin MUST retain the legacy per-model fallback and its progress-line contract. If local discovery or local retrieval fails, the plugin MUST continue to use Cloud Code with a valid discovered or cached/refreshed OAuth token. If no supported source yields model quota data, the plugin MUST return an actionable provider error rather than silently returning an empty success.

#### Scenario: Legacy local quota fallback succeeds

- **WHEN** the local summary endpoint is unavailable and the legacy language-server response contains supported model pools
- **THEN** the plugin returns manifest-aligned `Session` and/or `Claude` five-hour progress lines with valid percentage and reset metadata

#### Scenario: Current local quota summary succeeds

- **WHEN** the local language server returns a valid `RetrieveUserQuotaSummary` response
- **THEN** the plugin returns the recognized `Session`, `Weekly`, `Claude`, and/or `Claude Wk` lines with the corresponding five-hour or seven-day metadata, without using legacy per-model quota data

#### Scenario: Local quota unavailable but Cloud Code succeeds

- **WHEN** language-server discovery or local quota calls fail and Cloud Code returns supported model quota data
- **THEN** the plugin returns the same quota lines through the Cloud Code fallback

#### Scenario: Empty quota summary is authoritative

- **WHEN** either summary endpoint returns a valid response with an empty `groups` array
- **THEN** the plugin returns an empty quota result and does not call the legacy model endpoint

#### Scenario: No supported quota source succeeds

- **WHEN** no local or Cloud Code response contains usable supported model quota data
- **THEN** the plugin returns a non-empty error state and does not claim a successful quota reading
