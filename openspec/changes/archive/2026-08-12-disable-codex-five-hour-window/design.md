## Context

See proposal.md - Why for motivation. Current state that shapes the approach:

- `plugins/codex/plugin.js:484-539` classifies the account-level `rate_limit` by **position**: `primary_window` → "Session" (hard-coded `PERIOD_SESSION_MS` = 5h), `secondary_window` → "Weekly" (hard-coded `PERIOD_WEEKLY_MS` = 7d). It prefers header percentages (`x-codex-primary-used-percent` / `x-codex-secondary-used-percent`) and falls back to body `used_percent` only when no header line was emitted.
- `additional_rate_limits` (plugin.js:541-573) already derives `periodDurationMs` from the API-provided `limit_window_seconds` (with a Session fallback when absent); the Reviews line (plugin.js:575-587) is hard-coded weekly via `code_review_rate_limit.primary_window`.
- The quota-reset-timeline spec (`openspec/specs/quota-reset-timeline/spec.md`) selects the provider's representative as **the first** `MetricLine.Progress` that exposes `resetsAt` (`src/lib/quota-timeline/select.ts`). Today that is the Session line; after this change it must be the Weekly line.
- External observation (not primary-source confirmed; the endpoint is undocumented): OpenAI stopped exposing a five-hour window in live usage responses around 2026-07-12 and has given no commitment to restore it. The design must not over-assert this, and must keep working if the shape changes again.
- `README.md:41` advertises Codex as "session, weekly, reviews, credits"; `docs/providers/codex.md` documents the positional 5h/7d mapping and hard-codes `18000 = 5h` in its example.

## Goals / Non-Goals

**Goals:**

- Classify the account-level `rate_limit` windows by their API-provided `limit_window_seconds` duration only — never by `primary_window`/`secondary_window` position.
- Emit exactly one account-level `Weekly` line when a 7-day window (`limit_window_seconds === 604800`) appears in either position, carrying the window's actual `resetsAt` and actual duration.
- Never fabricate a Session line (or any line) from a window whose duration is unknown or missing.
- Preserve `additional_rate_limits` and `code_review_rate_limit` (Reviews) behavior byte-for-byte.
- Keep `select.ts` first-line selection working for Codex so the timeline row shows the Weekly representative.

**Non-Goals:**

- No new plugin API field, IPC command, persistence format, or dependency (per proposal).
- No changes to `additional_rate_limits` classification, its Session fallback, or Reviews.
- No attempt to "repair" the five-hour display if OpenAI restores it; re-enabling is a deliberate follow-up change (see Open Questions).
- No changes to the timeline axis (still 12h) or marker rendering; only the Codex input to it changes.

## Decisions

### D1. Account-level windows are classified by duration, position-independently

For each window in the account-level `rate_limit`, classify strictly on `limit_window_seconds`:

| `limit_window_seconds` | Classification |
|---|---|
| `604800` | Weekly line (duration = `604800 * 1000`) |
| `18000` | Ignored (five-hour window no longer exposed) |
| absent / other / non-number | Ignored — no line, no fallback |

Rationale: the proposal's root cause is OpenAI returning the weekly allowance in the primary position; position-based labeling is the bug. Duration is the only stable signal the API provides. Alternatives considered: (a) keep position mapping and just drop the Session label — rejected, it re-bugs the weekly-in-primary case; (b) label unknown durations "Weekly" optimistically — rejected, it repeats the mislabeling with the opposite polarity; (c) infer duration from `reset_at - now` — rejected, rolling windows make this unreliable at the boundary.

The `18000 → ignore` branch is the single toggle point if OpenAI restores the five-hour window.

### D2. Header percentages are used only when positionally correlated with a classifiable window

`x-codex-primary-used-percent` maps positionally to `rate_limit.primary_window` and `x-codex-secondary-used-percent` to `rate_limit.secondary_window`. For each position:

- Header present **and** window exists **and** window is weekly-classifiable → emit `Weekly` with `used = header`, `resetsAt`/period from that window.
- Header present but the corresponding window is `null`, missing, or has no usable duration → emit **nothing** for that position (the header value alone cannot be classified; guessing Session or Weekly would be misclassification).
- Header absent → use the window's body `used_percent` if the window is weekly-classifiable.

Rationale: the header carries a percentage but no duration; classification therefore requires the body window object at the same position. Alternatives considered: (a) trust the header's position (`primary` → Session) — rejected, exactly the bug being fixed; (b) use the header percentage for whatever window was classified regardless of position — rejected, unverifiable and breaks when two weekly windows disagree. This means a header for a missing/unclassifiable window is dropped rather than guessed — an explicit, documented information loss.

### D3. Duplicate weekly candidates resolve deterministically (first position wins)

When both `primary_window` and `secondary_window` classify as Weekly, emit exactly one line using the **first emit-capable** position in fixed iteration order (`primary_window`, then `secondary_window`). A candidate is emit-capable only when its positional header or body provides a numeric usage value; otherwise iteration continues to the next weekly candidate.

Rationale: a deterministic rule is required by the "exactly one Weekly line" goal; both windows represent the same weekly bucket so they should agree, but when they don't, silent non-determinism is worse than either choice. Skipping a candidate that cannot produce a progress value prevents an empty primary candidate from hiding a usable secondary candidate. Alternatives considered: prefer the window carrying `reset_at` — rejected, both usually carry it, and it reintroduces data-dependent ordering. The first-emit-capable rule is stable across probes.

### D4. Actual `resetsAt` and period are preserved

