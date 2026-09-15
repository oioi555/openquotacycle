## MODIFIED Requirements

### Requirement: Release build produces a runnable frontend
The application's production build (`bun tauri build --bundles deb --no-sign` and equivalent release invocations) SHALL produce a binary whose frontend initializes without runtime errors. The WebKit console SHALL NOT report framework-internal initialization failures (mount/hydration/dispatcher-null class errors) on launch.

#### Scenario: Release binary launches and renders
- **WHEN** the user runs the release binary (installed via PKGBUILD or invoked directly from `src-tauri/target/release/quotracker`)
- **THEN** the main window renders the frontend (Overview page or last-selected provider view)
- **AND** the WebKit console contains no framework-internal initialization errors

#### Scenario: Dev server parity
- **WHEN** the same source tree is run via `bun tauri dev` (Vite dev server) and via `bun tauri build` (Rolldown production bundle)
- **THEN** both paths render identical UI for the same commit
- **AND** no error appears in one path that does not appear in the other

### Requirement: Dependencies stay within supported ranges
The project's npm and crates.io dependencies SHALL be at or above the minimum versions known to contain the relevant production-build fixes:

- `vite` >= 8.0.15 (recommended 8.1.x)
- `svelte` >= 5.50 (recommended 5.57.x)
- `@sveltejs/vite-plugin-svelte` >= 7.0 (recommended latest 7.x; required for `vite` 8)
- `tauri` >= 2.10 (recommended 2.11.x)
- All `tauri-plugin-*` crates within their latest 2.x minor

#### Scenario: Toolchain versions
- **WHEN** `cat package.json` and `cat src-tauri/Cargo.toml` are run after the change
- **THEN** `vite`, `svelte`, and `@sveltejs/vite-plugin-svelte` meet or exceed the minimums above
- **AND** `tauri` and each `tauri-plugin-*` meet or exceed the minimums above
