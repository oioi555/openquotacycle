## 1. Header countdown (A案, already landed)

- [x] 1.1 Extract auto-refresh countdown formatting (`4m` / `12s` / `Off`) and unit tests
- [x] 1.2 TopBar: Overview left shows hourglass + `4m` / `Off`, Refresh is icon-only; Window Starter keeps compact face on Refresh; not Reset/sliders
- [x] 1.3 Footer no longer shows the countdown

## 2. Root tabs and back model

- [x] 2.1 `rootTab` / `selectRootTab` / `isRootScreen`; ranks; `backScreen` parents (`customize`→`settings`, `window-starter`→`settings`, `customize:timeline`→`timeline`); Enter no-op on root tabs
- [x] 2.2 Replace footer Options with Overview | Timeline | Settings tabs; tabs stay on nested screens; tapping a tab goes to that root
- [x] 2.3 TopBar: no Back on dashboard / timeline / settings; Timeline right action is sliders → `customize:timeline`

## 3. Destinations

- [x] 3.1 Delete Options menu and Help; About row on Settings opens the existing dialog
- [x] 3.2 Remove Timeline bottom nav-rows and Customize's Settings nav-row; keep Settings → Customize / Window Starter

## 4. Finish

- [x] 4.1 Update smoke, footer, settings, timeline, customize, top-bar, panel-controller, app-ui tests
- [x] 4.2 `bun vitest --run` on touched files, `bunx svelte-check --threshold error`, `openspec validate three-tab-navigation --strict`
