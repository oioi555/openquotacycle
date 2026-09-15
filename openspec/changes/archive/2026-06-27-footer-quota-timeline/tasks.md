## 1. Axis + data helpers (pure functions + tests)

- [x] 1.1 Create `src/lib/quota-timeline/select.ts`: given a provider's `PluginState`, return the representative `MetricLine.Progress` (first progress line that exposes `resetsAt`) or `null` when no such line exists.
- [x] 1.2 Create `src/lib/quota-timeline/axis.ts`: pure helpers — `axisOffsetPercent(tMs, nowMs)` (clamped 0..100 over a 12h span), `windowRangeMs(line)` → `{ startMs, endMs } | null` (null when `periodDurationMs` absent), `isOverflow(resetsAtMs, nowMs)` (true when `resetsAtMs − nowMs > 12h`), `formatLocalHHMM(iso)` → local wall-clock label. All math in ms; no timezone libraries.
- [x] 1.3 Add unit tests for selectors and axis math covering: representative-line selection (no progress line / first wins / first-with-`resetsAt` wins / multiple `resetsAt`), axis offset clamping at both ends, window-range math, overflow detection, pre-now window clipping, `HH:MM` formatting in local time.

## 2. Timeline component

- [x] 2.1 Create `src/components/quota-reset-timeline/quota-reset-timeline.tsx`: container that takes `plugins: PluginDisplayState[]` (Overview card order), subscribes to `useNowTicker`, builds rows via the selectors, and renders the empty-state message when no row has data. *(Props simplified from the original `pluginStates` + `pluginsMeta` plan: OverviewPage already receives `PluginDisplayState[]` with order guaranteed by `useAppPluginViews`, so a single prop covers both.)*
- [x] 2.2 Create `src/components/quota-reset-timeline/timeline-row.tsx`: one provider row; renders the provider icon + name on the left, the axis track in the middle, and an HH:MM gutter on the right (see section 7); consumes the row-level selectors; renders the muted placeholder row when the provider has no `resetsAt`.
- [x] 2.3 Create `src/components/quota-reset-timeline/window-block.tsx`: absolutely-positioned block for the `periodDurationMs` window. *(Later deleted in section 6 — the filled-block concept was removed.)*
- [x] 2.4 Create `src/components/quota-reset-timeline/reset-marker.tsx`: marker at `resetsAt` with `HH:MM` label; renders an overflow arrow at the right edge when `resetsAt` is beyond `now + 12h`; exposes a hover/focus tooltip (provider name + absolute time + "Resets in Xh Ym"). Single visual style (no `variant`); HH:MM always on the right (see section 7).
- [x] 2.5 Create `src/components/quota-reset-timeline/now-line.tsx`: vertical "now" line pinned at offset 0%.

## 3. Wire into `OverviewPage`

- [x] 3.1 Render `<QuotaResetTimeline />` as the last child of `src/pages/overview.tsx`, below the cards and above the global `PanelFooter`; pass the same `plugins` prop already consumed by the cards. *(File is `src/pages/overview.tsx`, not `src/components/overview-page.tsx` as originally written in this task.)*
- [x] 3.2 Confirm the timeline does NOT render on provider-detail or settings pages — verified structurally: it is mounted only inside `OverviewPage`, which `app-content.tsx` only renders when `activeView === "home"`.

## 4. Polish + accessibility

- [x] 4.1 Add hour tick marks on the axis (every 2h) with `HH` labels along the top via `src/components/quota-reset-timeline/hour-ticks.tsx`; hide the labels below a 280px container-width threshold using a Tailwind v4 `@container` query on the timeline section. Hour anchors are absolute (next top-of-hour strictly after `now`, then every 2h), not relative.
- [x] 4.2 Make the reset marker keyboard-focusable (`tabindex={0}`) and ensure the tooltip announces both absolute time and remaining time (via `aria-label` plus `TooltipContent`).
- [x] 4.3 *(Superseded by section 7.)* Originally tinted markers with `brandColor`; that made dark brand colors disappear on dark themes. Markers now use the foreground theme token.
- [x] 4.4 Verify row order matches the Overview cards exactly — rows come from the same `plugins: PluginDisplayState[]` prop the cards consume, so order is identical across filter/sort states by construction.

## 5. Verification

- [x] 5.1 Run `pnpm test`, `tsc --noEmit`. No `pnpm lint` script exists in this repo — type-level strictness is enforced via `tsconfig.json` `strict: true` + `noUnusedLocals` + `noUnusedParameters`. Final counts: 1099 tests pass, tsc clean.
- [x] 5.2 Manually verify on the Overview page with ≥3 active plugins: clustering visible, "now" line advances each tick, overflow indicators appear for far-future resets, HH:MM labels readable on both light and dark themes. *(Confirmed by user across the iteration rounds in this session; final state acknowledged OK.)*
- [x] 5.3 Grep new files for `invoke(` and `listen(` — confirmed no new Tauri command or event subscription was introduced (zero matches under `src/components/quota-reset-timeline/` and `src/lib/quota-timeline/`).
- [x] 5.4 Run `openspec validate footer-quota-timeline --strict` and resolve any reported issues.

