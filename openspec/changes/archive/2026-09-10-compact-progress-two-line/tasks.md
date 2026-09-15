## 1. Two-row progress

- [x] 1.1 Collapse `metric-line-progress.svelte` to the two-row hybrid (label `w-24` + `Progress` flex on row 1; reading + time chips on row 2) and verify tests still cover verdict colors plus the elapsed-time tick
- [x] 1.2 Add a reset chip (Timer + compact remaining or compact clock) with the existing relative/absolute toggle and verify the face has no `Resets in` / `Resets today` prefix while the tooltip still does
- [x] 1.3 Add a run-out chip (Flame + compact ETA, Flame only when limit reached) only when behind or exhausted and verify `Runs out in…` / `Limit reached` leave the heading and remain in the tooltip / `aria-label`
- [x] 1.4 Keep the used/left control on row 2 and verify clicking it still flips `displayMode`
- [x] 1.5 Move `Progress` onto row 2 beside used/left; label + time chips on row 1. Verify the meter shares a row with the reading (not the label) and skeleton matches
- [x] 1.6 Drop the reading reserved column (`min-w-20`) so row 2 is left-packed and the bar is longer; absolute face date is `M/D` (`9/12 1:05`)
- [x] 1.7 Move a suffix-free reading (`100%`, not `100% left`) onto the label row; row 2 is the meter only. used/left toggle stays on the number.
- [x] 1.8 Keep that layout; revert chip color to `text-muted-foreground` (label + % stay primary)
- [x] 1.9 Drop the `N more` expander label; chevron only when expand would reveal lines or links. Top is `pt-[15px]`. Bottom stays original (`pb-2` + expand row). No-expand cards keep an empty expand-row of the same height.
- [x] 1.10 Port OpenQuota provider quick links into `plugin.json`. Render them as an equal-width grid (max 3 columns) at the bottom of the card.
- [x] 1.11 Add `pb-2` under the progress meter (and skeleton) so the bar is not flush against the next line, chevron, or links.

## 2. Formatters, skeleton, finish

- [x] 2.1 Add face-only compact formatters next to `formatReset*Label` / `formatRunsOutText` (do not change Resets-page `formatRemainingLabel`) and verify unit tests for relative `1h 5m` / `soon`, absolute without `Resets`, and run-out duration without `Runs out in`
- [x] 2.2 Match `skeleton-lines.svelte` progress placeholders to two rows and tighten provider-card progress `space-y`; verify collapsed + expanded cards still list the same lines
- [x] 2.3 `bun vitest --run src/lib/reset-tooltip.test.ts src/lib/pace-tooltip.test.ts src/svelte/components/metric-line-progress.test.ts src/svelte/components/provider-card.test.ts` and `bunx svelte-check --threshold error` and `openspec validate compact-progress-two-line --strict` all green
- [x] 2.4 Lift `skip_specs` and add spec deltas for two-row face (`ui-surfaces`), expand chrome (`overview-metrics`), and Codex Luna Reserve (`codex-account-quota`)
