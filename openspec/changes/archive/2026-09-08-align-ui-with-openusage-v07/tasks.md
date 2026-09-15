## 1. Navigation core

- [x] 1.1 Add `Screen` union + rank table to `app-ui-controller` (dashboard/cost/resets/customize/`customize:${id}`/settings/window-starter), replace `activeView` usages; rework `plugin-views`: `isFixedView` gains dashboard/cost/customize, `home` is removed, and the disabled-plugin fallback parses `customize:${id}` back to dashboard; controller tests updated and green (`bunx vitest run src/svelte/controllers`).
- [x] 1.2 Implement directional slide transition in `app-content.svelte` via `{#key screen}` + `fly`, direction from the rank table (no same-rank pairs), instant swap under `prefers-reduced-motion`; component test asserts screen swap and reduced-motion class.
- [x] 1.3 Replace `panel-controller.handleViewCycleKeydown` with Esc/Enter/Ctrl+,/Ctrl+R shell handler: Esc/Enter no-op while a dialog is open (dialogs consume Escape first), Enter = advance on dashboard / step back on secondary screens, Ctrl+, stores `preSettingsScreen` and returns there; Esc never hides the window; keyboard tests green.
- [x] 1.4 Implement the tray navigation mapping where `attachTrayEvents` runs (app shell): `home` → dashboard, `settings` → settings, any other payload → dashboard (no `tray.rs` change); preserve the fixed app icon independently of screen/provider selection; unit test the mapping function.

## 2. Shell chrome

- [x] 2.1 Create `ui/dropdown-menu.svelte` bits-ui wrapper; verify with a render test in `ui.test.ts`.
- [x] 2.2 Create `top-bar.svelte` (back control + centered title, provider name on `customize:<id>`, absent on dashboard); component tests for title/back routing.
- [x] 2.3 Host a separate `options-menu.svelte` inside `panel-footer.svelte` (entries: Customize, Resets, Cost, Window Starter, Settings, About, Help-external); keep version/countdown/refresh behavior; update footer tests.
- [x] 2.4 Rewire `app-shell.svelte` to the new composition (shell keydown, top bar, footer, tray mapping) and rework `App.smoke.test.ts` to pin the new tree; smoke green.
- [x] 2.5 Delete `side-nav.svelte`, `src/svelte/lib/rail-reorder.ts`, their tests/harness, and re-point `getIconColor` consumers; `bunx vitest run` green with no dangling imports (typecheck + `svelte-check`).

## 3. Dashboard

- [x] 3.1 Add expand caret + On-Demand section + provider links to `provider-card.svelte` (session-persisted expansion state in a UI controller); card tests for collapsed/expanded/persisted states.
- [x] 3.2 Move the provider context menu (refresh / disable / customize / inspect) from rail icons to card headers, with "Customize…" opening `customize:<id>`; test menu actions invoke the same controller callbacks as before.
- [x] 3.3 Build Cost teaser card and next-reset teaser row (cost values from `cost-placeholder.ts` fixture with a visible sample-data marker on the teaser; next-reset computed from real `pluginStates`); teaser navigation tests.
- [x] 3.4 Delete `pages/provider-detail.svelte` after card expansion covers its content; grep-verify no route references remain; full test suite green.

## 4. Customize screen

- [x] 4.1 Create `pages/customize.svelte` (L1) hosting the lifted `settings-plugin-list.svelte` with inline metric controls stripped (enable/disable, dnd reorder stay); row activation (click/chevron) opens `customize:<id>`; port existing settings-dnd tests to the new page.
- [x] 4.2 Create `customize:<id>` detail view (L2) receiving the per-plugin Overview display controls moved out of L1, reworked into Always Visible / On-Demand classification using the preceding manifest visible-set baseline; tests cover hideable first line, per-text-line classification, manifest defaults, persistence round-trip, and legacy hidden-line/statistics migration.
- [x] 4.3 Remove plugin list and visibility sections from `pages/settings.svelte` after Customize covers them; settings tests updated.

## 5. Secondary screens

- [x] 5.1 Re-skin `pages/settings.svelte` into captioned card groups (same controller calls; dynamic tray preview and icon-style controls remain removed); settings tests still green.
- [x] 5.2 Move Resets page under the new screen value (top-bar + back); update `quota-reset-timeline` tests that pin `activeView === "resets"`; timeline renders icon-only below ~380 px container width by design (narrow-width revamp is a follow-up change).
- [x] 5.3 Move Window Starter page entry to Options-menu-only (page internals unchanged) and update the nav wording in `docs/window-starter.md`; window-starter controller tests untouched and green.
- [x] 5.4 Build `pages/cost.svelte` placeholder (period tabs, total area, per-provider breakdown) fed by `cost-placeholder.ts` fixture; page test renders layout + "sample data" tag + period selection state.

## 6. Window width

- [x] 6.1 `src-tauri/tauri.conf.json` only: default size `width: 320` (height 700) + `minWidth: 320` hint; free resize on both axes — no `maxWidth`, no Rust clamp (Linux/GTK ignores width hints and a hard lock was unenforceable; desktop testing favored a compact default over a lock). Window-state plugin flags unchanged (SIZE stays on). Verify with `cargo check`.
- [x] 6.2 Visual pass at the 320 px default width (headless Chromium screenshots of all six screens, reviewed): no horizontal overflow, no reflow breaks; window-starter duplicate in-page heading removed. Provider cards with real data stay in 7.2 desktop pass.

## 8. Metric management (reorder + no mandatory first)

- [x] 8.1 `settings.ts`: additive `overviewLineOrder` key (sanitize/load/normalize/equals) and drop the mandatory-first rule from `getOverviewProgressBarOptions` + `normalizePluginSettings`; unit tests for order round-trip and first-line On-Demand.
- [x] 8.2 Customize L2: drag-reorderable progress metric list (svelte-dnd-action, label-as-id) + per-line Always Visible / On-Demand checkbox; `handleOverviewLineReorder` controller handler; page tests for classification/reorder emissions.
- [x] 8.3 Dashboard: `provider-card` renders progress lines in stored order (`orderLinesByLabels`) with `lineLabelsOrder` prop wired from settings; first line hideable; card tests updated.

## 7. Verification

- [x] 7.1 Full frontend suite + `svelte-check` + `backend.contract.test.ts` green (`bun run test` / vitest projects).
- [x] 7.2 Manual pass: tray toggle + `tray:navigate` mapping, close-hides-resident, global shortcut, Esc/Enter/Ctrl+, matrix incl. dialog-open Esc, default-size first launch + free resize + geometry restore, Options menu entries, L1→L2 row activation and back, dnd reorder in Customize, card expand persistence, probe refresh from card header, Cost/teaser sample-data markers, reduced-motion swap, in-window scrolling + footer visibility at the 320 px default; record results in breadcrumbs.
- [x] 7.3 `openspec validate align-ui-with-openusage-v07 --strict` passes.

## Preceding specification baseline

`manifest-defaults-fixed-tray` is completed independently. Preserve `manifest-display-defaults`, `overview-metrics`, and `tray-provider-icon-color` in main specs: progress/text defaults follow `visibleByDefault`, stored visible sets win, reset restores manifest order and marks, no progress line is mandatory, and the tray uses the fixed app icon. This change remains active. Before future sync, rebase every overlapping MODIFIED requirement on the current main specification and retain all its scenarios; do not restore superseded defaults or dynamic tray modes.
