## 1. Screen stack

- [x] 1.1 Remove `cost` from `FIXED_SCREENS`, `SCREEN_RANK` (compact remaining ranks), and `plugin-views` titles. Retarget `app-ui-controller` tests that used `cost` to `timeline`. Verify `bunx vitest run src/svelte/controllers/app-ui-controller.test.ts`.
- [x] 1.2 Drop the Cost Options item and `CircleDollarSign` import. Update `options-menu` tests so the catalog is Customize / Timeline / Window Starter / Settings / About / Help, and Help-without-navigation uses `timeline`. Verify `bunx vitest run src/svelte/components/options-menu.test.ts`.
- [x] 1.3 Remove the `cost` branch from `app-content.svelte`. Verify no `CostPage` import remains.

## 2. Dashboard and dead modules

- [x] 2.1 Remove the TotalSpend teaser from `overview.svelte` and the TotalSpend comment in `App.smoke.test.ts`. Add an overview assertion that sample-data / TotalSpend is absent. Verify `bunx vitest run src/svelte/pages/overview.test.ts src/svelte/App.smoke.test.ts`.
- [x] 2.2 `trash` Cost-only files: `pages/cost.svelte`, `pages/cost.test.ts`, `lib/cost-placeholder.ts`, `lib/total-spend-data.ts`, `lib/total-spend-data.test.ts`, `lib/spend-ring.ts`, `lib/spend-ring.test.ts`, `components/total-spend.svelte`, `components/total-spend.test.ts`, `components/usage-trend.svelte`, `components/usage-trend.test.ts`. Verify those paths are gone.
- [x] 2.3 Drop `UsageTrend` and the unused `trend` prop from `provider-card.svelte`. Verify `bunx vitest run src/svelte/components/provider-card.test.ts`.

## 3. Verification

- [x] 3.1 Run `bunx vitest run src/svelte` and `bun run typecheck` and confirm green.
- [x] 3.2 Run `openspec validate retire-cost-surface --strict`.
