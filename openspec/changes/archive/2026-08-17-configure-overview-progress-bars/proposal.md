# Feature: Configure Overview progress-bar visibility

## Why

Overview cards currently show every provider progress bar so monthly quotas can
be visible alongside the primary quota. As providers add more quotas, the cards
become unnecessarily tall and users need a per-provider way to hide bars that
are not useful at a glance.

## What Changes

- Add per-provider Overview progress-bar visibility controls to Settings.
- Keep the first progress bar for each provider always visible.
- Let users check or uncheck additional progress bars independently.
- Persist the choices and apply them immediately to Overview cards.
- Preserve the current all-bars display for existing users until they opt out
  of individual optional bars.
- Keep the per-provider Overview controls collapsed by default so Settings stays
  readable when providers expose many metrics.
- Let users hide a provider's text-based statistics block, such as Codex's
  Today, Yesterday, and Last 30 Days rows.
- Leave provider detail and system-tray progress behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `overview-metrics`: allow users to control optional Overview progress-line and
  text-statistics visibility while retaining one mandatory progress line per
  provider.

## Impact

- Frontend settings controls, persisted plugin preferences, Overview filtering,
  and related unit/component tests.
- Existing plugin metric manifests and runtime output remain unchanged.
- No new dependencies, Tauri commands, IPC fields, or plugin API changes.
