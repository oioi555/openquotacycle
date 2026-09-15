## Context

- The frontend is bundled with Vite 8 (Rolldown-based) + `@vitejs/plugin-react` v6 (Oxc-based, Babel removed) + React 19.
- Release build currently fails at runtime with `TypeError: null is not an object (evaluating 'w.H.useMemo')`. Dev build (esbuild on-the-fly via vite dev server) works. The root cause is Rolldown's CJS/ESM interop loading React twice, so the hooks dispatcher is `null`.
- The project's `package.json` pins early-2026 versions (`vite ^8.0.0`, `@vitejs/plugin-react ^6.0.1`, `react ^19.1.0`, `@base-ui/react ^1.1.0`). The Tauri Rust side is on `tauri "2"` (any 2.x) and individual `tauri-plugin-*` versions, with `tauri-plugin-aptabase` pointing at a git rev (`e896cceb`) because no crates.io release existed at the time.
- Project is targeted at Arch Linux (and packaged via local `makepkg`); system libraries advance continuously, so bundled deps must roll forward periodically.
- Current `vite.config.ts` is minimal: `plugins: [react(), tailwindcss()]`, `resolve.alias` for `@/`. No custom build / optimizeDeps / commonjsOptions.

## Goals / Non-Goals

**Goals:**
- Eliminate the release-build `useMemo null` failure so the installed app renders.
- Bring the stack (Vite / plugin-react / React / Tauri / tauri-plugin-*) to current stable in one coordinated bump.
- Migrate `tauri-plugin-aptabase` off a git rev onto the published crates.io release.
- Keep `vite.config.ts` minimal (no chronic workaround like `resolve.conditions` / `legacy.inconsistentCjsInterop`) — rely on the upstream fix instead.

**Non-Goals:**
- Major-version upgrades that bring semantic/API breaks (e.g. React 20, Vite 9, Tailwind 5, Tauri 3) — out of scope.
- Refactoring source code to adapt to upstream API breaks, *unless* the bump surfaces one (handled per-task, not preemptively).
- Changing the PKGBUILD flow, the bundle targets, or the OS support matrix.
- Renaming or splitting modules for LOC guideline compliance (tracked separately; out of scope).

## Decisions

### Decision 1: Bump Vite to 8.1.x (not pin 8.0.16)
**Choice**: `vite ^8.1.0` rather than `^8.0.16`.
**Rationale**: 8.0.16 contains the minimal Rolldown interop fixes, but 8.1.x is the current stable line with a longer support window and additional fixes. Pinning the tip of 8.0.x would mean re-bumping within weeks.
**Alternatives considered**:
- `vite ^8.0.16` — rejected: shorter support window, will need another bump for any future fix.
- `vite ^7` (Rollup-based) — rejected: loses Rolldown performance and React 19 + plugin-react v6 era; rolls backwards.

### Decision 2: Bump `@vitejs/plugin-react` to 6.0.3 in lockstep with Vite
**Choice**: `@vitejs/plugin-react ^6.0.3`.
**Rationale**: 6.0.1 → 6.0.3 widened the `@rolldown/plugin-babel` peer range and aligned with Vite 8.1's Rolldown version. The two are version-coupled by design.
**Alternatives considered**:
- Keep `^6.0.1` — rejected: would still pull 6.0.3 via semver, but pinning intent matters for future diffs.
- Migrate to `@vitejs/plugin-react-swc` — rejected: unrelated; current code uses the runtime-JSX path.

### Decision 3: Bump React 19.1 → 19.2
**Choice**: `react ^19.2.7`, `react-dom ^19.2.7`, `@types/react ^19.2.x`, `@types/react-dom ^19.2.x`.
**Rationale**: 19.2 is the current stable minor. No known bugs at this writing. Staying on 19.1 would mean a second bump when a future fix lands.
**Alternatives considered**:
- Stay on 19.1 — rejected: misses recent fixes; short-lived.

