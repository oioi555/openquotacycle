## Why

Quota progress is three stacked rows (heading / meter / reading) after the OpenQuota `QuotaMetric` port. Cards stay tall. `compact-provider-cards` already landed the two-row hybrid (label+bar / value+reset) because a single flex row let reset sentences shove the bar. The leftover problem is those sentences: `Resets tomorrow at 2:00 PM` and `Runs out in 1h 41m` do not fit a 320px second row.

## What Changes

- Collapse `metric-line-progress` from three rows to two:
  - Row 1: truncated label + suffix-free reading (`100%`, not `100% left`) | compact time chips.
  - Row 2: 2px verdict meter full width. displayMode is global, so do not repeat used/left on every line.
- Two time chips, both icon + short value (no `Resets in` / `Runs out in` prefix):
  - Reset deadline (existing relative / absolute toggle). Face: timer icon + compact remaining (`1d 15h`, `2h 14m`, `15m`, `soon`) or compact clock (`1:05` / `9/12 1:05`). Tooltip keeps the long sentence of the other mode.
  - Run-out (only when behind or limit reached). Face: flame icon + compact remaining (`1h 41m`), or icon only when the limit is already hit. Tooltip keeps `Runs out in…` / `Limit reached` plus pace detail.
- Meter fill, tick, and tone stay (`ui-surfaces` thin meters). used/left toggle stays on the number next to the label.
- Progress skeleton matches two rows. Text metrics unchanged. Overview collapsed and expanded use the same component.
- Expand control is chevron-only (no `N more`). Cards without On-Demand content still reserve that row height. Quick links are an equal-width grid (max 3 columns) under On-Demand lines.
- Codex `gpt-reserve` additional limits use the official name Luna Reserve, unmarked in the manifest so Customize can hide them.

## Capabilities

### New Capabilities

- なし。

### Modified Capabilities

- `ui-surfaces`: two-row compact progress face (suffix-free reading, icon chips, meter on row 2). Thin 2px verdict meters stay.
- `overview-metrics`: expand row is always reserved; chevron only when there is On-Demand content; quick links equal-width grid.
- `codex-account-quota`: `additional_rate_limits` Spark stays Spark; `gpt-reserve` becomes Luna Reserve, both unmarked On Demand. Reviews unchanged.

## Impact

- `src/svelte/components/metric-line-progress.svelte` (+ tests)
- `src/lib/reset-tooltip.ts` / `src/lib/pace-tooltip.ts` のフェイス用短縮（tooltip 全文は残す）
- `src/svelte/components/skeleton-lines.svelte`
- `src/svelte/components/provider-card.svelte` 行間・展開行・リンクグリッド
- `plugins/*/plugin.json` quick links、`plugins/codex/plugin.js` / `plugin.json` Luna Reserve
- provider-card / metric-line-progress / reset-tooltip / pace-tooltip / codex plugin テスト
- データ・設定キー・IPC は無変更。Resets ページの `formatRemainingLabel` は無変更
