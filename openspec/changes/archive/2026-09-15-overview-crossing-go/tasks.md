## 1. Predicate

- [x] 1.1 Add `src/lib/crossing-go.ts` with the 60-minute / below-linear / weekly-not-behind rule. Unit tests for last-hour unused, early unused, equal-to-linear, weekly behind, missing weekly, unstarted, weekly line never go. Headroom on any resetting period; dump-and-cross stays 5-hour only.

## 2. Overview meter

- [x] 2.1 Pass plugin sibling lines into `MetricLine` / `MetricLineProgress`. Crossing-go 5-hour ticks use `--meter-fill` full opacity at 4×16 without glow; others keep muted tick. Tests on `progress` and `metric-line-progress`.
- [x] 2.2 Started resetting meters hatch unused-vs-tick; 5-hour last hour hatches leftover to dump and names `N% ahead of pace · dump and cross`. Weekly hatches leftover but never dump-and-cross. Solid fill clips at the hatch.
- [x] 2.3 GO hatch glow: light `#00a152`, dark `#00e676`, hatch-only. Idle hatch and the pace tick do not glow. Tests in `index.css.test.ts` and `metric-line-progress.test.ts`.

## 3. Timeline card

- [x] 3.1 Attach crossing-go on 5-hour `selectTimelineCardItems`, sort go then soonest. Style 5-hour remaining time with meter-fill when go. Weekly row unchanged. Tests in `card.test.ts` and `timeline-card.test.ts`.
- [x] 3.2 5-hour Timeline card items include ahead-of-pace / dump-and-cross. Weekly items do not.
- [x] 3.3 Timeline card body uses `ui-pressable` + `hover:bg-card-hover` like provider cards.

## 4. Verify

- [x] 4.1 `bunx vitest run` on touched tests, `openspec validate overview-crossing-go --strict`.
