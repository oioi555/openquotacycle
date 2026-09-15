## Context

The frontend is React 19 + Zustand + Base UI + Tailwind v4 (~8.8k LOC non-test,
10.6k LOC tests), entered via `index.html` → `/src/main.tsx` (which forwards
`console.error`/`console.warn` to `@tauri-apps/plugin-log` and mounts React into
`#root`). It is a near-1:1 fork of upstream OpenUsage's frontend (fork point
`abf6cff`; upstream's only UI delta since is stale-while-revalidate + a Base UI
checkbox fix). The Rust side (`src-tauri/`: plugin engine, host API, window/tray/
portal modules) and `plugins/**` are out of scope; the IPC contract is fixed.

Current-state facts that constrain the design:

- `src/hooks/app/use-panel.ts` does only: `tray:navigate` / `tray:show-about` event
  subscriptions, Cmd+Arrow view cycling, and a scroll-down fade indicator. There is
  no window sizing or fit-to-content anywhere in the frontend — that macOS-NSPanel
  behavior was removed when Quotracker moved to a native Linux window
  (`switch-to-native-linux-window`). It must not come back.
- The refresh flicker root cause is `setLoadingForPlugins` setting `data: null`
  (`use-probe-state.ts`), which makes `provider-card` switch to skeletons while
  `loading && !error`.
- Manual-refresh cooldown is per provider (`lastManualRefreshAt` on each plugin
  state, `REFRESH_COOLDOWN_MS` in `lib/settings.ts`), and a manual refresh restarts
  the automatic schedule at start (`resetAutoUpdateSchedule()` before the batch).
  Both are preserved as-is; only the data-dropping behavior changes (SWR).
- Tauri API usage beyond `invoke`/`listen`: `LazyStore` (`lib/settings.ts`,
  `lib/window-starter.ts`), `openUrl` (about/changelog/provider-card/side-nav),
  `@tauri-apps/plugin-log` (`main.tsx`), `plugin-autostart`
  (`use-settings-bootstrap.ts`), `TrayIcon`/`Image`/`resolveResource`
  (`use-tray-icon.ts`), `getVersion`.
- Parity-bar specs: `linux-window`, `window-starter`, `window-geometry`,
  `tray-provider-icon-color`, `quota-reset-timeline`, `overview-metrics`,
  `settings-migration`, plus the framework-neutral parts of `app-build-runtime`.
  Motivation in [proposal.md](proposal.md).

## Goals / Non-Goals

**Goals:**

- Svelte 5 (runes-only) frontend with behavior parity to the current React app,
  verified against existing specs.
- Stale-while-revalidate refresh semantics written in from the start (upstream
  commits `0c5185b`, `d794535`, `7afc4fe` as behavioral reference).
- Safe, revertible migration: both UIs runnable from one build, switchable in
  `bun run dev` (query param) and `bun tauri dev` (localStorage override).
- Match the maintainer's established Svelte stack (openspec-webui): Svelte 5 +
  Tailwind v4 + bits-ui + `@lucide/svelte` + `svelte-check`.

**Non-Goals:**

- Any Rust, plugin, or IPC change; new providers; visual redesign; new UX beyond
  `usage-refresh`.
- Re-introducing panel auto-height/fit-to-content or any window-resize behavior
  (removed by `switch-to-native-linux-window`; `linux-window` stays authoritative).
  OpenQuota-style floating window / manual panel resize is rejected (maintainer
  decision; already solved differently in this codebase).
- Porting React tests 1:1 (see D8).

## Decisions

### D1: Placement, entry loader, and tooling coexistence

- Svelte app lives under `src/svelte/` (`App.svelte`, `components/`, `controllers/`,
  `pages/`); `src/lib/**` stays where it is, shared by both UIs, untouched.
- `index.html` points to a new `/src/entry.ts` which dynamically imports
  `/src/main.tsx` (React) or `/src/svelte/main.ts` (Svelte). Switch resolution:
  `?ui=` query param (browser dev) → `localStorage["quotracker:ui"]` (works under
  `bun tauri dev`, set via devtools) → default `svelte` since the 8.4 flip task. The
  Svelte entry replicates the console→plugin-log forwarding from `main.tsx`
  and imports `src/index.css` (previously imported only by `main.tsx`).