The Weekly line uses the window's own `reset_at` (or `now + reset_after_seconds`, via the existing `getResetsAtIso`) and `periodDurationMs = limit_window_seconds * 1000` — not the hard-coded `PERIOD_WEEKLY_MS`. Existing period constants remain available to the explicitly unaffected `additional_rate_limits` fallback and Reviews paths, but the account-level path no longer uses the five-hour constant.

Rationale: the timeline computes the "reset after next" as `resetsAt + periodDurationMs`; hard-coding a 7d constant could drift from a server-chosen window length (e.g. 7d vs 168h rounding). Using the API duration keeps the timeline's second marker honest.

### D5. Unify the header/body dual path into one per-position routine

Replace the "headers preferred, body only when `lines.length === 0`" branch with a single iteration over `[primary_window, secondary_window]` applying D1-D4 (`used = header ?? window.used_percent`). This removes the odd coupling where body data was dropped merely because a header existed, and guarantees the same classification rules apply on both paths.

### D6. Timeline: `select.ts` stays unchanged; regression covers the Codex shape

After the change, the account-level Weekly line is the only progress line with `resetsAt` emitted before `additional_rate_limits` lines, so "first progress line with `resetsAt`" (`select.ts`) already selects it. No change to `select.ts` or the timeline component. The weekly period on a 12h axis usually renders one in-axis marker (next reset) with the next-next at +7d off-axis — consistent with the existing "past/off-axis skip" behavior.

### D7. Documentation reflects duration-based classification

`docs/providers/codex.md` gets the duration table (D1), an updated example showing the weekly window in the primary position, and a note that the five-hour line is intentionally not displayed. `README.md:41` drops "session" → "weekly, reviews, credits".

### D8. Weekly becomes the Codex primary metric

The Codex plugin manifest removes the obsolete Session overview declaration and assigns `primaryOrder: 1` to Weekly. This keeps tray-bar candidate selection aligned with the only account-level progress line the runtime can emit. The bundled plugin resources are regenerated from `plugins/` rather than edited independently.

## Risks / Trade-offs

- **Reverse-engineered, undocumented API may change window shapes** (e.g. stop sending `limit_window_seconds`, or send a novel duration) → Mitigation: classification is purely duration-driven; a novel/absent duration yields no account-level line instead of a wrong label, and this design documents that trade-off. The plugin already degrades gracefully when no rate-limit lines exist (token/credits lines remain).
- **Header dropped when its window is missing/unclassifiable** → Mitigation: accepted, deliberate (D2); avoids misclassification, which the proposal ranks as the worse failure. Tests pin this behavior.
- **Both windows weekly with differing percentages** → Mitigation: first-position rule (D3) picks one deterministically; the pair should represent the same bucket, and a divergence signals an API change better surfaced as a test failure than as a mystery line.
- **External observation about the 5h removal is secondary information** — OpenAI has no restore commitment, and this change would hide a restored 5h window. → Mitigation: the `18000 → ignore` branch is a single explicit toggle; re-enabling is a small, well-scoped follow-up (Open Questions). The design does not assert the timeline of removal as fact in code or docs beyond "no longer exposed".
- **Test churn**: several existing tests assert a "Session" line from windows without `limit_window_seconds` (e.g. plugin.test.js:137-173, 575-602, 604-653) → Mitigation: these are reworked to the new semantics and the three canonical regression scenarios (below) become the guardrail.
- **Timeline cadence change**: Codex row switches from 5h markers to weekly markers → Mitigation: this is the intended fix (the 5h line was a mislabel); the timeline's past-skip and overflow behavior already handles 7d periods.

## Migration Plan

1. `plugins/codex/plugin.js`: replace the account-level block (lines 484-539) with the D1-D5 routine; keep the existing period constants for the unaffected `additional_rate_limits` and Reviews blocks, and leave those blocks untouched.
2. `plugins/codex/plugin.test.js`: rework tests that assert a Session line; add the canonical regressions:
   - **weekly-only**: `primary_window` with `limit_window_seconds: 604800` (+ header) → single `Weekly` line, `periodDurationMs = 604800000`, `resetsAt` from `reset_at`, no Session line.
   - **legacy primary+secondary**: `primary_window` 18000 + `secondary_window` 604800 → exactly one Weekly line; the 5h window is ignored.
   - **missing-duration**: window(s) without `limit_window_seconds` → no account-level line (no Session/Weekly fabrication); header-only-with-null-window case included.
   - **duplicate weekly**: both windows 604800 → exactly one Weekly line (primary wins).
3. `src/lib/quota-timeline/select.test.ts`: add a Codex-shaped case (Weekly line first with `resetsAt`, later additional-limit lines) asserting the Weekly line is selected — pins D6 without touching `select.ts`.
4. `docs/providers/codex.md` and `README.md:41`: apply D7.
5. `plugins/codex/plugin.json`: remove Session and promote Weekly to `primaryOrder: 1`; regenerate bundled plugin resources and test the manifest-derived tray candidate.
6. Rollback: revert the Codex plugin and manifest diffs; the plugin is self-contained (no schema/persistence change), so a git revert is complete. No data migration.

## Open Questions

- **Will OpenAI restore the five-hour window, and in what position/duration?** Deferrable: the `18000 → ignore` branch is the single toggle point; restoring it is a separate change with its own proposal. Nothing in the specs or tasks depends on the answer.
- **Do `x-codex-*` header percentages ever disagree with body `used_percent`?** Deferrable: D2/D5 keep header precedence when classifiable; a future mismatch investigation would not change the design or tasks.
