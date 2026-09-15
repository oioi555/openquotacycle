## Why

`bun tauri build` (release) produces a binary whose frontend renders as a blank window, with `TypeError: null is not an object (evaluating 'w.H.useMemo')` in the WebKit console. `pnpm tauri dev` (vite dev server) is unaffected. Root cause is the Vite 8.0.x + `@vitejs/plugin-react` v6.0.1 combination: Rolldown's CJS/ESM interop loads React twice, so the hooks dispatcher is `null` at runtime. Tracking issues: [vitejs/vite#22307](https://github.com/vitejs/vite/issues/22307), [xyflow/xyflow#5734](https://github.com/xyflow/xyflow/issues/5734). Vite 8.0.15+ / `@vitejs/plugin-react` 6.0.2+ contain the relevant Rolldown interop fixes.

Beyond this acute bug, the project's stack is overdue for a refresh (Vite 8.0.0 → 8.1, React 19.1 → 19.2, Tauri 2 → 2.11, several tauri-plugin minor bumps). On Arch the system libraries advance continuously; pinning the bundled frontend/Rust deps to early-2026 versions invites future bit-rot. This change rolls forward to the latest stable across the stack in one coordinated bump.

## What Changes

- **Frontend (npm)**: bump `vite` ^8.0.0 → ^8.1.0, `@vitejs/plugin-react` ^6.0.1 → ^6.0.3 (resolves the prod-build `useMemo null` bug). Bump `react`/`react-dom` ^19.1.0 → ^19.2.7, `@base-ui/react` ^1.1.0 → ^1.6.0, `@tailwindcss/vite` ^4.1.18 → ^4.3.1, `lucide-react` ^1.7.0 → ^1.21.0. Regenerate `bun.lock`.
- **Tauri Rust crates**: bump `tauri` "2" → "2.11", `tauri-build` "2" → "2.6", and each `tauri-plugin-*` to the latest 2.x minor (`updater` 2.10, `log` 2.8, `global-shortcut` 2.3, `store` 2.4, `process` 2.3, `window-state` 2.4, `opener` 2.5; `autostart` already at 2.5.1). Regenerate `Cargo.lock`.
- **`tauri-plugin-aptabase`**: migrate from git rev `e896cceb` to the crates.io `1.0.0` release (officially published since). Drops a git dependency in favor of a versioned crate.
- **GitHub Actions**: bump `tauri-apps/tauri-action` to `v0.6.2` (Node 24, runner v2.327.1+ — already satisfied by current `ubuntu-latest`).
- **No source code changes** unless an upstream API break forces them (tracked under tasks; candidate surfaces: `@base-ui/react` Tooltip/Dialog, `tauri-plugin-*` Rust init calls). `vite.config.ts` is unchanged.

## Capabilities

### New Capabilities
- `app-build-runtime`: The application SHALL build successfully in release mode and the production frontend SHALL initialize without React runtime errors (no `useMemo`/`useState` dispatcher-null class of failures). Covers toolchain version compatibility across npm + crates.io dependencies.

### Modified Capabilities
<!-- None. Functional behavior of existing capabilities is unchanged; this is a toolchain/compatibility bump. -->

## Impact

- **Build toolchain**: `package.json` (npm deps), `src-tauri/Cargo.toml` (Rust deps), `bun.lock` regenerated, `src-tauri/Cargo.lock` regenerated.
- **CI**: `.github/workflows/*` — `tauri-apps/tauri-action` bumped to v0.6.2.
- **Source (conditional)**: `src/components/*` if `@base-ui/react` 1.6 changed an import path or prop; `src-tauri/src/lib.rs` if a tauri-plugin init signature changed. Both are discovered and fixed during the tasks phase, not preemptively.
- **No spec/API changes** for end users; no plugin contract changes; README unchanged.