- Tooling: `svelte.config.js` (runes on), `*.svelte` module declarations in
  `vite-env.d.ts`, a `svelte-check` tsconfig, `@sveltejs/vite-plugin-svelte` v7
  (required for Vite 8) with include/exclude so each Vite plugin processes only its
  own files, vitest `include` covering `.svelte` tests, and `test/setup.ts` cleanup
  switched per-framework. Alternative considered: strangler islands — rejected
  (single-window webview with shared global state gains nothing over a mount
  switch). Rollback = clear the switch (until the deletion task).

### D2: Typed IPC seam (`src/svelte/lib/backend.ts`) covering the full Tauri surface

One module wraps the Tauri APIs the UI layer uses: all `invoke` commands, all
`listen` events, `openUrl`, plugin-log, plugin-autostart, `TrayIcon`/`Image`/
`resolveResource`, `getVersion` — each as a typed function, all behind an
`isTauri`/`__TAURI_INTERNALS__` guard so jsdom tests can import it. Boundary rule:
only calls made outside `src/lib/**` go through the seam — `src/lib/**` stays
shared untouched (task 2.1), so its existing direct imports (`LazyStore` in
`lib/settings.ts` / `lib/window-starter.ts`) remain as-is. Inventory comes from
grepping the React app (task 1.2); names and payloads stay identical. Alternative: seam only `invoke`/`listen` — rejected: the remaining
scattered plugin imports would keep the UI untestable in jsdom.

### D3: State: Zustand stores and hooks → runes controllers

- `stores/*.ts` (app-ui, app-preferences, app-plugin, window-starter) → `.svelte.ts`
  singleton controllers with `$state`.
- `use-probe-*` (state, auto-update, refresh-actions, events) → a `probeController`
  owning usage data, per-provider refresh/cooldown state, auto-refresh timer, event
  subscriptions — SWR semantics from the start (D7).
- `use-settings-*` → `settingsController`; `use-tray-icon` (+ its canvas helpers
  already in `lib/`) → `trayController`; `use-window-starter` →
  `windowStarterController`; `use-panel` → `panelController` **limited to its actual
  current duties** (tray event subscriptions, Cmd+Arrow cycling, scroll indicator —
  no window sizing); `use-dark-mode`, `use-now-ticker`, `use-changelog`,
  `use-app-plugin-views`, `use-app-version` → small controllers or `$derived`
  helpers. Alternative: writable stores — rejected (boilerplate; runes idiom).
- Component discipline is the target of the port, not a description of today's code:
  current pages embed logic (`settings.tsx` holds its dnd). Svelte components keep
  only transient gesture/local UI state; data and actions come from controllers via
  props/callbacks so controllers stay unit-testable without mounting.

### D4: UI primitives via bits-ui (shadcn-svelte-style wrappers)

`components/ui/*` (alert, badge, button, checkbox, progress, separator, skeleton,
tabs, tooltip) rebuilt as thin Svelte wrappers over `bits-ui`. Not a mechanical
port: Base UI's `render={(props) => ...}` composition differs from bits-ui's
API — tooltip and tabs need real adaptation (design the wrapper signatures against
bits-ui docs, not the old JSX). `cva`/`clsx`/`tailwind-merge` are framework-free and
stayed in use — the wrappers keep them. Icons: `lucide-react` → `@lucide/svelte`.

### D5: Drag-reorder — hybrid: svelte-dnd-action (Settings) + custom long-press action (rail)

Two surfaces reorder: side-nav rail and the Settings plugin list, sharing the
single canonical order (`lib/settings.ts` `normalizePluginSettings` untouched).

**Gate decision (spike, task 5.1 — resolved):**

- **Settings list → `svelte-dnd-action`.** The React settings list uses the
  default dnd-kit PointerSensor (press + move starts a drag; the `GripVertical`
  handle is decorative) plus KeyboardSensor — exactly the svelte-dnd-action
  native model (pointer press-move drag, space/enter + arrows keyboard drag,
  whole-item drag surface). Plain clicks never trigger a drag, so row toggles
  keep working. Verified by mounting harness test; drag feel confirmed on the
  8.3 human checklist.
