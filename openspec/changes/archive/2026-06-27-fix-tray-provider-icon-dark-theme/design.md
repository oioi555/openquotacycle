## Context

- The tray icon is rendered dynamically by `src/hooks/app/use-tray-icon.ts`. Each update calls `renderTrayBarsIcon()` in `src/lib/tray-bars-icon.ts`, which builds an SVG string via `makeTrayBarsSvg()`, rasterizes it to RGBA via a Canvas, and hands the result to `tray.setIcon()`.
- In `provider` and `donut` modes, `makeTrayBarsSvg()` embeds the provider's SVG with `<image href="${providerIconUrl}" />` (lines 216 and 235). Provider SVGs (Z.ai, OpenCode-GO, etc.) declare shapes with `fill="currentColor"`, but `<image>` has no parent `color` context, so the browser resolves `currentColor` to **black** during rasterization. On dark trays/taskbars (KDE dark panel, GNOME top bar in dark style) the resulting silhouette is invisible.
- `getIconColor(brandColor, isDark)` (`src/lib/color.ts`, hoisted there during `footer-quota-timeline`) already encodes the project's dark-theme legibility rules. It is used by `SideNav` and `TimelineRow` via CSS mask + `backgroundColor`. This change applies the same rules to the tray icon path.
- `tray.setIconAsTemplate(true)` is called after every `tray.setIcon()`. It is a macOS-only affordance (template image = mask drawn in menu-bar foreground color) and a no-op on Linux/Windows, where the RGBA pixels are shown as-is. It must not regress.
- `useTrayIcon()` re-renders on every probe tick and on settings/view changes via `scheduleTrayIconUpdate()`. Theme changes do **not** currently trigger a re-render.

## Goals / Non-Goals

**Goals:**
- Provider icon in the tray stays legible on both light and dark trays/taskbars.
- Single source of truth for dark-theme legibility (`getIconColor`) shared with the DOM icon paths.
- Re-render the tray icon when the user toggles theme, without waiting for a probe tick.
- Zero Rust / IPC / OS-layer changes.

**Non-Goals:**
- Cross-platform template-image behavior (macOS already works via `setIconAsTemplate`; this change targets Linux/Windows legibility).
- Changing `menubarIconStyle` semantics or its default value.
- Refactoring the `bars` mode (it does not embed a provider icon).
- macOS-specific icon asset changes.

## Decisions

### Decision 1: Resolve icon color at SVG-generation time via `getIconColor`
**Choice**: Compute `color = getIconColor(brandColor, isDark)` inside `makeTrayBarsSvg()` and emit that concrete color in the SVG, instead of relying on `<image>` + `currentColor`.
**Rationale**: `<image href>` cannot inherit `color` reliably across renderers; the only deterministic fix is to stop depending on `currentColor` inside `<image>`. Producing a concrete color from the same util used for DOM icons keeps the legibility rules in one place.
**Alternatives considered**:
- Wrap `<image>` in `<g color="white">` — rejected: behavior is renderer-dependent and unreliable across WebKitGTK/Chromium/WebKit (macOS).
- Rasterize first, then post-process pixels — rejected: slow, fragile around anti-aliased edges, and discards the original color intent for multi-color SVGs.

