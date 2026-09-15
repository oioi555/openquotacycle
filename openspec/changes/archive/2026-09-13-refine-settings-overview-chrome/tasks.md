## 1. Settings chrome

- [x] 1.1 Restyle Settings sections so each title sits outside a `ui-card` / `ui-list` (no `ui-card-bordered`) and drop Auto Refresh / Usage Mode / Reset Timers / App Theme / Start on Login subtitles; verify `settings.test.ts` plus a new assertion that those witty subtitles are absent and Reset Timers still shows `5h 12m`
- [x] 1.2 Replace Start on Login Checkbox with a Switch inside the titled card and verify the control is `role=switch`, not `checkbox`
- [x] 1.3 Align Global Shortcut to the same title-outside-card heading (keep Wayland info + Escape hint) and verify the `text-lg` title is gone
- [x] 1.4 Match Settings titles to dashboard/Auto-start `h2 text-sm font-semibold` (not uppercase labels) and fill Start on Login like Auto-start (description + switch); verify headings are `h2` without `uppercase` and the card contains `Starts when you sign in.`
- [x] 1.5 Paint selected Settings segmented options with the switch on fill and white lettering (`bg-meter-fill text-white`, not `bg-primary`) and verify selected radios share that fill with a checked Start on Login switch
- [x] 1.6 Keep dark-theme `--meter-fill` on the original `#00e676` × `--muted-foreground` mix (revert the darker background mix); verify `ui.test.ts` pins that mix in both themes
- [x] 1.7 Replace Settings segmented chips with OpenQuota-style grouped rows (`ui-list` + compact end menus / switch / shortcut recorder); verify no `role=radio`, menus show current values, Start on Login is a row switch, and witty subtitles stay gone
- [x] 1.8 Change the Settings top-bar action from Refresh to Reset settings (same reset icon as Customize) and restore that screen's preference defaults; verify `settings-controller.test.ts` plus smoke that Settings shows Reset settings, not Refresh
- [x] 1.9 Offer Auto Refresh as 5 min and 15 min only, default 5; stored 30/60 fall back to 5; verify `settings.test.ts` menu items, `settings.test.ts` load fallback, and probe/controller defaults
- [x] 1.10 Add a Window Starter nav-row on Settings (same subtitle as Timeline) and apply `ui-pressable` to nav-rows plus compact outline chips; verify Settings/Timeline/Customize rows, Record Shortcut, Settings menus, runner menu, and Options trigger lift, while Switch and Settings lists do not

## 2. Overview meter and Peak

- [x] 2.1 Change dashboard `Progress` to `h-[4px]`, min-width `4px`, pace tick `h-[12px]` with `top: -4px`; match skeleton; verify `ui.test.ts` pins those sizes and Timeline row track stays `h-[2px]`
- [x] 2.2 Map `danger` status chips to `text-meter-critical` and verify `provider-card.test.ts` Peak chip uses that class, not `text-red-500`

## 3. Card expand and hover lift

- [x] 3.1 Make expandable provider `ui-card` click toggle expand (skip `button, a, [role='switch']`; no handler when there is no On-Demand content) and verify body click expands, chevron still shows, nested reading/reset/link clicks do not toggle, header click does not toggle
- [x] 3.2 Add `@utility ui-pressable` (1px lift + shadow, `motion-reduce:transform-none`) to Button (except `link`), used/left, reset chip, nav-rows, and compact outline chips; verify those classes land and Switch / Settings `ui-list` do not get the utility
- [x] 3.3 Move hover lift and background tint onto the provider `ui-card` body; drop independent `ui-pressable` from the expand chevron so a thin strip does not tint; verify the card has `ui-pressable` and `hover:bg-card-hover` and the expand control does not

## 4. Finish

- [x] 4.1 Run `bun vitest --run src/svelte/pages/settings.test.ts src/svelte/pages/timeline.test.ts src/svelte/pages/customize.test.ts src/svelte/pages/customize-provider.test.ts src/svelte/components/options-menu.test.ts src/svelte/components/ui/ui.test.ts src/svelte/components/provider-card.test.ts src/svelte/components/metric-line-progress.test.ts` and `bunx svelte-check --threshold error` and `openspec validate refine-settings-overview-chrome --strict` all green
