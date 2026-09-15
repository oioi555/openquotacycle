## ADDED Requirements

### Requirement: Tray icon is the fixed app icon

The tray SHALL always show the static full-color app icon. No provider
symbol, progress bars, donut, percentage text, or brand color SHALL appear
in the tray, and no light/dark theme variant of the icon SHALL be tracked —
the color icon is legible on both panel styles and removes panel-color
recoloring as a failure source. (macOS may render it as a mask via a single
`setIconAsTemplate` call.) The tooltip SHALL keep plain-text provider
summaries.

#### Scenario: Providers update

- **WHEN** probe results arrive or providers are enabled, disabled, or reordered
- **THEN** the tray icon image does not change; only the tooltip text updates

#### Scenario: Theme toggles at runtime

- **WHEN** the user toggles between light and dark theme
- **THEN** no tray icon re-render is triggered for theme reasons

## REMOVED Requirements

### Requirement: Tray provider icon color adapts to theme
**Reason**: Dynamic provider tray icons are removed; the tray shows the fixed app icon.
**Migration**: Delete `getIconColor` tray usage; dashboard provider icons keep their own contrast rule.

### Requirement: All tray icon modes honor the theme-aware color
**Reason**: The `provider`/`donut`/`bars` tray modes are removed with the fixed app icon.
**Migration**: Delete the mode rendering modules and the `menubarIconStyle` setting + Settings UI; ignore stale stored values.

### Requirement: Icon color source is the resolved tray provider
**Reason**: No tray provider resolution is needed for a fixed app icon.
**Migration**: Delete `trayProviderId` resolution and `getTrayPrimaryBars` with its `primaryOrder`/`primaryCandidates` metadata.

### Requirement: Theme change triggers an immediate re-render
**Reason**: Nothing theme-dependent remains in the tray icon.
**Migration**: Remove the theme watcher from the tray update path.

### Requirement: Fallback shape uses the resolved color
**Reason**: The fallback circle belonged to the removed dynamic icon renderer.
**Migration**: The existing static-asset fallback path becomes the only icon path.

### Requirement: Template-image behavior is preserved
**Reason**: Covered by the static app-icon path; no per-update template handling remains.
**Migration**: Keep a single `setIconAsTemplate` call where the static icon is installed.

### Requirement: No new IPC, Rust, or OS-layer surface
**Reason**: Subsumed by the removal; no new surface is introduced by this change either.
**Migration**: None.

### Requirement: Provider icon preserves aspect ratio and fits inside its slot
**Reason**: Provider SVGs are no longer inlined into tray icons.
**Migration**: Dashboard and Customize icon masks are unaffected.