## 6. Iteration: next + next-next resets per row (design revision)

*Driven by user feedback clarifying the real intent: visualize how a rolling 5h cadence drifts across days. The earlier "FiveHourLine" reference line and the filled "window block" were both misunderstandings and have been removed.*

- [x] 6.1 Add `computeUpcomingResets(resetsAtIso, periodDurationMs, nowMs)` and `MAX_RESETS_PER_ROW = 2` to `src/lib/quota-timeline/axis.ts`. Returns up to two `{ ms, iso }` upcoming-reset instants in-axis, skipping past instants by stepping `periodDurationMs`. Unit-tested in `axis.test.ts` (+10 cases: parse failure, non-finite now, no-period variants, in-axis pair, MAX cap, overflow clip, past-skipping, ISO round-trip).
- [x] 6.2 Delete `src/components/quota-reset-timeline/five-hour-line.tsx` and remove all imports/references. The generic `now + 5h` reference line is gone — the per-provider next + next-next markers fully replace it.
- [x] 6.3 Rewrite `timeline-row.tsx` to consume `computeUpcomingResets`. Three-step fallback: (a) in-axis resets → map; (b) `resetsAt` present but no in-axis reset → single overflow `ResetMarker` (chevron signals "exists, off-screen"); (c) no `resetsAt` → muted "no reset data" placeholder.
- [x] 6.4 *(Superseded by section 7.)* `ResetMarker` briefly had a `variant: primary | secondary` with flipped label sides; reverted to a single style because the flip caused worse collisions on narrow windows.
- [x] 6.5 Remove the window-block concept entirely. The earlier filled block (Decision 4 in `design.md`) competed visually with markers and disappeared on dark themes; markers are now the sole focal point.

## 7. Iteration: label-side, three-column layout, no section padding

*User feedback: previous "secondary label on the left" choice caused HH:MM labels from neighboring markers to collide when the window was narrowed. Also: section padding misaligned the timeline with the cards above; the user runs the window narrow, so every inset is costly.*

- [x] 7.1 Drop the `variant` prop from `ResetMarker`. Both markers now share one style: solid 2px foreground line, HH:MM label on the RIGHT, font-semibold. The short-period overlap risk is explicitly accepted (Decision 5).
- [x] 7.2 Restructure `timeline-row.tsx` into a three-column flex: `[ icon + name (w-32) | axis track (flex-1) | HH:MM gutter (w-12 shrink-0) ]`. The gutter is empty; it reserves room for a right-edge marker's HH:MM to extend without clipping.
- [x] 7.3 Apply the same three-column structure to `hour-ticks.tsx` (same `w-32` spacer, same `w-12` gutter, same outer `gap-2`) so the hour scale and the per-row tracks share identical horizontal start/end.
- [x] 7.4 Remove the section's left/right padding in `quota-reset-timeline.tsx` (`px-4` → `px-0`, `py-2.5` kept) so the timeline aligns flush with `ProviderCard` content above.

## 8. Iteration: dark-theme icon legibility

*User feedback: provider icons with dark `brandColor` (Z.ai, OpenCode-GO) disappear against the dark theme background in the timeline row. `SideNav` already solved this with CSS mask + `getIconColor`; reuse it.*

- [x] 8.1 Hoist `getIconColor(brandColor, isDark)` from `src/components/side-nav.tsx` to `src/lib/color.ts` (alongside the existing `getRelativeLuminance`). Unit tests added in `color.test.ts` (+5 cases).
- [x] 8.2 Update `side-nav.tsx` to import the shared `getIconColor` (delete the local copy). No behavior change.
- [x] 8.3 In `timeline-row.tsx`, replace `<img src={meta.iconUrl}>` with a `<span>` using CSS `maskImage: url(meta.iconUrl)` + `backgroundColor: getIconColor(meta.brandColor, isDark)`. Same technique as `SideNav`.
- [x] 8.4 In `quota-reset-timeline.tsx`, read `isDark` once via `useDarkMode()` and pass it to each `TimelineRow` (avoids one subscription per row).
- [x] 8.5 Verify `tsc --noEmit` (clean) and `vitest run` (1099 pass).

## 9. Final spec/design reconciliation

- [x] 9.1 Refresh `spec.md` to match the final implementation: removed the primary/secondary distinction; added the three-column Layout requirement; added the dark-theme icon legibility requirement; recorded the accepted short-period label overlap as an explicit scenario.
- [x] 9.2 Refresh `design.md`: re-numbered Decisions 1–10 (fixed the duplicate "Decision 5" from an earlier edit); added Decision 5 (single style, HH:MM right), Decision 6 (three-column layout), Decision 7 (dark-theme icon via CSS mask + `getIconColor`); updated Risks and Open Questions; added the tray-icon separate-change note to Open Questions.
- [x] 9.3 Run `openspec validate footer-quota-timeline --strict` (passes).
