## ADDED Requirements

### Requirement: Release build produces a runnable frontend
The application's production build (`bun tauri build --bundles deb --no-sign` and equivalent release invocations) SHALL produce a binary whose frontend initializes React without runtime errors. The WebKit console SHALL NOT report `TypeError: null is not an object (evaluating '<minified>.useMemo')` or any other React-internal dispatcher-null class of failure on launch.

#### Scenario: Release binary launches and renders
- **WHEN** the user runs the release binary (installed via PKGBUILD or invoked directly from `src-tauri/target/release/tuxmeter`)
- **THEN** the main window renders the React application (Overview page or last-selected provider view)
- **AND** the WebKit console contains no `useMemo`/`useState`/`useRef` null-dispatcher errors

#### Scenario: Dev server parity
- **WHEN** the same source tree is run via `pnpm tauri dev` (vite dev server) and via `bun tauri build` (Rolldown production bundle)
- **THEN** both paths render identical UI for the same commit
- **AND** no error appears in one path that does not appear in the other

### Requirement: Dependencies stay within supported ranges
The project's npm and crates.io dependencies SHALL be at or above the minimum versions known to contain the relevant production-build fixes:

- `vite` >= 8.0.15 (recommended 8.1.x)
- `@vitejs/plugin-react` >= 6.0.2 (recommended 6.0.3)
- `react` and `react-dom` >= 19.1.0 (recommended 19.2.x)
- `tauri` >= 2.10 (recommended 2.11.x)
- All `tauri-plugin-*` crates within their latest 2.x minor

#### Scenario: Toolchain versions
- **WHEN** `cat package.json` and `cat src-tauri/Cargo.toml` are run after the change
- **THEN** `vite`, `@vitejs/plugin-react`, `react`, `react-dom` meet or exceed the minimums above
- **AND** `tauri` and each `tauri-plugin-*` meet or exceed the minimums above

### Requirement: No functional regression from the bump
The bump SHALL NOT introduce user-visible behavior changes beyond what existing specs already cover. All existing `openspec/specs/*/spec.md` requirements continue to pass.

#### Scenario: Existing specs still hold
- **WHEN** the change is implemented
- **THEN** `openspec validate --strict` passes for every spec under `openspec/specs/`
- **AND** the unit test suite (`vitest run`) passes with no new failures compared to the pre-bump baseline

### Requirement: tauri-plugin-aptabase uses the crates.io release
The `tauri-plugin-aptabase` dependency in `src-tauri/Cargo.toml` SHALL reference the versioned crates.io release (`1.0.0` or later) rather than a git revision. This eliminates a git-as-crate source in favor of a published, semver-tagged artifact.

#### Scenario: No git dependency for aptabase
- **WHEN** `cat src-tauri/Cargo.toml` is run after the change
- **THEN** the `tauri-plugin-aptabase` line uses a `version = "..."` form
- **AND** no `git = "..."` key is present for that dependency
