## 1. Scaffold & IPC Seam

- [x] 1.1 Add Svelte 5 tooling and placement: deps (`svelte`, `@sveltejs/vite-plugin-svelte` ^7, `svelte-check`, `bits-ui`, `@lucide/svelte`, `svelte-dnd-action`, `@testing-library/svelte`), `svelte.config.js` (runes), `*.svelte` module shim, `svelte-check` tsconfig, vitest `include` + per-framework `test/setup.ts` cleanup, Vite plugin include/exclude (D1). Create `src/svelte/` with a stub `App.svelte` + entry `main.ts` that replicates `main.tsx`'s console→plugin-log forwarding and imports `src/index.css`; point `index.html` at `/src/entry.ts` which dynamically imports React or Svelte via `?ui=` query → `localStorage["quotracker:ui"]` → default react. Verify: `bun run dev` and `bun run build` green; React still default; `?ui=svelte` selects the Svelte stub in dev and in the built output (automated check); Tauri-side switch behavior is confirmed on the 8.3 manual checklist.
- [x] 1.2 Create `src/svelte/lib/backend.ts` covering the Tauri surface used by the UI layer (D2): typed wrappers for every `invoke` command and `listen` event the React app makes outside `src/lib/**`, plus `openUrl`, plugin-log, plugin-autostart, `TrayIcon`/`Image`/`resolveResource`, `getVersion`, all behind an `isTauri` guard; `src/lib/**` keeps its direct imports untouched. Verify: wrapper unit tests pass in jsdom; committed inventory matches `src-tauri/` command names with zero changes.

## 2. Shared Foundation

- [x] 2.1 Confirm `src/lib/**` is shared untouched (no port, no edits — it has no framework imports, and its direct Tauri imports such as `LazyStore` stay as-is per D2). Verify: existing `lib/*.test.ts` suites pass unchanged; grep shows no react/svelte imports under `src/lib`.
- [x] 2.2 Port `stores/*` to `.svelte.ts` runes controllers in `src/svelte/controllers/` (D3). Verify: controller unit tests pass; exported state/actions semantically match the Zustand stores.

## 3. Controllers (before pages)

- [x] 3.1 Build `probeController` (D3/D7): usage data, per-provider refresh state with 5-minute cooldowns, auto-refresh timer restarted at manual-refresh start, event subscriptions, stale-while-revalidate semantics per `usage-refresh` spec (initial `loading` vs stale `refreshing` states). Verify: controller unit tests cover every `usage-refresh` scenario (retention, shimmer state, per-provider cooldown, refresh-all eligibility, schedule restart timing, failure with/without stale data).
- [x] 3.2 Build `settingsController`: bootstrap, plugin list/order (canonical order shared by rail/overview/tray), display and system actions. Verify: unit tests pass for reorder persistence and preference writes; `settings-migration` scenarios hold.
- [x] 3.3 Build `panelController` (strictly the current `use-panel` scope: `tray:navigate`/`tray:show-about` subscriptions, Cmd+Arrow view cycling, scroll-down indicator — no window sizing), plus dark-mode, now-ticker, and changelog controllers. Verify: unit tests pass; no `setSize`/resize code exists (grep clean).
- [x] 3.4 Build `trayController`: tray icon build/updates for controller-level calls via `backend.ts` (`TrayIcon`/`Image`/`resolveResource`), icon styles, primary progress, tooltip using `lib/tray-*` helpers (which keep their own imports). Verify: unit tests for icon-state mapping; `tray-provider-icon-color` scenarios covered at the logic level.

## 4. UI Primitives

- [x] 4.1 Build `src/svelte/components/ui/*` as bits-ui wrappers: alert, badge, button, checkbox, progress, separator, skeleton, tabs, tooltip — adapting tooltip/tabs to bits-ui APIs (not the Base UI `render` pattern), keeping `cva`/`clsx`/`tailwind-merge` (D4). Verify: per-primitive render + interaction tests pass; checkbox fires exactly once per click.

## 5. dnd Gate

- [x] 5.1 Spike (D5): demonstrate `svelte-dnd-action` on BOTH surfaces — side-nav rail with 300 ms long-press + working context menu, AND settings list with grip handle + keyboard reorder — plus the single canonical order. Record the gate decision (library vs D5 custom-action fallback) in design.md before component tasks proceed. Verify: manual interaction checklist passes for both surfaces and the decision is written down.

