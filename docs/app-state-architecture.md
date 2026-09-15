# App State Architecture

Svelte 5 runes controllers in `src/svelte/controllers/`. `App.svelte` bootstraps and wires them.

## Source of truth

- `appUiController`: screen stack (Overview / Timeline / Settings, nested Customize)
- `appPluginController`: plugin metadata + persisted plugin settings
- `appPreferencesController`: theme, display mode, leftover band, notify, shortcut
- `probeController`: probe results and auto-refresh
- `windowStarterRunner`: Window Starter history and locks

## Derived

- `pluginViews.displayPlugins`: enabled plugins in settings order, merged with probe state
- Window Starter cards: live quota + CLI discovery + attempt history
- Leftover notify: crossing-go edge detector on a 30s ticker

## Data flow

1. `App.svelte` bootstraps settings, tray, Window Starter, credential wake, leftover notify.
2. Probe results update plugin state and schedule tray + confirmation + wake.
3. Pages (`overview.svelte`, `timeline.svelte`, `settings.svelte`) read controllers and render.

## Guardrails

- Keep source state in controllers, not duplicated in page `$state`.
- Keep derivations colocated with the domain (`plugin-views`, leftover-notify).
- Do not mirror derived values into a second store.
