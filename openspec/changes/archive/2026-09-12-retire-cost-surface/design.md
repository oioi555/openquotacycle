## Context

See `proposal.md` for motivation. `add-cost-aggregation` was withdrawn without applying code or syncing `cost-display` into main specs. The leftover UI is from `align-ui-with-openusage-v07` / visual alignment: a fixture-fed TotalSpend teaser on the dashboard, a `cost` screen, an Options Cost item, and an unused `usage-trend.svelte` (`provider-card` accepts `trend` but nothing passes values).

## Goals / Non-Goals

**Goals:**

- Delete the Cost surface and its sample-data plumbing so the dashboard is quota cards + Timeline.
- Keep screen-stack ranks distinct after `cost` leaves `FIXED_SCREENS`.

**Non-Goals:**

- Plugin spend/token tiles (Today / Last 30 Days).
- Aggregation, rate tables, Usage Trend data wiring.
- Timeline, Window Starter, Customize, or tray payloads.

## Decisions

### 1. Delete the screen, do not leave a stub

Remove `cost` from `FIXED_SCREENS`, `SCREEN_RANK`, `app-content`, Options, and `plugin-views` titles. A blank Cost page would still advertise a finance view.

Alternative: keep the route and show "not available". Rejected — that is still a Cost surface.

### 2. Delete unused Usage Trend with the Cost leftovers

`usage-trend.svelte` never receives data. Leaving the shell implies a follow-up that was just rejected. Drop the component, its test, and the `trend` prop on `provider-card`.

Alternative: keep the component for later. Rejected — dead UI next to the withdrawn change.

### 3. Compact screen ranks

Today: dashboard 0, timeline 1, cost 2, customize 3, customize:* 4, window-starter 5, settings 6. After removal, close the gap so every remaining pair still has a non-zero slide delta (timeline 1, customize 2, customize:* 3, window-starter 4, settings 5). Tests that assert distinct ranks must drop `cost`.

### 4. Retarget tests that used `cost` as a generic secondary screen

`options-menu` Help and `app-ui-controller` origin tests set `cost` only to prove the screen does not change / origin is preserved. Use `timeline` instead.

### 5. `trash` the deleted files

AGENTS.md: use `trash`, not `rm`.

## Risks / Trade-offs

- [Someone still expects an OpenQuota Cost page] → Intended. Quota lives on provider cards.
- [Hot reload while `screen === "cost"`] → In-memory only; next navigation hits dashboard fallback / unknown rank 0. No persisted screen.
- [Overview smoke comments mention TotalSpend legend] → Update the comment; compact teaser has no legend.

## Migration Plan

No settings key or persisted screen. Rollback is restoring the placeholder files.

## Open Questions

None.