## 6. Components

- [x] 6.1 Port `provider-card`, `skeleton-lines`, `plugin-error`, `panel-footer` with the D7 state split: skeleton only when no data (`loading`), shimmer + stale data when refreshing; reduced-motion aware. `provider-card` is ~580 LOC in React — split into subcomponents to stay ≤ ~400 LOC each. Verify: component tests cover scope filtering, reset-label toggle, loading vs refreshing rendering, shimmer/reduced-motion classes, footer countdown.
- [x] 6.2 Port `components/quota-reset-timeline/**`. Verify: timeline behavior tests pass against `quota-reset-timeline` spec scenarios.
- [x] 6.3 Port `side-nav` using the task 5.1 outcome (long-press reorder, native context menu, active indicator, per-plugin brand coloring). Verify: reorder + context-menu checklist/tests pass.
- [x] 6.4 Port `app-shell`, `app-content`, `about-dialog`, `changelog-dialog`, `global-shortcut-section`. Verify: render tests pass; shortcut recorder interaction test passes.

## 7. Pages

- [x] 7.1 Port `pages/overview` (scope filtering + Overview visibility controls). Verify: `overview-metrics` scenarios hold in Svelte tests.
- [x] 7.2 Port `pages/provider-detail`. Verify: provider-detail behavior tests pass (all metric lines shown, scope `all`).
- [x] 7.3 Port `pages/resets` (quota-reset-timeline integration). Verify: resets behavior tests pass.
- [x] 7.4 Port `pages/settings` using the task 5.1 outcome for the plugin list (enable/disable, display prefs, refresh interval, shortcuts). React `settings.tsx` is ~592 LOC — split into section components to stay ≤ ~400 LOC each. Verify: settings behavior tests pass; toggle is single-fire; `settings-migration` scenarios hold.
- [x] 7.5 Build `windowStarterController` (store already ported in 2.2; Tauri calls via `backend.ts`) and port `pages/window-starter`. Verify: `window-starter` spec scenarios hold in Svelte tests.

## 8. Compose & Parity

- [x] 8.1 Compose full `App.svelte` wiring all controllers and screens. Verify: `?ui=svelte` smoke — every screen reachable, refresh/settings/tray flows work; `bun run build` green.
- [x] 8.2 Add integration tests for spec-backed behaviors: `usage-refresh` scenarios, reset-label toggle, overview visibility controls, settings toggles, reorder persistence. Verify: full `bun run test --run` green.
- [x] 8.3 Parity pass, split by executor (D8): (a) automated — all parity-bar spec scenario tests green; (b) manual — human checklist in `bun tauri dev` on the Svelte UI: window behavior (`linux-window`, `window-geometry`, `window-starter`), tray icons (`tray-provider-icon-color`), timeline visuals, global shortcut. The `usage-refresh` deltas are listed as intentional and excluded from diff expectations. Verify: recorded checklist with zero unintended diffs.
- [x] 8.4 Flip the default UI to Svelte (`?ui=react`/localStorage becomes the dev escape until deletion). Verify: fresh `bun tauri dev` launch shows the Svelte UI; build and full tests green.

## 9. Cutover

- [x] 9.1 Verify the release pipeline with the Svelte build — `scripts/build-release.sh` is expected to need no edits (it runs `bun tauri build`); update README/docs architecture notes and add `svelte-check` to the typecheck flow. Verify: `bun run build` and a `build:release` dry-run succeed; `svelte-check` green; `app-build-runtime` delta scenarios hold (launch renders, no framework-internal console errors).
- [x] 9.2 Delete the React app: React components/pages/hooks/stores under `src/`, `App.tsx`, `main.tsx`, the `?ui=`/localStorage switch in `entry.ts`, and deps (`react`, `react-dom`, `zustand`, `@base-ui/react`, `@dnd-kit/*`, `lucide-react`, `@testing-library/react`, `@vitejs/plugin-react`) — **requires explicit user approval before executing**. Verify: no React imports remain (grep), switch removed, full test suite and `bun run build` green after deletion.
