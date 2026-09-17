## Purpose
Define the minimum toolchain version requirements and runtime behavior guarantees for the OpenQuotaCycle build pipeline, ensuring the release binary renders the frontend without production-only runtime errors.

## Requirements

### Requirement: Release build produces a runnable frontend
The application's production build (`bun tauri build --bundles deb --no-sign` and equivalent release invocations) SHALL produce a binary whose frontend initializes without runtime errors. The WebKit console SHALL NOT report framework-internal initialization failures (mount/hydration/dispatcher-null class errors) on launch.

#### Scenario: Release binary launches and renders
- **WHEN** the user runs the release binary (installed via PKGBUILD or invoked directly from `src-tauri/target/release/openquotacycle`)
- **THEN** the main window renders the frontend (Overview page or last-selected provider view)
- **AND** the WebKit console contains no framework-internal initialization errors

#### Scenario: Dev server parity
- **WHEN** the same source tree is run via `bun tauri dev` (Vite dev server) and via `bun tauri build` (Rolldown production bundle)
- **THEN** both paths render identical UI for the same commit
- **AND** no error appears in one path that does not appear in the other

### Requirement: Plugin host globals use the OpenQuotaCycle contract

Bundled and third-party plugins SHALL export `globalThis.__openquotacycle_plugin` and SHALL receive host APIs on `globalThis.__openquotacycle_ctx`. The runtime SHALL reject a plugin that only defines `__quotracker_plugin` or `__quotracker_ctx`.

#### Scenario: Plugin probe uses the new globals

- **WHEN** a plugin script assigns `globalThis.__openquotacycle_plugin` with a matching `id` and `probe`
- **THEN** the host loads that plugin and injects `__openquotacycle_ctx`

#### Scenario: Legacy Quotracker globals are not accepted

- **WHEN** a plugin script defines only `__quotracker_plugin` or `__quotracker_ctx`
- **THEN** the host reports the plugin as missing `__openquotacycle_plugin`
- **AND** it does not call `probe`

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

### Requirement: No functional regression from the bump
The bump SHALL NOT introduce user-visible behavior changes beyond what existing specs already cover. All existing `openspec/specs/*/spec.md` requirements continue to pass.

#### Scenario: Existing specs still hold
- **WHEN** the change is implemented
- **THEN** `openspec validate --strict` passes for every spec under `openspec/specs/`
- **AND** the unit test suite (`vitest run`) passes with no new failures compared to the pre-bump baseline

### Requirement: No inherited telemetry destination

OpenQuotaCycle SHALL NOT send analytics events to an account or endpoint owned by an upstream project. No replacement telemetry SHALL be enabled unless it is explicitly configured and documented for OpenQuotaCycle.

#### Scenario: Application use

- **WHEN** a user starts OpenQuotaCycle or changes settings, providers, or update state
- **THEN** the application sends no Aptabase analytics event
- **AND** no upstream analytics application key is bundled
