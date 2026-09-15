## Context

See proposal.md Why. Current `metric-line-progress.svelte` is OpenQuota `QuotaMetric` (heading + meter + reading). Face strings today: `formatResetRelativeLabel` → `Resets in 1h 5m` / `Resets soon`; `formatResetAbsoluteLabel` → `Resets today at …` / `Resets tomorrow at …` / `Resets Sep 11 at …`; `formatRunsOutText` → `Runs out in 1h 41m`. Compact duration already exists as `formatCompactDuration` (`1d 15h`, `2h 14m`, `15m`, `<1m`). Meter tokens stay in `ui-surfaces`.

## Goals / Non-Goals

**Goals:**
- Two layout rows per progress line. Bars align across lines.
- Reset and run-out stay glanceable on the face without the English prefix, via icon + compact value.
- Keep toggles, tooltip sentences, tick, and verdict colors.

**Non-Goals:**
- Text metrics, header chips, notices, settings keys.
- One-row overlay (rejected: user wanted two rows).
- Changing Resets-page timeline labels (`formatRemainingLabel`).
- Auto-hiding Luna Reserve when used is 0. Hide is Customize On Demand, not a usage filter.
- Hiding other unlisted additional limits.

## Decisions

1. **Two-row hybrid, meter alone on row 2.**
   - Row 1: label (truncate, `title` = full) + suffix-free reading (`100%` / `$12` / count, no `left`) | time chips (`shrink-0`).
   - Row 2: `Progress` full width (2px + tick).
   - Why: displayMode is a single global used/left switch, so repeating `left` on every line is noise. The number sits next to the section label; the bar can use the full card width. Overlay-on-one-row was rejected; label+bar on row 1 and reading+bar on row 2 were earlier two-row passes.
   - Alternative: one flex row `[label][bar][value][times]` — rejected (2026-09-03). Label+bar on row 1 — rejected after seeing it live. Reading+bar on row 2 — rejected (`100% left` is redundant).

2. **Two time chips, not one combined string.**
   - Reset chip always when `resetsAt` parses (or `Not started` for unstarted 5h, no icon).
   - Run-out chip only when behind (ETA before reset) or limit reached.
   - Both may show at once on row 1. Prefixes drop on the face; tooltips keep the sentences.
   - Why: they answer different questions (when the window ends vs when this pace exhausts the cap). Combining them made the 3-row heading + reading split; two short chips fit one reading row.
   - Alternative: run-out only in tooltip — rejected; the user called it out as a face string kind.

3. **Face = icon + compact value; tooltip = full sentence.**
   - Reset relative: `Timer` 12px + `formatCompactDuration` (`soon` under 5 minutes). Click toggles relative/absolute.
   - Reset absolute: `Timer` + compact clock (`numeric` hour + `2-digit` minute today; `M/D` + time otherwise, e.g. `9/12 1:05`). No `Resets` / `today` / `tomorrow` words on the face.
   - Run-out: `Flame` 12px + `formatCompactDuration` of the ETA. Limit reached: `Flame` only (`aria-label` = `Limit reached`).
   - Chips stay `text-muted-foreground` (hover `text-foreground`). Label + % stay primary; darkening chips removed the hierarchy.
   - `aria-label` / tooltip stay the current long strings so tests and a11y do not depend on the face glyph.
   - Why: `Resets tomorrow at 2:00 PM` is what overflows 320px. Duration tokens already exist.
   - Alternative: icon only, value in tooltip — rejected; the user asked for remaining time/days on the face. Dark chip text — rejected live (no contrast vs label/%).

4. **Same component for collapsed Overview and expanded cards.**
   - Skeleton: row 1 label + reading bone + two chip bones, row 2 full-width thin bar. Card `space-y` tightened for the shorter block.

5. **Expand chrome: chevron-only, always-reserved row, equal-width links.**
   - Drop `{n} more`. Chevron when `onDemandLines` or `visibleLinks` exist; otherwise an empty expand-row spacer so cards without On-Demand content keep the same bottom height.
   - Top padding `pt-[15px]`; bottom stays `pb-2` + expand row. Meter row gets `pb-2` so the 2px bar is not flush against the next label, chevron, or links.
   - Quick links: OpenQuota destinations in `plugin.json`; CSS grid with at most three equal columns under On-Demand lines.

6. **Codex Luna Reserve is a listed On Demand line.**
   - `additional_rate_limits` whose name/feature contains `gpt-reserve` or `luna-reserve` map to `Luna Reserve` / `Luna Reserve Wk`. Spark mapping stays. Unlisted names still strip `GPT-<version>-Codex-`.
   - Unlisted probe labels are not in the hidden set, so they force-show on the collapsed card. Listing Luna Reserve unmarked puts it on Customize On Demand.
   - Alternative: omit-when-0 — rejected; the user asked for plugin show/hide, not a usage filter.

## Risks / Trade-offs

- [Two chips on a 280px row] → both `shrink-0`; truncate the label first, not the times. Worst case (flame + `1h 41m` + timer + `2h 14m`) still shorter than one `Resets tomorrow at 2:00 PM`. The bar no longer shares that row.
- [Absolute locale width] → face date is numeric `M/D` (`9/12 1:05`), not a localized month name. Time only when today.
- [Flame vs timer confused] → different icons; tooltips name the kind; flame only when behind/exhausted.

## Migration Plan

Display only. Revert the Svelte/tooltip files. No data migration. `resetTimerDisplayMode` storage unchanged.

## Open Questions

なし。
