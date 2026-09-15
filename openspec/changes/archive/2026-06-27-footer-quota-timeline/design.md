## Context

- `OverviewPage` renders one `ProviderCard` per active plugin; cards already display per-line reset text ("Resets in Xh Ym") and per-line 5h progress bars.
- Probe state lives in `useProbeState` (`src/hooks/app/use-probe-state.ts`, React `useState`), passed down via props to `OverviewPage`. `useNowTicker` (`src/hooks/use-now-ticker.ts`) already ticks once per second to drive the cards' live reset tooltips.
- `MetricLine.Progress` (`src/lib/plugin-types.ts:8-17`) carries `resetsAt` (ISO 8601) and `periodDurationMs`. Multiple progress lines per provider are possible (e.g. Codex primary + secondary, Antigravity per-model).
- The global `PanelFooter` (`src/components/panel-footer.tsx`) is rendered by `AppShell` below `AppContent`. It is page-agnostic (version + auto-refresh countdown).
- Reusable primitives already in tree: `src/lib/color.ts` (`getRelativeLuminance`), `src/hooks/use-dark-mode.ts`, `src/components/ui/tooltip.tsx` (base-ui Tooltip).
- The user runs the app window at narrow sidebar-style widths, so horizontal padding and decorative insets are penalized more than usual.

## Goals / Non-Goals

**Goals:**
- One-glance answer to "when does each provider reset next, and when after that" — the **next + next-next** pair makes a rolling 5h cadence's daily drift legible and supports planning sleep / wake / work-start.
- Zero new probe / IPC / Rust surface.
- Real-time alignment with the existing per-card reset tooltips (same "now" source).
- Compact footer footprint that aligns flush with the Overview cards above it.
- Dark-theme legibility for both marker lines and provider icons.

**Non-Goals:**
- Detailed `used` / `limit` numerals — the cards already cover that.
- Multi-row-per-provider layout (Codex secondary, Antigravity per-model) — future enhancement.
- Reset-time visualization on provider-detail or settings pages — out of scope.
- Cross-provider aggregation (e.g. "average reset time") — not requested.
- User-configurable span (6h / 12h / 24h) — default 12h for v1.
- System-tray / taskbar icon legibility — separate concern (OS-rendered PNG, not DOM); tracked separately.

## Decisions

### Decision 1: Render inside `OverviewPage`, not inside the global `PanelFooter`
**Choice**: Render the timeline as the last child of `OverviewPage`, above the global `PanelFooter`.
**Rationale**: The timeline is page-specific (Overview-only). Putting it in the shared `PanelFooter` would force a view-conditional branch inside a shell component and couple the shell to probe state it does not need today.
**Alternatives considered**:
- Extend `PanelFooter` with a `children` / `region` slot — rejected: couples the shell to Overview-only data.
- Sticky overlay pinned to viewport bottom — rejected: occludes cards on short screens and fights scroll.

### Decision 2: 12-hour fixed window, "now" pinned at the left edge
**Choice**: Axis = `[now, now + 12h]`; the "now" line is drawn at offset 0 (left edge).
**Rationale**: 12h fits two consecutive 5h windows (the most common provider period), so the next + next-next pair is always visible together. Pinning `now` at the left edge gives the simplest mental model and aligns every row on a shared grid so clustering (multiple providers resetting at the same hour) is visible at a glance.
**Alternatives considered**:
- 24h absolute-time axis (0:00 at left, 24:00 at right) — explored seriously in an earlier round, then rejected: 24h does not fit comfortably on a narrow sidebar-style window, and the user explicitly preferred the 12h relative axis combined with the next + next-next pair to convey the rolling-cadence drift.
- Centered on now (`now − 1h .. now + 11h`) — rejected: extra past band adds noise without value.
- Dynamic span (max reset + padding) — rejected: total width changes per render, markers jitter and clustering breaks.

### Decision 3: One row per provider; up to two upcoming resets per row
**Choice**: Within a provider, the first `MetricLine.Progress` exposing `resetsAt` represents the row. From that line, the row renders up to two reset markers — the **next** reset (`resetsAt`) and the **next-next** reset (`resetsAt + periodDurationMs`) — as long as each lands inside the 12h axis. Past instants are skipped by stepping `periodDurationMs`. Other progress lines with `resetsAt` do not spawn additional rows.
**Rationale**: 5h does not divide 24h evenly, so a provider's reset time slides later each cycle. Showing the next + next-next pair on the same axis makes that drift legible at a glance. Keeping one row per provider preserves positional correlation with the Overview cards.
**Alternatives considered**:
- One marker per row (next only) — rejected: hides the drift, defeats the planning use case.
- One row per progress line — rejected: row count diverges from card count, breaks positional mapping.
- Aggregate to earliest / latest reset per provider — rejected: hides information the user asked to see.
- Three or more upcoming resets — rejected for v1: capped at `MAX_RESETS_PER_ROW = 2`; revisit if short-period users ask.

