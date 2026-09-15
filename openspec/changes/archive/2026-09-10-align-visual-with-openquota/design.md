## Context

See proposal.md Why. Current state: Tailwind v4 tokens in `src/index.css` (flat dark `#1c1c1e`, lime `--page-accent #BFFF00` as meter fill); `provider-card.svelte` renders header 16px + outline plan Badge + `Separator` dividers; `metric-line-progress.svelte` + `ui/progress.svelte` render 6px bars filled with per-provider `line.color` and dot `pace-indicator`; `pages/overview.svelte` shows two teaser buttons instead of TotalSpend; no trend row, no donut. Reference (read-only): `~/git/OpenQuota/src/styles/tokens.css|layout.css|components.css`, `TotalSpend.svelte`, `QuotaMetric.svelte`, `UsageTrend.svelte`, `spendRing.ts`, `shareCard.ts:37-54`; `~/git/openusage/.../Theme.swift`, `TotalSpendCard.swift`, `WidgetRowView.swift`. Constraint: no persistence-schema or Rust changes; keep existing controller callbacks and test pins where possible.

## Goals / Non-Goals

**Goals:**
- Token-level parity for dark/light tray, card, meter track/fill/warning/critical, type scale.
- Component parity for TotalSpend card, provider card, meter, trend, footer Options.
- Keep all existing data flows (settings keys, pace calculation, reset labels) untouched.

**Non-Goals:**
- Real cost aggregation (separate change `add-cost-aggregation`); TotalSpend keeps placeholder fixture with sample-data marker.
- Window auto-height morphing, translucency/vibrancy, Liquid Glass.
- Narrow-width Resets revamp (follow-up).

## Decisions

- **Tokens via CSS vars, not Tailwind palette swap.** Add `--tray/--card/--meter-*` vars in `index.css` (light `--tray #fff`, dark `--tray #1d1d1f`; card = `color-mix(text 5%, tray)`; track = `text 14%`; fill `#1689ef/#2997ff`, warning `#e5a400/#ffd54a`, critical `#e3483f/#ff6961`) and map components to them. Alternative: rewrite to OpenQuota's 4-file global CSS — rejected, too invasive for Tailwind v4 setup.
- **Port `spendRing` math verbatim.** New `lib/spend-ring.ts` copies `spendRingArcs/ringSectorPath` (min slice 0.025, gap 1.6, corner 3, inner 0.618) and `TOTAL_SPEND_GEOMETRY` constants; only import paths renamed. Rationale: pixel parity with reference donut for free.
- **Meter keeps pace logic, swaps paint.** `ui/progress.svelte` keeps `value/markerValue/refreshing` API; fill color resolves to verdict (on-track=fill, projected=yellow, exhausted=red) instead of `line.color`; height 5px, min-width 5px, marker 2x9px. `metric-line-progress` restructures to heading→meter→reading to match `QuotaMetric`.
- **Plan Badge → plain text; drop Separators.** Header `h2` 14/600, plan span 11px secondary, mark 16px right; card wrapper `rounded-xl bg-card p` with 14px gaps; `showSeparator` prop retained as no-op for test compat then removed in final task.
- **Trend only when data exists.** New `usage-trend.svelte` (30 bars h18 gap1.5, hover detail) renders only if provider exposes history; else nothing — no empty states, no fake zeros.
- **Footer minimal restyle.** Keep `panel-footer`/`options-menu` composition; only trigger (26px pill) and panel (172px, radius 10, floats above) geometry changes.

## Risks / Trade-offs

- [Risk] Snapshot/structure tests pin old classes (`bg-muted`, `h-1.5`, `Badge`, `Separator`) → Mitigation: update pins in same tasks; visual tokens have no dedicated assertions except progress role/aria.
- [Risk] Lime-accent users notice brand change → Mitigation: blue/yellow/red are state colors per reference; lime removed from meters only.
- [Risk] TotalSpend placeholder confusion → Mitigation: keep visible "sample data" tag until `add-cost-aggregation` lands.

## Migration Plan

- Pure frontend change; no migration. Rollback = revert change. No Rust/tauri.conf changes.

## Open Questions

- None blocking. Open: whether light-mode card contrast needs tuning after screenshots (verify in tasks).

## Preceding specification baseline

`manifest-defaults-fixed-tray` is completed independently. Preserve `manifest-display-defaults`, `overview-metrics`, and `tray-provider-icon-color` in main specs: progress/text defaults follow `visibleByDefault`, stored visible sets win, reset restores manifest order and marks, no progress line is mandatory, and the tray uses the fixed app icon. This change remains active. Before future sync, rebase every overlapping MODIFIED requirement on the current main specification and retain all its scenarios; do not restore superseded defaults or dynamic tray modes.