### Decision 2: Inline the provider SVG via `<g>` after rewriting `currentColor` **and** the brandColor literal
**Choice**: When a `providerIconUrl` is provided, fetch its bytes, then rewrite **both** (a) every `currentColor` occurrence (in `fill=`, `stroke=`, `color:` style, etc.) and (b) every `brandColor` literal (case-insensitive, regex-escaped) to the resolved `concreteColor`. Inline the rewritten SVG markup inside a `<g transform="translate(x,y) scale(...)">` rather than referencing it via `<image href>`.
**Rationale**: Inlining guarantees the resolved color reaches every painted shape and survives the Canvas rasterization step. `renderTrayBarsIcon()` is already `async`, so an extra `fetch()` fits the existing flow. Rewriting `currentColor` alone is **not sufficient**: the Rust manifest bundler (`src-tauri/src/plugin_engine/manifest.rs:113-118`) pre-replaces `currentColor` with the provider's `brandColor` before serving the dataURL, so by the time the SVG reaches the JS layer it carries the brandColor literal directly (e.g. Z.ai ships `fill="currentColor"` but the bundled dataURL contains `fill="#2D2D2D"`). The rewriter therefore matches both forms. Other hardcoded colors (e.g. a multi-color logo's secondary hue) are left untouched, preserving provider intent.
**Alternatives considered**:
- Rewrite `currentColor` only — rejected: silent no-op for any plugin whose `brandColor` is set, because the bundler has already substituted the literal; user-verified failure mode (Z.ai rendered pure black despite a "correct" `concreteColor`).
- Disable the Rust bundler's `currentColor → brandColor` replacement — rejected: DOM-side icon rendering (SideNav, TimelineRow) uses CSS masks that read only the SVG silhouette, so they are indifferent to the fill value, but other yet-unknown consumers might depend on the substituted literal; the bundler is left untouched and the JS rewriter absorbs both forms instead.
- SVG `<mask>` + color-filled `<rect>` (`<mask><image href="..."/></mask>` + `<rect fill="${color}" mask="...">`) — rejected: the mask-image's `currentColor` resolution is also renderer-dependent; risks producing an inverted or empty mask on some engines.
- Keep `<image href>` but inject a `<?xml-stylesheet?>` with a `color` rule — rejected: external SVG loaded via `<image>` ignores document-level stylesheets in practice across engines.

### Decision 3: Cache fetched provider SVGs in-module
**Choice**: Maintain a small in-memory `Map<url, string>` cache keyed by `providerIconUrl` inside `tray-bars-icon.ts`. Re-fetch only on cache miss.
**Rationale**: `useTrayIcon()` re-renders on every probe tick (typically every refresh interval); refetching the same SVG each time wastes IPC + parsing cycles. The URL is stable per provider release.
**Alternatives considered**:
- Cache in `useTrayIcon` and pass bytes down — rejected: splits responsibility; `tray-bars-icon.ts` already owns SVG construction.

### Decision 4: Fallback shape uses the resolved color
**Choice**: When `providerIconUrl` is missing, empty, or fetch/parse fails, the existing stroked-circle fallback uses `stroke="${color}"` instead of the hardcoded `stroke="black"`.
**Rationale**: The fallback is itself an icon and must obey the same legibility rules; leaving it black would re-introduce the bug for providers that ship no SVG.

### Decision 5: Theme changes trigger an immediate re-render
**Choice**: Add `isDark` to the dependency list of the `useEffect` in `use-tray-icon.ts` that calls `scheduleTrayIconUpdate("settings", 0)`, alongside the existing `activeView` and `menubarIconStyle` dependencies.
**Rationale**: Theme is a user-initiated change with immediate visible effect elsewhere in the UI; the tray should follow without waiting for the next probe tick. Probe ticks alone are too coarse (and may be paused on hidden windows).
**Alternatives considered**:
- Reuse the existing probe-tick path only — rejected: noticeable lag (seconds) after a theme toggle.

### Decision 6: `isDark` obtained via a single `useDarkMode()` subscription
**Choice**: `useTrayIcon()` calls `useDarkMode()` exactly once and passes the resulting `isDark` boolean down to `renderTrayBarsIcon()`.
**Rationale**: Avoids duplicate theme subscriptions in the tray path; matches the pattern already established by `QuotaResetTimeline`.
**Alternatives considered**:
- Read theme directly from `useAppPreferencesStore` — rejected: bypasses the `useDarkMode` abstraction that also handles OS theme detection.

### Decision 7: All three modes use the resolved color
**Choice**: Apply `concreteColor = getIconColor(brandColor, isDark)` to every painted shape in `makeTrayBarsSvg()`, across all three `menubarIconStyle` modes — `provider`, `donut`, and `bars`. Every literal `fill="black"` and `stroke="black"` is replaced by `fill="${concreteColor}"` / `stroke="${concreteColor}"`.
**Rationale**: User feedback after the initial implementation showed that `bars` and `donut` chart shapes were still black on a dark tray, defeating the purpose of the change. The `menubarIconStyle` selector switches *layout*, not *legibility surface* — every shape rendered into the tray rasterizes through the same Canvas + RGBA path and lands on the same OS tray background, so they all need the same theme-aware color treatment.
**Alternatives considered**:
- Keep `bars` out of scope (original Decision 7) — rejected: user reported black bars/donut rings remain invisible on dark trays, identical failure mode to the original bug.
- Apply color only to `bars`/`donut` chart shapes, leave `provider` icon alone — rejected: inconsistent; the provider icon needs the same treatment.

