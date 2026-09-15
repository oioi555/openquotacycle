# align-ui-with-openusage-v07

## Why

Upstream OpenUsage replaced its React/Tauri app with a native Swift app (v0.7.0, 2026-06) whose UX drops the vertical activity-bar rail in favor of a screen-stack popover: one dashboard, a back-bar on secondary screens, and a single footer Options menu. Quotracker still mirrors the old rail-based React UX, so provider switching, plugin management, and Quotracker-specific pages (Resets, Window Starter) sit on navigation chrome upstream no longer has. Aligning the UI structure and operability keeps Quotracker consistent with the project it tracks, while OpenQuota (Svelte 5 + Tauri) proves the same interaction model works outside macOS.

## What Changes

- **BREAKING** (internal UI structure only; provider/API/auth logic untouched): replace the side-nav activity rail with a screen-stack navigation model — `dashboard | cost | resets | customize | customize:<pluginId> | settings | window-starter` — with directional slide transitions, a top back-bar on secondary screens, and `Esc` = back only.
- Remove `side-nav.svelte` and `rail-reorder.ts` (+ their tests/harness); remove the per-provider detail page — its content becomes an expandable section inside each dashboard provider card (caret reveals On-Demand metrics + provider links).
- Adopt a compact default window size of 320 × 700 with free width/height resizing and persisted geometry. Rationale from desktop testing: a hard width lock is not enforceable on Linux/GTK (snap, maximize and drag all bypass the size hints), and 420 px felt too wide in practice; 320 px matches the upstream OpenUsage / OpenQuota panel width. Window chrome stays native/decorated; tray residency unchanged.
- Restructure the plugin management page into a Customize screen: L1 = provider list (enable/disable, drag reorder; row activation opens the detail view), L2 = per-provider metric management.
- Let every overview progress line — including the first — be classified Always Visible or On-Demand in Customize L2 (the old "first metric cannot be hidden" rule is dropped; progress and text defaults and stored choices follow `manifest-defaults-fixed-tray`).
- Add drag-to-reorder for a provider's overview progress lines in Customize L2; the persisted order drives the dashboard card's row order (collapsed and expanded). New additive persistence key `overviewLineOrder`.
- Re-skin the Settings page into grouped, System-Settings-style cards; preferences themselves unchanged.
- Add a footer "Options" dropdown menu (new `ui/dropdown-menu.svelte` primitive on bits-ui) as the single secondary-surface entry point: Customize, Resets, Cost, Window Starter, Settings, About, Help.
- Add dashboard teaser entries for Cost and Resets: a compact spend/usage summary card and a next-reset row that navigate to their pages (cost numbers and the teaser are **dummy placeholders with a visible sample-data marker** in this change; real aggregation lands in `add-cost-aggregation`).
- Add a Cost page as a layout-complete placeholder (period tabs, total area, per-provider breakdown) fed with dummy data.
- Keyboard model follows upstream: `Esc` back, `Enter` advance/back per screen, `Ctrl+,` toggles Settings (returning to the screen it was opened from), `Ctrl+R` refresh. The ArrowUp/Down rail cycling is removed. `Esc` never hides the window (linux-window constraint preserved).
- Map tray `tray:navigate` payloads onto the new screen enum — the tray emits only `home` and `settings` today; `home` → dashboard, `settings` → settings, any other payload → dashboard. No tray-side changes.
- Preserve the fixed app tray icon from `manifest-defaults-fixed-tray`; navigation does not select a provider icon or color.

## Capabilities

### New Capabilities
- `ui-navigation`: screen-stack navigation — screen enum, dashboard-as-home slide ranking, top back-bar, footer Options menu, teaser entries, keyboard model, tray:navigate mapping, and the rule that Esc never hides the window.

### Modified Capabilities
- `window-geometry`: default first-launch size becomes 320 × 700; width and height stay freely resizable and persisted, with a 320 px minimum-width target for layout quality.
- `overview-metrics`: per-provider metric visibility controls move from the Settings page to the Customize screen (L2, per-provider Always Visible / On-Demand split); the provider detail view is replaced by the expandable dashboard card, which shows all metric lines when expanded.
- `quota-reset-timeline`: the page is reached via the new navigation model (screen `resets` instead of the rail item); timeline behavior itself unchanged.
- `window-starter`: the page's entry point moves from the side navigation to the footer Options menu; page behavior unchanged.
- `tray-provider-icon-color`: retain the fixed app icon baseline without restoring provider resolution or dynamic modes.

## Impact

- **UI layer only**: `src/svelte/App.svelte`, `src/svelte/components/{app-shell,app-content,side-nav,panel-footer}.svelte`, `src/svelte/pages/*`, new components (top-bar, options-menu, dropdown-menu primitive, teaser cards, cost placeholder); removal of `side-nav.svelte` + `src/svelte/lib/rail-reorder.ts`.
- **Controllers (small deltas)**: `app-ui-controller` (activeView → Screen union), `plugin-views` (fixed-view set reworked for the union; `customize:<id>` parsed for the disabled-plugin fallback), `panel-controller` (view-cycling keydown replaced by Esc/Enter model), tray navigation mapping (the fixed icon stays independent of screens and providers).
- **Untouched**: `src/svelte/lib/backend.ts` (+ contract test), `src-tauri/src/**` Rust code, `plugins/**`. **Persistence**: `src/lib/settings.ts` gains one additive optional key (`overviewLineOrder`, per-plugin label order); visibility keys and migration follow the separately completed `manifest-defaults-fixed-tray` baseline. **One config exception**: `src-tauri/tauri.conf.json` gains the compact default size (`width: 320` + `minWidth: 320` hint; no hard lock — free resize). The window-state plugin keeps its current flags (SIZE stays on).
- **Window**: `src-tauri/tauri.conf.json` only; `panel.rs` show/hide logic unchanged.
- **Tests**: `App.smoke.test.ts` rework; `side-nav.test.ts`, `rail-reorder.test.ts` (+harness) removed; new tests for navigation, options menu, customize screens; controller test updates.
- **Dependencies**: bits-ui DropdownMenu (already a dependency; new primitive wrapper only).
- **Docs**: `docs/window-starter.md` nav wording (side navigation → Options menu); `docs/app-state-architecture.md` still uses React-era names — refreshed opportunistically if touched.

## Preceding specification baseline

`manifest-defaults-fixed-tray` is completed independently. Preserve `manifest-display-defaults`, `overview-metrics`, and `tray-provider-icon-color` in main specs: progress/text defaults follow `visibleByDefault`, stored visible sets win, reset restores manifest order and marks, no progress line is mandatory, and the tray uses the fixed app icon. This change remains active. Before future sync, rebase every overlapping MODIFIED requirement on the current main specification and retain all its scenarios; do not restore superseded defaults or dynamic tray modes.