### Decision 4: No window block; markers only
**Choice**: Do not draw a filled 5h window block. Each row consists of the "now" line plus up to two reset markers. Markers are the unambiguous focal point.
**Rationale**: A filled block competed visually with the markers and read as a "progress bar" — users found it noisy and asked for it to be removed. The reset instants themselves are the information that matters; the window geometry is implicit in the period between two consecutive markers.
**Alternatives considered**:
- Filled window block from `resetsAt − periodDurationMs` to `resetsAt` — rejected: visually competed with markers, reduced contrast on dark themes (brand-color blocks disappeared into the background), and obscured the reset-time focal point.

### Decision 5: Both markers share a single style; HH:MM always on the right
**Choice**: The next and next-next markers are visually identical — solid 2px foreground line, HH:MM label on the RIGHT of the line, font-semibold. There is no `variant` prop.
**Rationale**: An earlier iteration used a primary/secondary split (secondary label flipped to the left) to avoid collision on short-period providers. The user rejected this: on narrow windows, the previous marker's right-side HH:MM collided with the next marker's left-side HH:MM, causing *more* collisions than it solved (the narrow-window case is high-frequency; the 1h-period case is rare). Keeping both labels on the right lets the eye scan a single column of HH:MM without zig-zagging. The residual overlap for 1h-period providers (Z.ai, OpenCode-GO) is explicitly accepted.
**Alternatives considered**:
- Primary/secondary variants with flipped label sides — rejected: caused worse collisions on narrow windows.
- Vertical offset between the two labels — rejected: row height (`h-7` ≈ 28px) is too tight to stack without breaking alignment with the axis line.
- Drop the secondary marker for short-period providers — rejected: that is precisely where the drift visualization matters most.

### Decision 6: Three-column row layout with right-side HH:MM gutter
**Choice**: Each row is a flex row of three columns: `[ icon + name (w-32) | axis track (flex-1) | HH:MM gutter (w-12 shrink-0) ]`. `HourTicks` uses the same three-column structure (same widths, same gap). The timeline `<section>` has `px-0` (no left/right padding).
**Rationale**: The trailing `w-12` (48px) gutter gives an HH:MM label (~30–36px at `text-[11px]`) room to extend past a marker anchored at axis offset 100%, so right-edge resets stay readable. Removing `px-*` from the section aligns the timeline flush with the `ProviderCard` content above it — the user runs the window at narrow sidebar widths, so any inset makes the timeline look detached. Mirroring the three columns in `HourTicks` keeps the hour scale and per-row tracks on the same horizontal grid.
**Alternatives considered**:
- Single flex-1 track with no gutter, HH:MM allowed to overflow — rejected: right-edge HH:MM clipped or spilled into the next UI element.
- Keep section padding to match other pages — rejected: the cards above already sit flush; padding only the timeline makes it look misaligned.

### Decision 7: Dark-theme icon legibility via CSS mask + `getIconColor`
**Choice**: Render provider icons in the row label column via a `<span>` with CSS `maskImage` + `backgroundColor: getIconColor(meta.brandColor, isDark)`, not via `<img>`. `getIconColor` is hoisted to `src/lib/color.ts` (alongside `getRelativeLuminance`) so `SideNav` and `TimelineRow` share one contrast rule. `isDark` is read once via `useDarkMode()` in `QuotaResetTimeline` and passed as a prop.
**Rationale**: Several providers (Z.ai, OpenCode-GO) ship SVG icons with `fill="currentColor"` that resolve to near-black; rendered as `<img>` they disappear on a dark theme. `SideNav` had already solved this with the mask + `getIconColor` technique; reusing it (and hoisting the helper) keeps the two icon surfaces consistent and avoids a per-surface contrast rule drifting over time.
**Alternatives considered**:
- Apply the technique inline in `TimelineRow` only, duplicate the helper — rejected: two copies of the contrast rule will drift.
- Use `<img>` with `filter: invert(1)` in dark mode — rejected: loses brand color for providers that do have a bright brand color.
- Touch only the timeline, leave `SideNav` alone — rejected: the helper should live in one place.

### Decision 8: Reuse `useNowTicker`; do not introduce a new timer
**Choice**: Subscribe the timeline to the existing `useNowTicker` hook (same one used by `ProviderCard` for reset tooltips).
**Rationale**: Avoids tick drift between the cards and the timeline; one source of "now".
**Alternatives considered**:
- New internal `setInterval` — rejected: drifts from the card tooltips, doubles timer work.

