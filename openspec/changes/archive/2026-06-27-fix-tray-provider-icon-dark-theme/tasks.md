## 1. SVG color resolver + fetch/rewrite helpers (pure, with tests)

- [x] 1.1 Add `src/lib/tray-provider-icon.ts` with: `resolveTrayIconColor(brandColor: string | undefined, isDark: boolean): string` (thin wrapper over `getIconColor` returning a concrete color string — `currentColor` is allowed as a sentinel, callers must convert it before emitting XML), and `rewriteCurrentColor(svg: string, color: string): string` that replaces every `currentColor` occurrence (`fill="currentColor"`, `stroke="currentColor"`, inline `style="color: currentColor"`, `style="...color:currentColor..."`, etc.) with the concrete color, leaving other colors untouched.
- [x] 1.2 Add `fetchProviderIconSvg(url: string): Promise<string | null>` that fetches the URL, validates the response is non-empty SVG (starts with `<svg` or `<?xml` after trim), caches the result in an in-memory `Map<url, string>` inside the module, and returns `null` on any failure (network, parse, non-SVG content-type) without throwing.
- [x] 1.3 Add `prefixLocalIds(svg: string, prefix: string): string` that rewrites `id="X"` → `id="${prefix}-X"` and `url(#X)` → `url(#${prefix}-X)"` to avoid collisions when inlining provider SVGs into the outer tray SVG.
- [x] 1.4 Add unit tests (`src/lib/tray-provider-icon.test.ts`) covering: `resolveTrayIconColor` for all four `getIconColor` branches (no brand, dark+low-lum, dark+lum, light+high-lum), `rewriteCurrentColor` for every supported attribute/style form + multi-occurrence + non-currentColor preservation, `fetchProviderIconSvg` happy path (mock `fetch`) + cache hit (single fetch on second call) + failure → null (network error, 404, non-SVG body), `prefixLocalIds` for both `id=`/`url(#)` shapes and the no-id case.

## 2. `tray-bars-icon.ts` adopts theme-aware color

- [x] 2.1 Extend `makeTrayBarsSvg()` and `renderTrayBarsIcon()` signatures with `brandColor?: string` and `isDark: boolean`. Update existing callers internally.
- [x] 2.2 In the `provider` branch, replace the `<image href="${providerIconUrl}" />` embedding with: fetch via `fetchProviderIconSvg(providerIconUrl)`; on success, `rewriteCurrentColor` + `prefixLocalIds` + inline inside `<g transform="translate(x,y) scale(sizePx/origViewBoxSize)">`; on null, fall back to the existing stroked circle using `stroke="${resolveTrayIconColor(...)}"` instead of `stroke="black"`.
- [x] 2.3 Apply the same change to the `donut` branch's provider-icon embedding.
- [x] 2.4 Replace the hardcoded `stroke="black"` on the fallback circles with `stroke="${resolveTrayIconColor(brandColor, isDark)}"` in both branches.
- [x] 2.5 Leave the `bars` branch (`<rect fill="black">` track and fills) untouched — `bars` mode is out of scope.
- [x] 2.6 Add tests in `src/lib/tray-bars-icon.test.ts` asserting: (a) generated SVG for `provider` mode contains the `getIconColor`-resolved color (and no bare `<image href>` on cache miss), (b) `donut` mode likewise, (c) fallback circle stroke matches the resolved color when `providerIconUrl` is absent, (d) `bars` mode SVG is unchanged.

## 3. `use-tray-icon.ts` wires `isDark` and `brandColor`