### Decision 4: Bump `@base-ui/react` 1.1 → 1.6 (verify API surface)
**Choice**: `@base-ui/react ^1.6.0`, with a mandatory audit of in-tree call sites (`src/components/ui/tooltip.tsx`, anywhere else it's imported) before declaring the change done.
**Rationale**: 1.6 is current stable. The 1.1 → 1.6 jump spans five minor versions and could carry subtle API changes (prop names, import paths). The audit is a task gate, not a preemptive refactor.
**Alternatives considered**:
- Stay on 1.1 — rejected: incompatible with React 19.2 in some edge cases per the 1.6 changelog.
- Skip the audit and rely on `tsc` — rejected: type checks catch structural breaks but not renamed CSS variables / changed default behaviors.

### Decision 5: Bump Tauri 2 → 2.11 + plugin minors
**Choice**: `tauri "2.11"`, `tauri-build "2.6"`, and each `tauri-plugin-*` to its latest 2.x minor per the librarian survey (`updater 2.10`, `log 2.8`, `global-shortcut 2.3`, `store 2.4`, `process 2.3`, `window-state 2.4`, `opener 2.5`, `autostart` stays at 2.5.1).
**Rationale**: Tauri 2 follows semver within the 2.x line; minors are backward-compatible. Bumping the plugins in lockstep avoids `tauri` core being newer than a plugin's pinned `tauri` dependency.
**Alternatives considered**:
- Bump only `tauri` core and leave plugins — rejected: plugin builds can fail if their internal `tauri` dependency is older than the resolved core version.
- Bump everything to `2` (floating) — rejected: loses reproducibility; the lockfile would still resolve, but the manifest would not communicate intent.

### Decision 6: Migrate `tauri-plugin-aptabase` git rev → crates.io `1.0.0`
**Choice**: `tauri-plugin-aptabase = "1.0"` (or later) in `Cargo.toml`, removing the `git = "..."` / `rev = "..."` keys.
**Rationale**: Aptabase shipped an official crates.io release (`1.0.0`). Versioned crates are cacheable, auditable, and don't require network access to a specific git host during `cargo build`. Drops the only git-as-crate source in the manifest.
**Alternatives considered**:
- Keep git rev — rejected: no longer necessary; git revs are a maintenance liability.

### Decision 7: Bump `tauri-apps/tauri-action` to v0.6.2
**Choice**: `.github/workflows/release.yml` (and any workflow using the action) pinned to `tauri-apps/tauri-action@v0.6.2`.
**Rationale**: v0.6.2 is the Node 24 release; required for runners on `ubuntu-22.04`/`ubuntu-latest` newer than v2.327. Older action versions fail on current runners.
**Alternatives considered**:
- Stay on older action — rejected: CI breakage on runner upgrades.

### Decision 8: Do NOT add chronic workarounds to `vite.config.ts`
**Choice**: Leave `vite.config.ts` as-is. Do not add `resolve.conditions`, `optimizeDeps.include`, `build.commonjsOptions`, or `legacy.inconsistentCjsInterop` workarounds.
**Rationale**: These mask the underlying bug in specific Vite versions. The bump in Decisions 1–2 is the upstream fix; layering workarounds on top would leave a footgun for the next maintainer.
**Alternatives considered**:
- Add `resolve.conditions: ["import","module","default"]` — rejected: papered over the bug; would become load-bearing once the upstream fix lands.

## Risks / Trade-offs

- **[@base-ui/react 1.6 API drift]** Five minor versions of change. → Mitigation: task-gated audit of every import site; tsc + manual smoke of Tooltip/Dialog/Select before close.
- **[Vite 8.1 freshness]** Released 6/23, four days before this change. → Mitigation: 8.1 ships the accumulated 8.0.x patch set plus additional fixes; staying on 8.0.16 would simply delay the same exposure.
- **[tauri-plugin minors change behavior]** Init signatures or permission keys could shift within a minor. → Mitigation: cargo build + manual launch smoke after bump; CI runs `tauri build` for the deb bundle.
- **[aptabase 1.0 behavior parity]** The published crate might differ subtly from the pinned git rev. → Mitigation: analytics events are fire-and-forget; verify on dev launch that no panic surfaces in the console.
- **[CSS minifier default]** Vite 8 defaults to `lightningcss`, which has a known issue with `-webkit-backdrop-filter` (issue #22649). → Mitigation: only relevant if tuxmeter uses backdrop-filter; current Tailwind config does not. Track if it surfaces.

## Migration Plan

- Pure toolchain bump; no data migration, no IPC changes, no plugin contract changes.
- Rollback: `git revert` the bump commit; `bun install` and `cargo build` will reproduce the previous lockfile state. No persisted state depends on the toolchain versions.
- Release: PKGBUILD flow unchanged (`bun tauri build --bundles deb --no-sign`); the resulting `.deb` will simply be produced by the newer toolchain.

## Open Questions

- Should we add a `renovate.json` or Dependabot config to automate future bumps? Out of scope for this change, but the manual chore of bumping argues for it.
- Should the `tauri-plugin-aptabase` migration move to a newer release (e.g. 1.1 if one ships) before archive? Pinned to 1.0 minimum; will take whatever is latest at apply time.
