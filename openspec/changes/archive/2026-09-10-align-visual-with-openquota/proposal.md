## Why

Quotracker restructured to the OpenUsage screen-stack model (align-ui-with-openusage-v07) but still looks different from the reference: flat `#1c1c1e` surfaces with dividers, lime accent, 6px provider-colored bars, 16px headers, outline plan pills, and simple Cost/Resets teaser buttons. OpenQuota (Svelte+Tauri port) and OpenUsage Swift define the target look: layered cards on a tray, 5px state-colored meters, 13/12px type scale, plain plan text, donut TotalSpend card with period pill, and 30-bar usage trend.

## What Changes

- Replace dashboard teasers with TotalSpend card: title-metric SelectMenu (Cost/Cost-per-MTok/Tokens), Today/Yesterday/30-Days segmented pill, 104px donut (inner 0.618, gap 1.6, corner 3, min slice 2.5%) with ranked legend and center total.
- Re-layer dashboard surfaces: tray background vs `card` (text 5% mix), 12px card radius, 14px content padding, 14px card gaps, remove inter-card `Separator` dividers (whitespace only).
- Re-skin meters to 5px capsule, track = text 14% mix, fill = system blue (`#1689ef` light / `#2997ff` dark) with yellow/red pace verdicts, min fill 5px, 2x9px pace tick, 12px tabular reading with click-toggle (used/left, countdown/exact).
- Adopt reference type scale (provider 14/600, metric label 13/600, reading 12/500 tabular, aux 11/10 secondary/tertiary, system-ui stack) and header treatment (plan = plain 11px secondary text, 16px provider mark right, no outline Badge).
- Add UsageTrend row (30 bars, h18, gap 1.5, fill meter color, hover detail card) for providers exposing trend data.
- Re-skin footer Options trigger/panel to reference geometry (26px pill trigger, 172px floating panel, radius 10).
- Dark theme: drop lime `--page-accent` as meter fill; keep it only where explicitly branded (if anywhere).

## Capabilities

### New Capabilities
- `dashboard-visual`: visual rendering contract for dashboard surfaces, meters, typography, TotalSpend card, usage trend, and footer Options chrome.

### Modified Capabilities
(none — visibility, navigation, and data contracts unchanged)

## Impact

- Affected: `src/index.css` tokens, `src/svelte/components/provider-card.svelte`, `metric-line*.svelte`, `ui/progress.svelte`, `pages/overview.svelte` (+ new `total-spend.svelte`, `usage-trend.svelte`, `lib/spend-ring.ts`), `panel-footer.svelte`/`options-menu.svelte`.
- Reference code (read-only): `~/git/OpenQuota/src/styles/tokens.css`, `layout.css`, `components.css`, `src/lib/TotalSpend.svelte`, `QuotaMetric.svelte`, `UsageTrend.svelte`, `spendRing.ts`, `shareCard.ts`; `~/git/openusage/Sources/OpenUsage/Views/TotalSpendCard.swift`, `WidgetRowView.swift`, `Theme.swift`.
- Tests: structure/pinning tests (`App.smoke`, `provider-card`, `ui`, `cost`) may need class updates; no persistence-schema or Rust changes.

## Preceding specification baseline

`manifest-defaults-fixed-tray` is completed independently. Preserve `manifest-display-defaults`, `overview-metrics`, and `tray-provider-icon-color` in main specs: progress/text defaults follow `visibleByDefault`, stored visible sets win, reset restores manifest order and marks, no progress line is mandatory, and the tray uses the fixed app icon. This change remains active. Before future sync, rebase every overlapping MODIFIED requirement on the current main specification and retain all its scenarios; do not restore superseded defaults or dynamic tray modes.
