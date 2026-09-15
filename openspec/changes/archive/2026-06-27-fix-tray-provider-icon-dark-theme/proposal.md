## Why

The tray icon is rendered dynamically by `src/hooks/app/use-tray-icon.ts` from a generated SVG. When `menubarIconStyle === "provider"` (the default) or `"donut"`, `src/lib/tray-bars-icon.ts` embeds the provider's SVG via a bare `<image href="${providerIconUrl}" />` element. Provider SVGs declare shapes with `fill="currentColor"`, but inside `<image>` there is no parent `color` context, so the renderer resolves `currentColor` to **black**. The resulting RGBA passed to `tray.setIcon()` is therefore a black silhouette — invisible against any dark tray/taskbar (KDE dark panel, GNOME top bar in dark style, etc.). The same dark-theme legibility rules already applied elsewhere (`src/lib/color.ts → getIconColor(brandColor, isDark)`, used by `SideNav` and `TimelineRow`) are not applied to the tray icon path. This is the same class of bug fixed for DOM icons in `footer-quota-timeline`, just on a different rendering layer.

## What Changes

- Replace the bare `<image href="${providerIconUrl}" />` embedding in `tray-bars-icon.ts` with an inlined `<g transform="translate scale">` whose shapes are rewritten to a theme-aware color computed via the existing `getIconColor(brandColor, isDark)`. The rewriter covers **both** the literal `currentColor` (in raw provider SVGs) **and** the brandColor literal that the Rust manifest bundler bakes in before serving the dataURL (`src-tauri/src/plugin_engine/manifest.rs:113-118`), so the rewrite reaches the SVG regardless of which form the source ships.
- Thread `brandColor` and `isDark` through `makeTrayBarsSvg()` / `renderTrayBarsIcon()` so every painted shape in **all three `menubarIconStyle` modes** (`provider`, `donut`, `bars`) — provider icon, fallback circle, donut track ring, donut progress arc, bar tracks/fills/remainders — uses the resolved `concreteColor`. No `fill="black"` / `stroke="black"` literal remains in any mode's SVG output.
- `inlineProviderSvg` uses an **aspect-ratio-preserving scale** (`min(targetSize/viewBoxW, targetSize/viewBoxH)`) with centering offset, so non-square provider SVGs (e.g. OpenCode-GO `0 0 24 30`) fit inside the slot without clipping.
- `useTrayIcon()` obtains `isDark` from the existing `useDarkMode()` hook (single subscription) and `brandColor` from the resolved `trayProviderId`'s `PluginMeta`, passing both down. `isDark` is added to the relevant `useEffect` deps so theme toggles re-render the tray within one frame.
- `setIconAsTemplate(true)` stays unchanged (macOS-only affordance; harmless no-op on Linux/Windows per Tauri source).
- No Rust changes, no Tauri config changes, no new IPC.
- Adds unit tests asserting that `makeTrayBarsSvg()` emits the `getIconColor`-derived color for **all three modes** and **zero `fill="black"` / `stroke="black"` literals**; a regression test for `dark theme + low-luminance brand → #ffffff`; and a test that a `viewBox="0 0 24 30"` source is scaled with `min(scaleX, scaleY)` and centered.

## Capabilities

### New Capabilities
- `tray-provider-icon-color`: Theme-aware color resolution for the provider icon embedded in the dynamically generated tray icon SVG, so dark brandColor providers stay legible on dark trays/taskbars.

### Modified Capabilities
<!-- None. `overview-metrics` governs Overview card content; tray icon behavior is not in its requirements. -->

## Impact

- **Frontend (new)**: `src/lib/tray-provider-icon.ts` — `resolveTrayIconColor`, `rewriteCurrentColor(svg, color, brandColor?)` (rewrites both `currentColor` and the brandColor literal, case-insensitive), `fetchProviderIconSvg` (in-memory cache), `prefixLocalIds`.
- **Frontend (modified)**:
  - `src/lib/tray-bars-icon.ts` — `makeTrayBarsSvg()` / `renderTrayBarsIcon()` accept `brandColor?: string` and `isDark: boolean`; `<image href>` embedding replaced by fetched-then-inlined `<g>` via `inlineProviderSvg` (aspect-ratio-preserving scale, Decision 8); every `fill="black"` / `stroke="black"` literal in all three modes replaced by the resolved `concreteColor` (Decision 7).
  - `src/hooks/app/use-tray-icon.ts` — obtain `isDark` via `useDarkMode()`, resolve `brandColor` from the selected provider's `PluginMeta`, pass both into `renderTrayBarsIcon()` for all three branches; `isDark` added to the relevant `useEffect` deps.
- **Shared util (unchanged)**: `src/lib/color.ts → getIconColor(brandColor, isDark)` is reused as-is.
- **Tests**: new `src/lib/tray-provider-icon.test.ts` (color resolver, rewriter, fetch/cache, id-prefix) and extended `src/lib/tray-bars-icon.test.ts` (all three modes emit the resolved color with no `black` literals; non-square viewBox scaling/centering; square viewBox regression). `src/App.test.tsx` extended with a `useDarkMode` mock and a "toggling theme re-renders tray" case.
- **No Rust / IPC / Tauri config changes**: `tray.rs`, `tauri.conf.json`, host_api redaction lists, and the Rust manifest bundler are untouched. (The bundler's `currentColor → brandColor` pre-replacement is the reason `rewriteCurrentColor` also handles the brandColor literal — the bundler is deliberately left as-is because DOM-side icon rendering uses CSS masks that are unaffected by the SVG fill value.)
- **README**: no plugin or plugin-exposed field changes; no update required.
