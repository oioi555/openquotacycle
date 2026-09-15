## 1. Persist Overview bar visibility

- [x] 1.1 Extend `PluginSettings` with a provider-id keyed hidden Overview progress-label map and make missing/invalid stored values load as an empty map.
- [x] 1.2 Update plugin-settings normalization and equality so unknown providers, removed labels, and the mandatory first progress label cannot remain hidden.
- [x] 1.3 Add settings tests for legacy defaults, round-trip persistence, normalization, equality, and newly added progress lines being visible by default.

## 2. Add Settings controls

- [x] 2.1 Extend the Settings plugin view model to expose declared progress lines, their checked state, and the mandatory first progress line for each provider.
- [x] 2.2 Render a compact per-provider Overview-bars control group in Settings with a checked, disabled first item and independent checkboxes for optional items; prevent child clicks from toggling or reordering the provider row.
- [x] 2.3 Thread the visibility-change callback through `App`, `AppContent`, and `SettingsPage`; update the plugin store immediately and persist the complete plugin settings without restarting probes or changing tray state.
- [x] 2.4 Add Settings page and action-hook tests covering mandatory/optional checkbox behavior and persisted visibility updates.

## 3. Filter Overview rendering

- [x] 3.1 Add Overview-only progress-line filtering to `ProviderCard`, applying the same selection to loading skeletons while leaving text and badge lines visible.
- [x] 3.2 Keep the first declared progress line visible, including the first-available runtime fallback when the required line has no data.
- [x] 3.3 Pass the per-provider visibility state through `OverviewPage` and preserve all-lines behavior in `ProviderDetailPage` and tray-bar rendering.
- [x] 3.4 Add component/page regression tests for hidden optional bars, mandatory bars, fallback data, skeletons, unchanged text/badges, and unchanged detail behavior.

## 4. Verification

- [x] 4.1 Run focused settings, Overview, ProviderCard, and app-composition tests.
- [x] 4.2 Run the full frontend test suite and TypeScript/Vite build.
- [x] 4.3 Validate `configure-overview-progress-bars` with strict OpenSpec validation and confirm no plugin manifest, probe, IPC, or tray behavior changes are included.

## 5. Follow-up usability fixes

- [x] 5.1 Collapse each provider's Overview metric controls by default and keep the disclosure independent from provider toggling and drag operations.
- [x] 5.2 Persist a provider-level Overview statistics visibility setting and expose it as one checkbox for declared text metrics.
- [x] 5.3 Filter hidden statistics text lines in Overview and loading skeletons while preserving selected progress bars, badge lines, detail view, and tray rendering.
- [x] 5.4 Add regression tests for collapsed controls, statistics persistence, and Codex-style text metric hiding.
