## Context

The OpenCode Go provider previously read `~/.local/share/opencode/opencode.db`, summed assistant-message `cost`, divided by fixed plan amounts, and inferred rolling, weekly, and monthly reset boundaries. OpenCode now exposes authoritative usage through an authenticated endpoint. The server's effective allowance can vary by model, so a local dollar calculation cannot be made equivalent to the account quota.

The implementation is already present in the working tree; this document records the design after the fact.

## Goals / Non-Goals

### Goals

- Use OpenCode's authenticated rolling, weekly, and monthly percentages and reset timestamps.
- Preserve the existing progress-line UI contract (`used`, `limit: 100`, percent format).
- Keep the existing auth file as the only credential source.
- Fail closed when authoritative data is unavailable.
- Avoid exposing stale, unmarked local estimates through the persisted usage cache.

### Non-Goals

- Reconstructing account usage from local SQLite history.
- Applying `$12/$30/$60` limits or model prices to estimate quota.
- Adding a new secret storage mechanism, provider abstraction, or UI framework.
- Guessing a monthly reset timestamp from local subscription dates or calendar boundaries. A calendar-aware duration derived from the API reset is allowed for pace display metadata only.

## Decisions

1. `plugin.js` reads `opencode-go.key` from the existing OpenCode auth file and calls the fixed HTTPS URL through the host HTTP API. The key is only placed in the request header; errors and response data are not logged by the provider.
2. A dedicated response parser requires all three windows, an allowed status, a finite numeric `percent`, and a timezone-qualified ISO-8601 `resetsAt`. It clamps the used percentage to 0..100 and never applies a fraction heuristic, so `percent: 1` remains 1%.
3. API windows map directly to Session, Weekly, and Monthly lines. Session and Weekly retain their existing 5-hour and 7-day display durations. Monthly keeps the API `resetsAt` as its only reset source, while `periodDurationMs` is derived for pace UI metadata by reconstructing the preceding calendar anchor from that timestamp with end-of-month clamping. This does not change the reset timestamp or quota percentage.
4. API errors, malformed data, and absent credentials return a status badge. There is no quota fallback because the old value is an estimate with a different source of truth.
5. Persisted `opencode-go` cache entries are filtered at load time. Other provider snapshots retain their existing cache behavior; a successful fresh Go probe can still be cached for consumers.

## Risks / Trade-offs

- Users without an accessible Go key or entitlement see unavailable instead of an estimated bar. This is intentional: showing a precise-looking estimate would conceal the source failure.
- A 403 from the live endpoint cannot be distinguished by the provider from entitlement or access policy, so the UI reports access failure without exposing response details.
- The monthly pace marker uses a derived calendar duration because the API exposes the period end but not its start. A future API start/duration field could replace this display-only derivation without changing the quota source of truth.
