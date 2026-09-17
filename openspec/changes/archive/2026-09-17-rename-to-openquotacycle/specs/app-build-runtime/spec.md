## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Plugin host globals use the OpenQuotaCycle contract

Bundled and third-party plugins SHALL export `globalThis.__openquotacycle_plugin` and SHALL receive host APIs on `globalThis.__openquotacycle_ctx`. The runtime SHALL reject a plugin that only defines `__quotracker_plugin` or `__quotracker_ctx`.

#### Scenario: Plugin probe uses the new globals

- **WHEN** a plugin script assigns `globalThis.__openquotacycle_plugin` with a matching `id` and `probe`
- **THEN** the host loads that plugin and injects `__openquotacycle_ctx`

#### Scenario: Legacy Quotracker globals are not accepted

- **WHEN** a plugin script defines only `__quotracker_plugin` or `__quotracker_ctx`
- **THEN** the host reports the plugin as missing `__openquotacycle_plugin`
- **AND** it does not call `probe`
