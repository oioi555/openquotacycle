## Why

The maintainer's Svelte 5 experience (openspec-webui) is deeper than React, and Svelte's
fine-grained updates keep the panel responsive during refreshes. The frontend is currently
React 19 (~8.8k LOC + 10.6k LOC tests). Upstream OpenUsage — the UX reference Quotracker
follows — shares this React frontend almost 1:1 (fork point `abf6cff`, only 8 upstream UI
commits since), so a rewrite now is cheap to keep in sync afterwards, and upstream's only
missing UI behavior (stale-while-revalidate refresh) can be folded in instead of being
ported twice.

## What Changes

- **BREAKING (internal only)**: The frontend framework changes from React 19 + Zustand +
  Base UI to Svelte 5 (runes) + bits-ui. No Rust code, plugin, or IPC contract changes.
- Rewrite the React app (components, pages, hooks, stores) in Svelte 5 under
  `src/svelte/`, preserving current behavior, structure, and Tailwind styling;
  `src/lib/**` is framework-agnostic and stays shared in place, untouched.
- Replace the hard-coded React entry (`index.html` → `/src/main.tsx`) with an entry
  loader that mounts React or Svelte based on `?ui=` query param (browser dev) or a
  `localStorage` override (works under `bun tauri dev`); React stays the default until
  parity is verified, then React is deleted.
- Centralize all Tauri API usage into a typed `backend.ts` seam — `invoke`/`listen` plus
  the store, opener, log, autostart, tray-icon, and version APIs the current code uses
  (names unchanged; `src-tauri/` untouched).
- Fold in upstream's stale-while-revalidate refresh behavior: refreshes keep stale usage
  data visible with a shimmer indication until fresh data arrives (new capability,
  `usage-refresh`). Current per-provider cooldown semantics and the automatic-schedule
  restart timing are preserved unchanged.
- Update the `app-build-runtime` capability, which currently requires React initialization
  and React dependency minimums, to be framework-neutral with Svelte dependency minimums.
- Replace dependencies: `@base-ui/react` → `bits-ui` (shadcn-svelte-style wrappers),
  `lucide-react` → `@lucide/svelte`, `zustand` → Svelte 5 runes controllers,
  `@dnd-kit/*` → `svelte-dnd-action` (side-nav rail + settings list only).
- Component tests move to `@testing-library/svelte`; `App.test.tsx` (~1.9k lines) is
  replaced by controller-level unit tests plus lean integration tests.

## Capabilities

### New Capabilities

- `usage-refresh`: Refresh semantics for usage data — automatic schedule, manual refresh
  with per-provider 5-minute cooldown, stale-while-revalidate retention with shimmer
  indication during refreshes, and failure handling that never clears existing data.

### Modified Capabilities

- `app-build-runtime`: The runnable-frontend requirement stops being React-specific
  (framework-neutral initialization, no React-internal error classes) and the dependency
  minimums switch from `react`/`react-dom`/`@vitejs/plugin-react` to
  `svelte`/`@sveltejs/vite-plugin-svelte`.

All other current specs are framework-neutral and unchanged; `linux-window`,
`window-starter`, `window-geometry`, `tray-provider-icon-color`, `quota-reset-timeline`,
`overview-metrics`, and `settings-migration` behaviors must keep passing unchanged —
their requirements are the parity bar for this rewrite.

## Impact

- **Code**: React files under `src/**` (rewritten as `src/svelte/**`; React files, the
  `?ui=`/`localStorage` switch, and React deps deleted in the final task, which requires
  explicit user approval per repo guardrails). `package.json`, `vite.config.ts`,
  `index.html`, `tsconfig`/vitest setup. `src/lib/**` shared untouched.
- **Untouched**: `src-tauri/**` (plugin engine, host API, window/tray/portal modules),
  `plugins/**`, all IPC command/event names, release scripts (verified, not edited),
  packaging.
- **Dependencies removed at the end**: `react`, `react-dom`, `zustand`, `@base-ui/react`,
  `lucide-react`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`,
  `@testing-library/react`, `@vitejs/plugin-react`. Kept: `tailwindcss` v4 stack,
  `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` (all
  framework-free and reused by the Svelte port).
- **Dependencies added**: `svelte`, `@sveltejs/vite-plugin-svelte`, `svelte-check`,
  `bits-ui`, `@lucide/svelte`, `svelte-dnd-action`, `@testing-library/svelte`.
- **Risk concentration**: probe/refresh state machine (hooks → runes controllers),
  drag-reorder UX parity on both surfaces (rail long-press + settings grip/keyboard),
  entry/tooling coexistence of both frameworks during migration.
