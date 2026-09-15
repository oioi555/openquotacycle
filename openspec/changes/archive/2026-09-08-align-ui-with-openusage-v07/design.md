# Design — align-ui-with-openusage-v07

## Context

The Svelte 5 rewrite (2026-09-06) left Quotracker with a clean separation: `src/svelte/components|pages` (UI structure) consume controllers in `src/svelte/controllers/*.svelte.ts`, which talk to Tauri only through `src/svelte/lib/backend.ts`. Provider/API/auth logic lives in `plugins/**` and `src-tauri/plugin_engine/**` and is out of scope. The current shell mirrors the old OpenUsage React layout: `side-nav` rail + `activeView` string + `app-content` if/else router. Upstream OpenUsage v0.7 (native Swift) replaced this with a screen-stack popover; OpenQuota implements the same interaction model in Svelte 5 + Tauri (`{#key screen}` + directional slide, screen-header back bar, footer Options menu), which de-risks the approach on our stack.

Constraints carried over from specs and history:
- `linux-window` pins "Escape must not auto-hide the window" — the upstream "Esc closes the panel" behavior is therefore NOT adopted; Esc is back-only.
- `panel.rs` is live code (tray show/hide + KWin position restore) and stays untouched.
- The quota timeline has a narrow-mode breakpoint at ~380 px container width; at the 320 px default window it renders in icon-only mode by design (identity survives via row title + marker tooltip), and a dedicated narrow-width Resets revamp is planned as a follow-up change.
- The codebase is effect-loop sensitive (`3463b78`, `cbc9551`); window auto-height morphing (upstream's signature behavior) is deliberately deferred.

## Goals / Non-Goals

**Goals:**
- One navigation model (Screen union + directional slides) replacing the rail, with upstream's keyboard model adapted to Linux (Ctrl vs ⌘).
- Customize screen absorbs plugin management and metric visibility using the visible-set schema established by `manifest-defaults-fixed-tray`.
- Cost/Resets reachable in one action from the dashboard (teaser cards) — cost data is a placeholder in this change.

**Non-Goals:**
- Real cost aggregation (change `add-cost-aggregation`).
- Frameless/tray-anchored popover conversion or JS-driven window auto-height morphing (possible later change; upstream/OpenQuota pattern documented in breadcrumbs).
- Any change to plugins, plugin engine, backend IPC surface, or additional visibility settings beyond the preceding manifest baseline. Metric order remains this change’s additive key.
- Undo history (upstream ⌘Z) — deferred; no schema exists for it yet.

## Decisions

- **D1 — Navigation state: extend `app-ui-controller` with a Screen union, no router library.**
  `type Screen = "dashboard" | "cost" | "resets" | "customize" | \`customize:${string}\` | "settings" | "window-starter"` (same shape as OpenQuota's template-literal screen type). `plugin-views` keeps ownership of `isFixedView`/disabled-plugin fallback, re-pointed at the union. Alternative considered: a router lib — rejected (no URL semantics needed; controllers already own view state).

- **D2 — Transitions: `{#key screen}` + Svelte `fly` with direction-aware x, honoring `prefers-reduced-motion`.**
  Screens get explicit ranks — dashboard=0, resets=1, cost=2, customize=3, `customize:<id>`=4, window-starter=5, settings=6 — and the slide direction is `sign(rank(target) − rank(current))`, so every transition has a non-zero x (no same-rank siblings). OpenQuota's hand-rolled spring is nice-to-have polish, not needed for correctness. Alternative: view-transitions API — rejected for now (Tauri WebKitGTK support uneven).

- **D3 — Shell components: `top-bar.svelte` (back + centered title) and a separate `options-menu.svelte` (footer dropdown on a new `ui/dropdown-menu.svelte` bits-ui wrapper) mounted inside `panel-footer.svelte`.**
  `panel-footer.svelte` keeps version/countdown/refresh and hosts the Options control at its right edge. Alternative: keep tabs primitive for navigation — rejected (upstream deliberately moved away from tab nav).

- **D4 — Provider-detail dissolution: expandable dashboard card.**
  `provider-card.svelte` gains an expand caret revealing On-Demand lines (manifest-default / stored-visible-set semantics from `manifest-defaults-fixed-tray`) + provider links; expansion state lives in a UI controller (session-scoped). The `provider-detail.svelte` page is removed. The card context menu (refresh/disable/customize) moves here from the rail icons, and its "Customize…" item opens `customize:<id>` directly.

- **D5 — Customize L1 reuses `settings-plugin-list.svelte` with its inline metric controls stripped** (enable/disable, `svelte-dnd-action` reorder stay). Row activation (click/chevron) opens L2. L2 keeps the checkbox classification list but adds drag-reorder and drops the old mandatory-first rule: every progress line can be On-Demand (upstream has no locked row), and the stored order (`overviewLineOrder[pluginId]`, additive optional key in `settings.json`) drives dashboard row order — stored labels first, manifest order fills gaps. Progress and text visibility use the preceding manifest visible-set schema and legacy migration; no mandatory first line or provider-wide statistics toggle is restored.

- **D6 — Settings re-skin: existing sections regrouped into captioned cards** (General / Appearance / Usage Display / Tray / Shortcuts / Advanced), same controller calls. Dynamic tray previews and icon-style controls remain removed under the fixed app-icon baseline.

- **D7 — Keyboard handling replaces `panel-controller.handleViewCycleKeydown`** with an Esc/Enter/Ctrl+,/Ctrl+R handler at `app-shell` level. Enter: dashboard → customize; secondary screens → one step back. `Esc`/`Enter` handlers no-op while a dialog (About/changelog) is open — dialogs consume Escape first via their own handlers, and the shell handler checks dialog state to prevent double-stepping. `Ctrl+,` stores the originating screen in the controller (`preSettingsScreen`) so a second press returns there.

- **D8 — Window sizing: compact default, free resize (no hard lock).** Desktop testing showed Linux/GTK ignores `minWidth`/`maxWidth` hints for snapping, maximizing and interactive resize, and a Rust-side resize clamp (`MAIN_WINDOW_LOGICAL_WIDTH`) fought the WM without fully working — both reverted. Policy changed accordingly: default first-launch size **320 × 700** in `tauri.conf.json` (+ `minWidth: 320` hint where the platform honors it), both axes freely resizable, geometry persisted by the window-state plugin as before (`SIZE` stays on). 320 px is the proven upstream panel width (OpenUsage native, OpenQuota), and the whole screen set renders without horizontal overflow down to 280 px (measured headlessly over dashboard/settings/customize/cost/resets/window-starter). The quota timeline switches to its spec'd icon-only mode below ~380 px container width; a dedicated narrow-width Resets revamp is a follow-up change.

- **D9 — Tray navigation mapping is pure and lives where `attachTrayEvents` runs (app shell), not in `tray-controller`.** The tray emits only `"home"` and `"settings"` (`src-tauri/src/tray.rs`); mapping: `home` → dashboard, `settings` → settings, anything else (plugin ids, unknown) → dashboard. `tray.rs` is not extended. Corollary: navigation never selects the tray icon; `tray-provider-icon-color` retains the fixed app icon and plain-text tooltip, with no last-shown / first-enabled icon resolution.

- **D10 — Cost placeholder: static layout components + fixture values, isolated behind a `cost-placeholder.ts` fixture module** so `add-cost-aggregation` replaces the data source without touching layout. Teaser Cost card renders the same fixture; the Resets teaser derives its "next reset" from real `pluginStates` (data already exists).

## Risks / Trade-offs

- [Narrow window (320 px default) makes wide-layout components reflow] → provider-card and timeline get an explicit narrow-pass with visual checks at the default width; timeline container padding budget documented in D8; a dedicated Resets narrow-width revamp is a follow-up.
- [Test churn: `App.smoke`, `side-nav`, `rail-reorder` pin today's shell] → smoke test reworked against the new shell contract; rail tests deleted with their code; new nav/menu/customize tests keep coverage of user-visible behavior.
- [`tray:navigate` and global-shortcut paths assume view strings] → mapping function is pure and unit-tested; contract test (`backend.contract.test.ts`) untouched by definition.
- [Esc/Enter model may surprise users of the old rail] → Options menu + teasers give pointer parity; keyboard hints stay in About/changelog.
- [Placeholder cost data could be mistaken for real] → fixture module is typed `PlaceholderCostData`; both the Cost page and the dashboard teaser render a subtle "sample data" marker until the follow-up change lands.

## Migration Plan

Frontend navigation work builds on the separately completed manifest visible-set migration. Legacy hidden-line and hidden-statistics preferences are migrated there; this change preserves that result. Rollback = revert the PR. The removed rail tests and components die with the branch; the new `ui-navigation` spec archives on top of existing capabilities without renumbering.

## Open Questions

- Exact default height at 320 px width (700 may feel tall for a narrow column) — tune during implementation against the visual pass; spec pins only persistence behavior.

## Preceding specification baseline

`manifest-defaults-fixed-tray` is completed independently. Preserve `manifest-display-defaults`, `overview-metrics`, and `tray-provider-icon-color` in main specs: progress/text defaults follow `visibleByDefault`, stored visible sets win, reset restores manifest order and marks, no progress line is mandatory, and the tray uses the fixed app icon. This change remains active. Before future sync, rebase every overlapping MODIFIED requirement on the current main specification and retain all its scenarios; do not restore superseded defaults or dynamic tray modes.
