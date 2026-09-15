## ADDED Requirements

### Requirement: Tray provider icon color adapts to theme
The dynamically generated tray icon SHALL render the embedded provider icon using a color resolved by `getIconColor(brandColor, isDark)`, rather than letting `fill="currentColor"` resolve to black inside a bare `<image>` element. The resolved color SHALL appear as a concrete value in the generated SVG output and SHALL survive the SVG-to-RGBA rasterization step.

#### Scenario: Dark theme with low-luminance brand color
- **WHEN** the active theme is dark and the resolved provider's `brandColor` has relative luminance below the dark-theme threshold
- **THEN** the generated tray SVG embeds the provider icon using `#ffffff`
- **AND** the RGBA passed to `tray.setIcon()` shows the provider silhouette as white

#### Scenario: Dark theme with luminous brand color
- **WHEN** the active theme is dark and the provider's `brandColor` has luminance above the dark-theme threshold
- **THEN** the generated tray SVG embeds the provider icon using the `brandColor` unchanged

#### Scenario: Light theme with high-luminance brand color
- **WHEN** the active theme is light and the provider's `brandColor` has luminance above the light-theme threshold
- **THEN** the generated tray SVG embeds the provider icon using `currentColor` semantics (system foreground) so it stays legible on light trays

#### Scenario: Provider without brandColor
- **WHEN** the resolved provider exposes no `brandColor`
- **THEN** the generated tray SVG embeds the provider icon using `currentColor` semantics

### Requirement: All tray icon modes honor the theme-aware color
The theme-aware color resolved by `getIconColor(brandColor, isDark)` SHALL be applied to **every painted shape** in the generated tray SVG, across all three `menubarIconStyle` modes:
- `provider` mode: the inlined provider icon, plus the fallback stroked circle when no icon is available.
- `donut` mode: the inlined provider icon, the fallback stroked circle, the donut track ring, and the donut progress arc.
- `bars` mode: every bar track `<rect>`, fill `<rect>`/`<path>`, and remainder `<path>`.

No `fill="black"` or `stroke="black"` literal SHALL remain on any painted shape (`<rect>`, `<path>`, `<circle>`, inlined provider content) in the generated SVG output for any mode; all such literals SHALL be replaced by the resolved `concreteColor`. The `percentText` `<text>` element is **explicitly out of scope** for this requirement (it is a separate legibility surface — numeric glyphs beside the icon, only rendered when `supportsNativeTrayTitle` is false) and is tracked as a follow-up in design.md Open Questions.

#### Scenario: Provider mode
- **WHEN** `menubarIconStyle === "provider"` and a `providerIconUrl` is present
- **THEN** the generated SVG embeds the provider icon using the theme-aware color

#### Scenario: Donut mode
- **WHEN** `menubarIconStyle === "donut"`
- **THEN** the generated SVG embeds the provider icon using the theme-aware color
- **AND** the donut track ring and progress arc use the theme-aware color (no `stroke="black"`)

#### Scenario: Bars mode
- **WHEN** `menubarIconStyle === "bars"`
- **THEN** every bar track, fill, and remainder shape uses the theme-aware color (no `fill="black"`)

#### Scenario: Fallback circle in any mode
- **WHEN** `providerIconUrl` is absent or fails to load in `provider` or `donut` mode
- **THEN** the fallback stroked circle uses the theme-aware color (no `stroke="black"`)

### Requirement: Icon color source is the resolved tray provider
The `brandColor` used for color resolution SHALL be read from the same `PluginMeta` that `useTrayIcon` already resolves as `trayProviderId` (the active view's provider, else the last-shown provider if still enabled, else the first enabled provider). It SHALL NOT be read from any other provider or from a global setting.

#### Scenario: Active-view provider used
- **WHEN** the active view is a provider detail page for an enabled provider P
- **THEN** the icon color is resolved from P's `PluginMeta.brandColor`

#### Scenario: Last-shown fallback used
- **WHEN** the active view is "home" or "settings" and a previously shown provider is still enabled
- **THEN** the icon color is resolved from that provider's `PluginMeta.brandColor`

#### Scenario: First enabled fallback used
- **WHEN** neither the active view nor the last-shown provider yields an enabled provider
- **THEN** the icon color is resolved from the first enabled provider's `PluginMeta.brandColor`

### Requirement: Theme change triggers an immediate re-render
The tray icon SHALL be re-rendered whenever the active theme (`isDark`) changes, without waiting for the next probe tick.

#### Scenario: Theme toggled at runtime
- **WHEN** the user toggles between light and dark theme while the app is running
- **THEN** the tray icon is re-rendered within one render frame using the new theme's color resolution

### Requirement: Fallback shape uses the resolved color
When `providerIconUrl` is missing, empty, or fails to load or parse, the existing fallback shape (the stroked circle in `tray-bars-icon.ts`) SHALL use the resolved `getIconColor` color instead of the hardcoded `stroke="black"`.

#### Scenario: Missing provider icon
- **WHEN** `providerIconUrl` is absent or empty
- **THEN** the fallback circle's stroke uses the resolved `getIconColor` color

#### Scenario: Provider SVG fails to load or parse
- **WHEN** the provider SVG fetch or parse fails
- **THEN** `renderTrayBarsIcon()` does not throw
- **AND** the fallback circle's stroke uses the resolved `getIconColor` color

### Requirement: Template-image behavior is preserved
The existing `tray.setIconAsTemplate(true)` call SHALL continue to be invoked after every `tray.setIcon()`. The theme-aware rendering applies only to the SVG bytes produced by `tray-bars-icon.ts`; it does not alter macOS template-image semantics.

#### Scenario: Template flag unchanged
- **WHEN** the tray icon is updated in any mode (`provider`, `donut`, or `bars`)
- **THEN** `tray.setIconAsTemplate(true)` is still called after `tray.setIcon()`

### Requirement: No new IPC, Rust, or OS-layer surface
The change SHALL be implemented entirely within `src/lib/tray-bars-icon.ts` and `src/hooks/app/use-tray-icon.ts`, reusing the existing `getIconColor` util and `useDarkMode` hook. No new Tauri command, event subscription, Rust file edit, or `tauri.conf.json` change SHALL be introduced.

#### Scenario: Layer scope
- **WHEN** the change is implemented
- **THEN** `git diff` touches only files under `src/lib/tray-bars-icon.ts`, `src/hooks/app/use-tray-icon.ts`, their test files, and the OpenSpec change directory
- **AND** no `invoke()` or new `listen()` call is added

### Requirement: Provider icon preserves aspect ratio and fits inside its slot
When inlining a provider SVG whose `viewBox` is not square (e.g. 24x30), the scale factor SHALL be `min(targetSize/w, targetSize/h)` so the entire silhouette fits within the `targetSize x targetSize` slot. The icon SHALL be centered within the slot (offset on the longer axis) so it is not clipped on either axis.

#### Scenario: Non-square viewBox
- **WHEN** a provider SVG has `viewBox="0 0 24 30"` and `targetSize` is 18
- **THEN** the scale factor is `min(18/24, 18/30) = 0.6`
- **AND** the entire 24x30 silhouette renders within the 18x18 slot (no clipping)
- **AND** the silhouette is centered along the x axis (offset) within the slot

#### Scenario: Square viewBox (regression)
- **WHEN** a provider SVG has a square `viewBox` (e.g. `0 0 100 100`)
- **THEN** the scale factor is `targetSize / 100` and the silhouette fills the slot exactly