### Decision 9: Clip overflow rather than scroll
**Choice**: Reset instants past `now + 12h` are not drawn; an overflow arrow glyph appears at the row's right edge.
**Rationale**: Fixed span keeps all rows aligned on the same grid; per-row horizontal scroll would destroy clustering.
**Alternatives considered**:
- Per-row horizontal scroll — rejected: destroys alignment, the core value of the view.

### Decision 10: Plain divs, no chart library
**Choice**: Implement with absolutely-positioned divs (offset = `(t − now) / 12h * width %`) inside a flex column.
**Rationale**: Marker geometry is a one-liner; a chart library (Recharts, Visx) would add bundle weight for no gain.
**Alternatives considered**:
- Recharts — rejected: overkill for stacked markers.

## Risks / Trade-offs

- **[Row height inflation with many providers]** 10+ active plugins means 10+ rows. → Mitigation: row height ~28 px (`h-7`), vertical gap minimal; revisit with a "compact" preference if it becomes a problem.
- **[Short-period HH:MM overlap is accepted]** 1h-period providers (Z.ai, OpenCode-GO) space consecutive resets at ~8% axis width, narrower than an HH:MM label, so the two labels on the right side will visually overlap. → Accepted per explicit user instruction: splitting labels left/right caused worse collisions on narrow windows, which is the high-frequency case.
- **[Dark-theme marker legibility]** Initial implementation used the provider's `brandColor` for the marker line; dark brand colors disappeared on the dark background. → Mitigation: markers use the foreground theme token, not the brand color. Provider identity is conveyed by the row's icon + name on the left.
- **[Dark-theme icon legibility]** Provider SVGs with `fill="currentColor"` render near-black and disappear on a dark theme. → Mitigation: render via CSS mask + `getIconColor(brandColor, isDark)` (Decision 7); same technique as `SideNav`.
- **[Plugin emits malformed `resetsAt`]** Rust already validates RFC3339 at probe time (`src-tauri/src/plugin_engine/runtime.rs:321-376`), so by the time data reaches the UI it is parseable. Still, defensive `Date.parse` failure on a row → render the row as a placeholder, never throw.
- **[First-line rule loses Codex secondary window]** Acceptable for v1; tracked as an Open Question.

## Migration Plan

- Pure additive frontend change; no data migration, no IPC changes, no Rust changes.
- Rollback: remove `<QuotaResetTimeline />` from `src/pages/overview.tsx` and delete the `src/components/quota-reset-timeline/` directory; the hoisted `getIconColor` in `src/lib/color.ts` stays (it is now used by `SideNav` too).

## Open Questions

- Should we later support multiple `resetsAt` rows per provider (Codex secondary, Antigravity per-model)? Tracked as a follow-up; out of scope for this change.
- Should the row render a third reset (next-next-next) when the period is short enough that three fit in 12h? Currently capped at 2 by `MAX_RESETS_PER_ROW`; revisit if 1h-period users ask for more lookahead.
- Should the timeline also appear on the provider-detail page as a single-row variant? Out of scope for this change.
- System-tray / taskbar icon legibility on mixed-theme Linux desktops (e.g. Manjaro light theme with a dark panel) is a separate concern — the tray/window icons are OS-rendered PNGs and cannot use the DOM mask technique. Linux desktops do accept SVG icons in general, so a future change could investigate SVG-based icon assets and/or theme-aware icon switching via Tauri's tray icon API. Tracked as a separate change.


---

## Revisions

| 日期 | 类型 | 变更描述 | 原因 | 影响 API |
|------|------|----------|------|----------|
| 2026-06-27 | behavior | Replaced the filled 5h window block and the generic "FiveHourLine" (now+5h) reference line with up to two per-provider reset markers: the provider's NEXT reset (resetsAt) and the next-next reset (resetsAt + periodDurationMs). Primary marker = solid 2px foreground line, HH:MM label on the right. Secondary marker = thin 1px foreground/40 line, HH:MM label flipped to the left to avoid collision on short-period providers (1h-period Z.ai/OpenCode-GO space resets at ~8% axis width). Markers use the foreground theme token (not brandColor) so they stay visible on dark themes. | User feedback over four iterations clarified the real intent: visualize how a rolling 5h cadence drifts across days (5h does not divide 24h evenly). The window block competed visually with the markers and disappeared on dark themes; the FiveHourLine was a misread of the request. The next + next-next pair on a 12h axis (chosen because two 5h windows fit) exposes that drift at a glance and lets the user plan sleep / wake / work-start around the cadence. | - |
