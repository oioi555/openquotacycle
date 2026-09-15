## 1. Tokens and surfaces

- [x] 1.1 Add tray/card/meter tokens to `src/index.css` (light/dark per design) and verify `bunx vitest run src/svelte/components/ui` green
- [x] 1.2 Re-layer overview surfaces (tray bg, 12px cards, 14px padding/gaps, remove `Separator` dividers) and verify headless Chromium screenshot at 320px shows floating cards with no dividers

## 2. Meters and provider cards

- [x] 2.1 Re-skin `ui/progress.svelte` to 5px capsule with verdict fill (blue/yellow/red), 5px min fill, 2x9px marker, keeping `value/markerValue/refreshing` API; verify `ui.test.ts` + progress role/aria green
- [x] 2.2 Restructure `metric-line-progress.svelte` to heading→meter→reading with 13/12px type, tabular readings, click toggles; verify card tests green
- [x] 2.3 Rework `provider-card.svelte` header (14px name, plain 11px plan text, 16px mark right, drop outline Badge) with card wrapper; verify `provider-card.test.ts` green

## 3. TotalSpend card

- [x] 3.1 Port `spendRing` math to `src/svelte/lib/spend-ring.ts` (arcs, sector path, min slice 0.025) with unit test against OpenQuota vectors; verify `bunx vitest run src/svelte/lib` green
- [x] 3.2 Build `total-spend.svelte` (title selector, 27px period pill with slide, 104px donut, ranked legend, center total, sample-data tag) fed by `cost-placeholder.ts`; verify page/component test renders layout + period switch
- [x] 3.3 Replace overview teasers with TotalSpend card + next-reset row; verify `overview` navigation tests green and 320px screenshot shows reference ordering

## 4. Trend and footer

- [x] 4.1 Build `usage-trend.svelte` (30 bars h18 gap1.5, hover detail card) rendered only with history data; verify component test (bars + hover + empty-hidden)
- [x] 4.2 Re-skin footer Options trigger (26px pill) and panel (172px floating, radius 10) and add leading icons to all 7 entries; verify footer/options-menu tests green
- [x] 4.3 Show provider brand icons in Customize rows (`SettingsPluginConfig.iconUrl/brandColor` wired from `PluginMeta`, mask painted via `getIconColor`); verify customize tests green

## 5. Verification

- [x] 5.1 Full suite `bun run test` + `svelte-check` + `openspec validate align-visual-with-openquota --strict` green
- [x] 5.2 Headless Chromium screenshots (dashboard light/dark, cost, 320px) reviewed against OpenQuota reference; record results in breadcrumbs

## 6. Tokens-first rethink + Customize parity (follow-up from screenshots)

- [x] 6.1 Dashboard TotalSpend → slim tokens card (title + period pill + large total, no donut/legend/selector); verify total-spend tests green
- [x] 6.2 Cost page hosts the full TotalSpend donut card (shared fixture mapping helper); verify cost tests green
- [x] 6.3 New `ui/switch.svelte` (28x16, meter-fill when on) with ui.test.ts coverage
- [x] 6.4 Customize L1 rows: "N metrics" subtitle + Switch (keep dnd/checkbox-free toggle); verify customize tests green
- [x] 6.5 Customize L2 rows: Switch instead of Checkbox (keep drag/labels/persistence); verify customize-provider tests green
- [x] 6.6 Full suite + svelte-check + headless screenshots (dashboard/cost/customize L1+L2) + breadcrumbs

## 7. Provider header/divider parity (follow-up from header screenshot)

- [x] 7.1 Header: plan full text without width cap; remove header expand chevron
- [x] 7.2 Bottom divider chevron toggles expansion (only with on-demand content); provider links move to card bottom
- [x] 7.3 Tests update + full suite + dashboard screenshot

## 8. Customize L2 parity (follow-up from detail screenshot)

- [x] 8.1 Top bar on `customize:<id>` drops Refresh (order reset stays in-page)
- [x] 8.2 L2 splits Always Visible / On Demand separator sections with two-zone dnd (cross-zone drops reclassify)
- [x] 8.3 Tests rewrite + full suite + L2 screenshot

## 9. L2 top reset + semantics

- [x] 9.1 Top ↻ on `customize:<id>` resets that screen's metric order (TopBar `refreshTitle`); in-page Reset button removed
- [x] 9.2 Tests (smoke presence, no in-page button) + full suite + L2 screenshot

## Preceding specification baseline

`manifest-defaults-fixed-tray` is completed independently. Preserve `manifest-display-defaults`, `overview-metrics`, and `tray-provider-icon-color` in main specs: progress/text defaults follow `visibleByDefault`, stored visible sets win, reset restores manifest order and marks, no progress line is mandatory, and the tray uses the fixed app icon. This change remains active. Before future sync, rebase every overlapping MODIFIED requirement on the current main specification and retain all its scenarios; do not restore superseded defaults or dynamic tray modes.

## 10. Remaining requirement audit

- [ ] 10.1 Audit the remaining visual requirements and implementation gaps reported during ongoing work; reconcile the planning artifacts and verify the resulting scope before archive, preserving the preceding manifest baseline.