### Decision 8: Aspect-ratio-preserving scale for inlined provider SVGs
**Choice**: Compute the inline scale as `min(targetSize / viewBoxW, targetSize / viewBoxH)`, then center the silhouette within the slot by offsetting along the longer axis: `offsetX = (targetSize - viewBoxW * scale) / 2`, `offsetY = (targetSize - viewBoxH * scale) / 2`. Emit `<g transform="translate(${x + offsetX} ${y + offsetY}) scale(${scale})">`.
**Rationale**: Some provider SVGs use non-square viewBoxes (e.g. OpenCode-GO is `0 0 24 30`). The previous `Math.min(w, h)` approach scaled by the shorter axis, so the longer axis overflowed the slot and the silhouette was clipped at the bottom (user reported "O" reading as "ん"). Preserving aspect ratio with `min(scaleX, scaleY)` guarantees the whole silhouette fits; centering avoids lopsided rendering.
**Alternatives considered**:
- `Math.max(w, h)` for scale — rejected: under-fills the slot for non-square icons; wastes space.
- Non-uniform scale (`scaleX != scaleY`) — rejected: distorts the silhouette.
- Crop-to-slot (let it overflow) — rejected: clips the icon, the reported bug.

## Risks / Trade-offs

- **[Fetch failure for `providerIconUrl`]** Network/filesystem hiccup or malformed SVG. → Mitigation: cache the last successfully fetched SVG per URL; on failure, fall through to the stroked-circle fallback using the resolved color. `renderTrayBarsIcon()` never throws.
- **[Provider SVG with explicit non-brand colors]** Some provider SVGs may hardcode a secondary color (e.g. `fill="#FF0000"` on a multi-color logo). → Mitigation: the rewriter only matches `currentColor` and the provider's own `brandColor` literal (case-insensitive, regex-escaped); other colors are left untouched. Multi-color provider icons retain their intent.
- **[Inline SVG `id` collisions]** Inlined provider SVGs may carry `id` attributes that collide with the outer SVG (e.g. duplicate gradient ids). → Mitigation: prefix or strip local `id`s during rewriting (regex-replace `id="..."` and `url(#...)` references). Covered by a unit test.
- **[Non-square viewBoxes]** Some providers ship non-square SVGs (e.g. OpenCode-GO `0 0 24 30`). → Mitigation: aspect-ratio-preserving scale via `min(scaleX, scaleY)` with centering offset (Decision 8).
- **[Cache grows unbounded across provider swaps]** Users enabling/disabling many providers over time. → Mitigation: cache stores one entry per unique URL; provider icon URLs are a small finite set per release. No eviction needed in practice; revisit if a leak is observed.
- **[Canvas tainting from cross-origin fetch]** Provider icons are bundled app resources (`tauri://localhost/...`), same-origin. → Not a real risk; included for completeness.

## Migration Plan

- Pure additive frontend change; no data migration, no IPC changes.
- Rollback: revert the two files (`src/lib/tray-bars-icon.ts`, `src/hooks/app/use-tray-icon.ts`) plus their tests; no other source files are touched.
- The cache is in-memory only; no persistence concerns on rollback.

## Open Questions

- Should the `percentText` `<text>` element (shown beside the icon in `provider` mode when `supportsNativeTrayTitle` is false) also adopt the resolved color, or switch to template-native title rendering on platforms that support it? It is the only remaining `fill="black"` literal in `makeTrayBarsSvg()`; deferred to a follow-up to keep this change focused on the silhouette/chart legibility bug.
- Long-term: should the tray icon also react to OS-level theme changes (e.g. KDE switching light↔dark while the app's `themeMode` stays on "system")? `useDarkMode` already observes this where applicable; out of scope for this change beyond what the hook provides.
- Should `tray-bars-icon.ts` (517 LOC after this change) be split? It is now over the AGENTS.md < 400 LOC guideline. Candidate extraction: `inlineProviderSvg` + `concreteTrayColor` + the SVG-layout helpers into `tray-provider-icon.ts` or a new `tray-svg-layout.ts`. Out of scope for this change; tracked as a refactor candidate.