- [x] 3.1 Call `useDarkMode()` once at the top of `useTrayIcon()`; store `isDark` in a ref synced via `useEffect` (same pattern as the other refs).
- [x] 3.2 Resolve `brandColor` from the already-computed `trayProviderId`'s `PluginMeta` (same lookup that produces `providerIconUrl`); store in a local for the call site.
- [x] 3.3 Pass `brandColor` and `isDarkRef.current` into every `renderTrayBarsIcon()` call (both `provider`, `donut`, and the `bars` no-op — `bars` ignores them but the call signature must match).
- [x] 3.4 Add `isDark` to the dependency array of the `useEffect` at line ~360 that calls `scheduleTrayIconUpdate("settings", 0)`, alongside `activeView` and `menubarIconStyle`.
- [x] 3.5 Update any existing tests for `useTrayIcon` (likely in `src/App.test.tsx`) to pass `isDark` through the `useDarkMode` mock, and add a case asserting that toggling `isDark` triggers `scheduleTrayIconUpdate`.

## 4. Verification

- [x] 4.1 Run `pnpm test` (new + updated tests), `tsc --noEmit` (via `pnpm build` or equivalent), and confirm no new diagnostics in the touched files.
- [x] 4.2 Manual check on Linux with a dark panel: select a low-luminance-brand provider (Z.ai or OpenCode-GO) and confirm the tray icon silhouette is visible; toggle the app theme light↔dark and confirm the tray re-renders within one frame.
- [x] 4.3 Grep touched files for `invoke(` and `listen(` to confirm no new IPC was introduced.
- [x] 4.4 Run `openspec validate fix-tray-provider-icon-dark-theme --strict` and resolve any reported issues.

## 5. Post-implementation fix: brandColor literal in bundled SVG

- [x] 5.1 Extend `rewriteCurrentColor` to also replace `brandColor` literal (case-insensitive), since the Rust bundler rewrites `currentColor → brandColor` before serving the dataURL (manifest.rs:113-118).
- [x] 5.2 Thread `brandColor` through `inlineProviderSvg` so the rewrite reaches inlined provider SVGs.
- [x] 5.5 Revert experimental `setIconAsTemplate(false)` change (no-op on Linux per Tauri source).

## 6. Post-implementation fix: extend color to bars/donut + aspect-ratio scale

User feedback after task 5: in `bars` and `donut` modes the chart shapes (bar tracks/fills, donut ring/arc) still render as `fill="black"`/`stroke="black"`, so they vanish on dark trays. Separately, OpenCode-GO (`viewBox="0 0 24 30"`) was clipped at the bottom because the inliner scaled by `Math.min(w, h)` instead of preserving aspect ratio.

- [x] 6.1 In `tray-bars-icon.ts`, compute `concreteColor` once per `makeTrayBarsSvg` call (reuse the existing `concreteTrayColor(brandColor, isDark)` helper) and replace every `fill="black"` in the `bars` branch (track / fill / remainder shapes) with `fill="${concreteColor}"`.
- [x] 6.2 In the `donut` branch, replace the donut track ring `stroke="black"` and the progress arc `stroke="black"` with `stroke="${concreteColor}"`. The provider icon block and fallback circle in `donut` already use the resolved color.
- [x] 6.3 Update `inlineProviderSvg` to compute the inline scale as `min(targetSize / viewBoxW, targetSize / viewBoxH)` and center the silhouette within the slot via translate offsets on both axes (`offsetX = (targetSize - viewBoxW*scale)/2`, same for Y). Spec requirement "Provider icon preserves aspect ratio and fits inside its slot", Design Decision 8.
- [x] 6.4 Add unit tests asserting: (a) `bars` mode SVG contains the resolved color and zero `fill="black"` literals; (b) `donut` mode chart ring/arc use the resolved color and zero `stroke="black"` literals; (c) `inlineProviderSvg` output for a `viewBox="0 0 24 30"` source fits inside the slot (post-transform coordinates stay within `[0, targetSize]`) and is centered on the x axis; (d) square viewBox (e.g. `0 0 100 100`) regression — scale is `targetSize/100` and no centering offset is applied.
- [x] 6.5 Run `rtk tsc --noEmit` (0 errors) and `rtk vitest run` (all pass, baseline 1139 + new tests).
