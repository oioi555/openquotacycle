## Why

The Cost teaser, Cost page, and unused Usage Trend row are leftover OpenQuota chrome filled with sample data. Cross-provider spend has no honest shared unit without a rate table Quotracker will not ship, and the product is a per-provider quota tracker (cards, Timeline, Window Starter). The unimplemented `add-cost-aggregation` change was withdrawn; these placeholders should go with it.

## What Changes

- Remove the dashboard Cost/TotalSpend teaser (sample-data card) and the `cost` screen.
- Remove Cost from the footer Options menu and from the screen-stack enum.
- Delete the placeholder fixture and the Cost-only components (`cost-placeholder`, `total-spend`, `spend-ring`, unused `usage-trend`).
- Keep per-provider Today / Yesterday / Last 30 Days tiles on cards that already emit them. Do not add aggregation or trend wiring.

## Capabilities

### New Capabilities

- なし。

### Modified Capabilities

- `ui-navigation`: drop the `cost` screen, Cost Options entry, and Cost teaser / Cost-page placeholder requirements. Timeline teaser and the rest of the screen stack stay.

## Impact

- UI: `pages/cost.svelte`, `overview.svelte` teaser, `options-menu.svelte`, `app-content.svelte`, `app-ui-controller.svelte.ts`, `plugin-views.svelte.ts`.
- Dead modules: `cost-placeholder.ts`, `total-spend.svelte`, `total-spend-data.ts`, `spend-ring.ts`, `usage-trend.svelte` and their tests.
- Spec: `openspec/specs/ui-navigation/spec.md`.
- No plugin, IPC, persistence, or README provider-list changes.
- Tests that navigate via `cost` retarget another secondary screen (Timeline).
