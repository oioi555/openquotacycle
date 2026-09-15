## Why

Display defaults are implicit today (missing keys mean manifest order + everything visible), so reset can only delete keys, and tray visuals carry a provider/bars/donut engine with per-line `primaryOrder` metadata that is no longer wanted. Declaring defaults in the manifest and fixing the tray icon makes both behaviors explicit and deletable.

## What Changes

- Manifest lines gain an optional `visibleByDefault: true` mark: marked progress and text lines show by default; unmarked lines default to On Demand. Order default stays `lines[]` declaration order. Stored explicit visible sets take precedence; legacy hidden-line and hidden-statistics preferences migrate to visible sets.
- Display reset (`handleOverviewDisplayReset`) applies manifest defaults instead of only deleting keys.
- **BREAKING** (tray visuals): remove `primaryOrder` from manifests, `primaryCandidates` from the Rust DTO, `getTrayPrimaryBars` + bars/donut/provider rendering, and the `menubarIconStyle` setting + Settings UI. Tray icon is fixed to the static app icon (with existing fallback path); tooltip keeps plain text.
- Remove now-dead tests and manifest fields across bundled plugins.

## Capabilities

### New Capabilities
- `manifest-display-defaults`: per-line default visibility marks, validation rules, and how defaults flow into overview classification and display reset.

### Modified Capabilities
- `overview-metrics`: default visibility/order come from the manifest declaration; display reset restores manifest defaults instead of empty state.
- `tray-provider-icon-color`: tray icon is the fixed static app icon; dynamic provider/bars/donut modes and theme-aware provider coloring are removed.

## Impact

- Rust: `plugin_engine/manifest.rs` (new key, drop `primary_order`), `lib.rs` (`PluginMeta`), manifest tests.
- Frontend: `settings.ts` (defaults resolution), `settings-controller` (reset), `tray-controller` + tray icon render modules, Settings page (drop icon-style UI), `tray-primary-progress.ts` (+ tests), bundled `plugins/*/plugin.json` (`primaryOrder` removal).
- Settings keys removed (`menubarIconStyle`); migration note for stale stored values.
