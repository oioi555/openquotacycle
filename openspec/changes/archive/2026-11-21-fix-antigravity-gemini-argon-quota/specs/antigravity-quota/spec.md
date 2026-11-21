## ADDED Requirements

### Requirement: Separate Argon weekly bucket mapping

When `RetrieveUserQuotaSummary` returns the exact `gemini-argon-wtu-weekly` bucket ID, the plugin MUST map it to `Argon Wk` with seven-day `periodDurationMs` without merging it into `Weekly`. When `gemini-argon-wtu-weekly` is absent, the plugin MUST omit `Argon Wk` cleanly without error.

#### Scenario: Separate Argon weekly bucket is reported when present

- **WHEN** `RetrieveUserQuotaSummary` includes `gemini-argon-wtu-weekly` alongside `gemini-5h` and `gemini-weekly`
- **THEN** the plugin emits an `Argon Wk` progress line with seven-day `periodDurationMs` and keeps `Weekly` bound only to `gemini-weekly`

#### Scenario: Absent Argon bucket is omitted cleanly

- **WHEN** `RetrieveUserQuotaSummary` omits `gemini-argon-wtu-weekly`
- **THEN** the plugin emits the remaining recognized lines without emitting `Argon Wk` or failing

### Requirement: Cloud Code requests use a versioned Antigravity User-Agent

Cloud Code fallback requests (`retrieveUserQuotaSummary` and `fetchAvailableModels`) MUST send the versioned `User-Agent` header `"antigravity/acp/1.3.0"` instead of bare `"antigravity"` so Cloud Code returns Gemini and Argon summary buckets alongside third-party buckets.

#### Scenario: Cloud Code fallback request includes versioned User-Agent

- **WHEN** the plugin sends a Cloud Code `retrieveUserQuotaSummary` or `fetchAvailableModels` request
- **THEN** the HTTP request header includes `"User-Agent": "antigravity/acp/1.3.0"`
