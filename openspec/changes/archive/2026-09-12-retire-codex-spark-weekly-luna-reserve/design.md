## Context

See `proposal.md` for motivation. Codex already classifies account `rate_limit` windows by `limit_window_seconds` (18000 → Session, 604800 → Weekly) and collapses duplicates. `additional_rate_limits` did not: it labeled `primary_window` as the short name and `secondary_window` as `shortName + " Wk"`. Spark was listed as two On Demand lines. `gpt-reserve` was listed as `Luna Reserve` / `Luna Reserve Wk`.

OpenAI is retiring GPT-5.3-Codex-Spark the week of 2026-09-14. That is the only reason Spark comes out.

Live `wham/usage` (2026-09-12) is evidence for Luna Reserve: `gpt-reserve` with `metered_feature` `base_model_inference`, `normal_model_slug` `gpt-5.6-luna`, weekly `primary_window`, `secondary_window: null`. OpenAI Help Center describes Luna Reserve as one fallback allowance, not a 5-hour and weekly pair.

This Change is written after the plugin already matches that shape.

## Goals / Non-Goals

**Goals:**

- Stop advertising a retiring Spark quota in Customize and on the card.
- Show Luna Reserve as the weekly fallback it actually is.
- Keep unlisted Spark from force-showing if the API still returns it until shutdown.

**Non-Goals:**

- Changing Session / Weekly classification, Reviews, Extra Usage, Rate Limit Resets, or ccusage tiles.
- Surfacing `model_usage` or `promo`.
- Hiding Extra Usage when credits balance is `"0"`.
- Claiming or spending reset credits.
- Adding a second network request.

## Decisions

### 1. Skip Spark in the probe, not only the manifest

The API can still return `GPT-5.3-Codex-Spark` / `codex_bengalfox` until OpenAI shuts the model down. Unlisted probe labels are not in the hidden set, so they force-show on the collapsed card. Removing `Spark` / `Spark Wk` from `plugin.json` without skipping the additional-limit entry would keep a Spark meter after official retirement. Match `codex-spark` in `limit_name` or `codex_bengalfox` in `metered_feature`.

Alternative: keep mapping until the API stops returning Spark. Rejected because official retirement is the cutoff.

Alternative: drop only the manifest rows and leave probe mapping. Rejected because remaining payloads would still emit `Spark` / `Spark Wk` as unlisted lines.

### 2. Classify Luna Reserve by duration, not window position

Emit at most one line, labeled `Luna Reserve`, from the first `used_percent` window whose `limit_window_seconds` is 604800. Ignore 18000 and missing durations. The live payload puts the only reserve window in `primary_window`; treating primary as session created a fake 5-hour Reserve and a leftover `Luna Reserve Wk` catalog row.

Alternative: keep emitting primary as `Luna Reserve` and secondary as `Luna Reserve Wk` when both exist. Rejected because both captured windows were weekly in the old fixture, and live `secondary_window` is null. CLI `/status` shows one `gpt-reserve` meter.

Alternative: apply the account-level Session/Weekly duration rules to every additional limit. Rejected as out of scope; only Spark (retiring) and Reserve (weekly-only) needed a special case. Unknown additional limits still strip `GPT-<version>-Codex-` and use primary / `Wk`.

### 3. Keep Luna Reserve unmarked and rename the old Wk hide pref

One unmarked manifest line defaults to On Demand. Map stored `Luna Reserve Wk` onto `Luna Reserve` so a user who hid the duplicate weekly row does not see Reserve return as Always Visible.

### 4. Do not add `model_usage`

The live payload included `model_usage.gpt-6-astra` as an empty object. That is not a quota window. Leave it unused until it carries a duration and percent.

## Risks / Trade-offs

- [OpenAI gives Luna Reserve a real 5-hour window later] → Current rule omits it. Re-open the capability if a captured payload shows `limit_window_seconds: 18000` on `gpt-reserve`.
- [API still returns Spark until shutdown] → Probe skip hides it. Intended: official retirement.
- [Someone hid only `Luna Reserve` and wanted `Luna Reserve Wk`] → There is no remaining Wk line. The rename is one-way.
- [Main spec was updated before this Change existed] → Delta matches the already-written main requirement so archive is a no-op on that block.

## Migration Plan

No new settings key. Hidden `Luna Reserve Wk` becomes hidden `Luna Reserve` on the next settings load. Rollback restores Spark catalog rows and the primary/secondary Reserve split; stored hides for `Luna Reserve` stay.

## Open Questions

None. Extra Usage at `"0"` credits and Reviews when `code_review_rate_limit` is null stay as existing behavior, not this Change.
