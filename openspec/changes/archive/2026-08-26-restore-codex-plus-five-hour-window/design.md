## Context

See `proposal.md` - Why. The current Codex account-quota path inspects both positional windows but emits only a seven-day `Weekly` line; every five-hour window is discarded. This was intentional while OpenAI did not expose a reliable five-hour allowance.

Relevant constraints:

- The response already provides the plan discriminator as `plan_type`; Plus is documented as the lowercase API value `plus`.
- Account-window usage headers are positional and contain no duration, so each header must stay correlated with the window in the same position.
- Duration, not `primary_window` or `secondary_window`, remains the classification signal.
- The plugin manifest controls Overview ordering and tray fallback candidates independently of runtime line emission.
- The reset timeline already classifies every eligible progress line by exact `periodDurationMs` (5h or 7d), so it can accept both Codex lines without production changes.

## Goals / Non-Goals

**Goals:**

- Add the narrowest possible exception to the current five-hour suppression: exact Plus plan plus exact five-hour duration.
- Emit Session before Weekly independently of API window position.
- Preserve positional header correlation, body fallback, reset metadata, and deterministic de-duplication.
- Keep Weekly usable as the Overview/tray fallback and weekly timeline row when Session is absent.

**Non-Goals:**

- Do not infer Plus from window shape or auth metadata.
- Do not restore Session for Pro, Team, Business, Enterprise, unknown, or missing plan values.
- Do not change model-specific `additional_rate_limits`, Reviews, Credits, token usage, timeline axes, or reset rendering.
- Do not add compatibility aliases for undocumented plan names or durations.

## Decisions

### D1. Gate Session on exact plan and duration values

An account window is Session-eligible only when `data.plan_type === "plus"` and `window.limit_window_seconds === 18000`. Weekly eligibility remains `limit_window_seconds === 604800` for every plan.

Rationale: the user-observed restoration is Plus-specific, and both discriminator values are present in the existing response contract. Exact matching fails closed when the undocumented endpoint changes. Alternatives rejected: enable 5h for all plans (expands scope and can expose stale/irrelevant windows); infer Plus from the presence of 5h (conflates entitlement with response shape); normalize arbitrary plan aliases (unsupported compatibility behavior).

### D2. Classify candidates by semantic bucket, then emit Session before Weekly

Inspect `[primary_window, secondary_window]` once, correlate each candidate with its positional header, and retain the first emit-capable candidate for each eligible bucket. Emit the retained Session candidate first and Weekly second.

An emit-capable candidate has a numeric positional header or body `used_percent`. Its `resetsAt` comes from the existing reset helper and its `periodDurationMs` is `limit_window_seconds * 1000`.

Rationale: a single classification pass preserves the current header/body rules while output order no longer depends on API position. First emit-capable wins extends the existing deterministic Weekly duplicate policy to Session. Alternatives rejected: emit while iterating positions (could put Weekly before Session); emit duplicate buckets (creates duplicate UI and timeline rows); use a header from another position (breaks correlation).

### D3. Restore Session as primary and retain Weekly as fallback

In the Codex manifest, declare Session before Weekly with `primaryOrder: 1`, and move Weekly to `primaryOrder: 2`. Both remain Overview progress lines.

Rationale: Plus users should see the shorter active quota first, while non-Plus and weekly-only responses still resolve the first available candidate to Weekly. Keeping Weekly as a candidate avoids an empty tray bar when Session is correctly suppressed.

### D4. Reuse the timeline's duration classification

No production timeline code changes are planned. Add a regression with Codex Session and Weekly lines proving they become distinct rows in the five-hour and weekly sections.

Rationale: timeline selection already operates on every valid progress definition and exact period duration. Provider-specific selection would duplicate logic and risk regressing other providers.

### D5. Keep generated plugin resources synchronized

Edit source files under `plugins/codex/`, then run the repository's plugin resource generation command. Do not manually diverge bundled resources.

## Risks / Trade-offs

- **The undocumented API changes `plan_type` spelling or casing** -> Session fails closed while Weekly remains available; update the explicit plan mapping only after observing a real response.
- **A non-Plus response unexpectedly carries a legitimate five-hour allowance** -> It remains hidden by design because this change is explicitly Plus-only.
- **Header and body percentages disagree** -> Preserve current positional-header precedence and pin it with tests.
- **Manifest reordering changes existing Overview preferences** -> Labels remain stable; Session becomes mandatory when available and Weekly remains a selectable/fallback line without a persistence migration.

## Migration Plan

1. Refactor the account-window block to retain at most one Session and one Weekly candidate under D1-D2.
2. Update Codex manifest ordering and regenerate bundled plugin resources.
3. Add focused plugin, tray/Overview fallback, and timeline regressions.
4. Update provider documentation and README metrics.
5. Run focused tests, full tests, lint/type/build checks, plugin host-API redaction audit, and strict OpenSpec validation.

Rollback is a source revert of the Codex plugin, manifest, generated resources, tests, and documentation. No persisted data or schema migration is involved.
