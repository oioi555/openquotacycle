## 1. Frontend deps (package.json + bun.lock)

- [x] 1.1 Edit `package.json`: bump `vite` → `^8.1.0`, `@vitejs/plugin-react` → `^6.0.3`, `react`/`react-dom` → `^19.2.7`, `@types/react`/`@types/react-dom` → `^19.2.x` (latest available matching), `@base-ui/react` → `^1.6.0`, `@tailwindcss/vite` → `^4.3.1`, `tailwindcss` → `^4.3.1`, `lucide-react` → `^1.21.0`. Also bump `@tauri-apps/cli` → `^2.11.0` and each `@tauri-apps/plugin-*` to its latest 2.x to match the Rust-side bumps.
- [x] 1.2 Run `bun install`. Confirm `bun.lock` updates cleanly with no peer-dep errors. If peer warnings appear, capture them in the change log; do not silence with `--no-peer` etc.
- [x] 1.3 Run `rtk tsc --noEmit`. Resolve any breakage from `@types/react` 19.2 or `@base-ui/react` 1.6 (most likely: `children` type narrowing, `Ref` type changes, Tooltip prop renames).
- [x] 1.4 Run `rtk vitest run`. Resolve any new failures. Baseline before bump = 1143 pass.

## 2. `@base-ui/react` 1.6 audit

- [x] 2.1 `rg "@base-ui/react" src/` to enumerate every import site.
- [x] 2.2 For each import (Tooltip is the known one in `src/components/ui/tooltip.tsx`; check for Dialog/Select/etc.), compare the 1.1 → 1.6 changelog and verify: import path, component name, prop names, event signatures.
- [x] 2.3 Manually smoke test the running app (`pnpm tauri dev`) on every base-ui surface: hover a tray reset marker tooltip, open any Dialog (about/settings modal), toggle any Select. No console errors.

## 3. Rust deps (Cargo.toml + Cargo.lock)

- [x] 3.1 Edit `src-tauri/Cargo.toml`: bump `tauri-build` → `"2.6"`, `tauri` → `"2.11"`, `tauri-plugin-opener` → `"2.5"`, `tauri-plugin-store` → `"2.4"`, `tauri-plugin-log` → `"2.8"`, `tauri-plugin-updater` → `"2.10"`, `tauri-plugin-process` → `"2.3"`, `tauri-plugin-global-shortcut` → `"2.3"`, `tauri-plugin-window-state` → `"2.4"`. Leave `tauri-plugin-autostart = "2.5.1"` (already current).
- [x] 3.2 Migrate `tauri-plugin-aptabase` from `git = "..."` / `rev = "..."` to `version = "1.0"` (or latest 1.x at apply time).
- [x] 3.3 Run `cargo update` (in `src-tauri/`). Confirm `Cargo.lock` regenerates with the new versions and no resolution conflicts.
- [x] 3.4 Run `cargo build --release` (in `src-tauri/`). Resolve any breakage from tauri 2.11 / plugin minors (most likely: `tauri::Builder::plugin(...)` init signature, permission keys, deprecation lints).

## 4. CI

- [x] 4.1 `rg "tauri-apps/tauri-action" .github/workflows/` to find every workflow using the action.
- [x] 4.2 Bump each reference to `tauri-apps/tauri-action@v0.6.2`.
- [x] 4.3 If the workflow pins Node or runner version, confirm Node 24 compatible and runner `ubuntu-22.04`/`ubuntu-latest` is ≥ v2.327.1 (current `ubuntu-latest` already satisfies).

## 5. Release-build verification (the actual bug fix)

- [x] 5.1 Run `bun tauri build --debug --no-bundle` (faster than full bundle). Launch `./src-tauri/target/debug/tuxmeter`. Verify the Overview (or last view) renders, no `useMemo` null error in console.
- [x] 5.2 Run `bun tauri build --bundles deb --no-sign` (full release bundle). Launch `./src-tauri/target/release/tuxmeter`. Same verification.
- [x] 5.3 (Optional) `cd aur && makepkg -si` to verify the installed package also renders correctly.
- [x] 5.4 Compare dev (`pnpm tauri dev`) vs release binary side-by-side for any visual/behavior diff; investigate any divergence.

## 6. Wrap

- [x] 6.1 Run `openspec validate bump-deps-2026-06 --strict`. Resolve any issues.
- [x] 6.2 Update `/docs/choices.md` with a 2026-06-27 entry capturing: bump rationale, version deltas, anything that surprised us during the audit.
- [x] 6.3 Update `/docs/breadcrumbs.md` with a 2026-06-27 entry noting the prod-build bug and the bump that resolved it.