- **Rail → custom `railReorder` Svelte action** (`src/svelte/lib/rail-reorder.ts`),
  the pre-designed D5 fallback, because svelte-dnd-action has no pointer
  long-press (`delayTouchStart` is touch-only) and the rail requires the 300 ms
  hold so click ≠ drag. The action implements: 300 ms long-press activation
  (pointer, covers touch), pointermove live-shift preview, commit-on-release,
  trailing-click suppression (navigation click is swallowed after a drag),
  right-click untouched (context menu works). Unit-tested: short press = click,
  long press = drag + reorder commit, click suppression, timer cleanup on
  destroy. Keyboard reorder on the rail is not ported (the React rail had
  none).

### D6: Styling and markup port rules

Tailwind v4 stays; class names port verbatim; `index.css` tokens carried over with
the shimmer keyframes added. Mechanical translations: `{conditionals}` → `{#if}`,
`.map` → `{#each}`, controlled inputs → `bind:value`, refs → `bind:this`,
`useEffect` side effects → `$effect` in the composition root/controllers.

### D7: SWR in the probe controller; refresh semantics otherwise preserved

Current behavior drops data during refresh (`setLoadingForPlugins` → `data: null`,
skeletons on `loading && !error`). The Svelte `probeController` replaces exactly
that with the `usage-refresh` spec semantics and separates two card states:
initial `loading` (no data → skeleton) vs `refreshing` (stale data visible +
shimmer sweep, reduced-motion aware). Everything else about refresh is preserved
from current code: per-provider 5-minute cooldown (`lastManualRefreshAt`),
refresh-all filtering out providers in cooldown, and auto-schedule restart at
refresh start — the spec is written to match these. The stale+failure combined
display follows upstream `0c5185b`/`d794535`/`7afc4fe` (inline truncated error with
full text accessible; stale data retained).

### D8: Testing strategy

- `lib/**` tests port as-is (pure TS, no framework imports — verified).
- Controllers get unit tests (vitest + jsdom, no mounting): cooldown windows,
  schedule restart timing, SWR retention, event handling.
- Component tests: `@testing-library/svelte`, written for spec-backed interactions
  (reset-label toggle, overview visibility controls, settings forms, reorder,
  checkbox single-fire) — deliberately not a 1:1 port of the 10.6k LOC suite;
  `App.test.tsx` (~1.9k lines) is replaced by controller tests + a lean composed
  smoke test.
- Coverage bar: every scenario in the change's delta specs plus the parity-bar
  specs listed in Context.
- Parity verification is split: automated (spec scenario tests) vs manual (a human
  walks the Tauri app: window behavior, tray icons, global shortcut — agent cannot
  click a real desktop). The intentional `usage-refresh` deltas are excluded from
  diff expectations so parity ≠ "identical to React".

## Risks / Trade-offs

- [dnd UX parity on both surfaces] → spike resolved (task 5.1): hybrid D5 —
  svelte-dnd-action for Settings, custom long-press action for the rail; drag
  feel verified on the 8.3 human checklist.
- [Probe/refresh regressions] → `probeController` unit tests per `usage-refresh`
  scenario + integration tests; SWR reference commits cited for edge cases.
- [Parity pass flags intentional SWR diffs as regressions] → checklist keyed to
  specs; intentional deltas listed explicitly in the parity task (D8).
- [Coverage dip vs 10.6k LOC test suite] → defined coverage bar instead of 1:1
  porting; accepted trade-off, recorded here.
- [Dual-framework bundle during migration] → temporary dev-only cost; resolved —
  Svelte is the production default since the 8.4 flip task.
- [`?ui=`/localStorage switch leaks to users] → switch exists only until the
  deletion task removes it along with React; between flip and deletion it is a
  documented dev escape (`?ui=react`).

## Migration Plan

Groups (numbers = `tasks.md` sections): 1 scaffold + IPC seam → 2 shared foundation
(lib confirmed shared, stores) → 3 controllers (probe incl. SWR) → 4 ui primitives →
5 dnd gate → 6 components → 7 pages → 8 compose + tests + parity + default flip →
9 cutover (pipeline/docs verify, React deletion behind user approval).
Rollback before 8.4 = switch back to React; after 9.2 there is no rollback
(deletion only after explicit approval). The `app-build-runtime` main-spec Purpose
keeps its current React wording until archive/sync, when the delta lands and the
one-line Purpose is corrected.

## Open Questions

None blocking. The dnd spike resolves its own branch via the D5 fallback; no spec
or task-order impact either way.
