## 1. Persistence and Models

- [x] 1.1 Add the default-off Window Starter preference to settings loading, saving, bootstrap, and state stores; verify settings unit tests cover defaults and persistence.
- [x] 1.2 Add bounded Window Starter attempt persistence and provider lock derivation; verify unit tests retain only the newest 500 attempts and prevent attempts within five hours.
- [x] 1.3 Tighten supported provider quota normalization so missing usage remains unknown rather than zero; verify plugin regression tests reject incomplete automatic-start data without changing valid displays.

## 2. Native CLI Runner

- [x] 2.1 Add Tauri executable-discovery and fixed Window Starter command APIs for Claude, Codex, and Z.ai using direct argument invocation; verify Rust tests assert exact executable and argument construction.
- [x] 2.2 Add bounded process execution, timeout handling, output truncation, and structured results; verify Rust tests cover success, non-zero exit, timeout, and unsupported providers.
- [x] 2.3 Audit the new native commands and provider-exposed fields against `src-tauri/src/plugin_engine/host_api.rs` redaction boundaries; add or update redaction tests for any discovered gap.

## 3. Detection and Orchestration

- [x] 3.1 Implement supported-provider state classification from enabled probe results, executable availability, exact five-hour metadata, and weekly guards; verify hook/helper tests cover ready, active, unknown, disabled, CLI-missing, and weekly-exhausted states.
- [x] 3.2 Implement serialized one-attempt orchestration with a timestamped minimal prompt and immediate pending history; verify tests prove recurring probe updates cannot launch a second command within five hours.
- [x] 3.3 Implement bounded provider-only confirmation polling that updates the existing attempt to confirmed, unconfirmed, or failed without model retries; verify fake-timer tests cover delayed confirmation and timeout.

## 4. Window Starter Page

- [x] 4.1 Add a dedicated `window-starter` route and side-navigation control without changing the Settings page; verify navigation and app-content tests select the new page correctly.
- [x] 4.2 Build the Window Starter page with the master control and live Claude, Codex, and Z.ai status rows; verify component tests cover enabled state, CLI availability, readiness, and current reset display.
- [x] 4.3 Add the execution-focused activity list with expandable attempt details and empty state; verify component tests render confirmed, unconfirmed, and failed attempts without probe/poll rows.

## 5. Integration and Documentation

- [x] 5.1 Wire Window Starter into application bootstrap and probe refresh flow; verify an integration test covers detection through confirmation and persisted history.
- [x] 5.2 Update README and relevant architecture/provider documentation with supported CLIs, default-off behavior, and billing/account caveats; verify documented commands match the runner registry.
- [x] 5.3 Run frontend tests, type checking, Rust tests, formatting, and production builds; verify all commands complete successfully.
