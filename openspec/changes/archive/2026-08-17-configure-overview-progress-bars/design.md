## Context

See `proposal.md` for the motivation and user-visible scope. The current
Overview passes `scopeFilter="all"` to `ProviderCard`, so progress lines from
all manifest scopes are rendered. The Settings page already edits the
persisted `PluginSettings` object, whose `order` and `disabled` fields are
loaded and saved together. `PluginMeta.lines` provides stable provider order,
line labels, and line types; runtime `MetricLine` values use the same labels.

## Goals / Non-Goals

**Goals:**

- Add a per-provider, persisted visibility choice for optional Overview
  progress lines.
- Add a provider-level visibility choice for text-based Overview statistics.
- Keep the first declared progress line visible and retain the current
  all-visible default for existing settings.
- Keep Overview loading skeletons, runtime filtering, and settings controls in
  agreement.
- Keep the Settings page compact by collapsing metric choices by default.
- Keep the selection scoped to Overview and avoid changing plugin output.

**Non-Goals:**

- No changes to plugin manifests, probe output, metric labels, or plugin API.
- No changes to provider detail rendering or `primaryCandidates`/tray bars.
- No new dependency, Tauri command, IPC field, or separate settings file.
- No user-configurable ordering of progress lines.

## Decisions

### D1. Store hidden optional labels inside plugin settings

Extend `PluginSettings` with the existing provider-id keyed map of hidden
Overview progress labels and a provider-id list of hidden text statistics,
`hiddenOverviewStatistics: string[]`. An absent statistics list is equivalent
to the current behavior: statistics remain visible. Save both values together
with `order` and `disabled` through the existing plugin-settings persistence
path.

During normalization, discard unknown provider IDs and labels that are no
longer declared as progress lines, and remove the first progress label from
the hidden list. This keeps stale settings harmless and enforces the mandatory
bar rule. Labels are used because runtime lines already match manifest lines by
label; no plugin-schema ID migration is justified for this feature.

An alternative was a separate settings key containing the complete selected
list. It would require a second persistence lifecycle and would make newly
added metrics unexpectedly hidden, so it is rejected.

### D2. Define the mandatory bar from manifest order

For each provider, the first `type: "progress"` line in `PluginMeta.lines` is
the mandatory item. Settings exposes it as checked and disabled. All later
progress lines are optional. This uses the same declaration order available to
the loading skeleton and avoids choosing a different mandatory bar while data
is still loading.

If the mandatory line is absent from runtime output after loading, rendering
falls back to the first available runtime progress line in manifest/runtime
order. This preserves the requirement that a provider with progress data has
one visible bar without changing the stored optional selections.

### D3. Keep compact selection controls in Settings

Extend the existing settings plugin view model with the provider's progress
line choices and whether it has text statistics. Render a collapsed Overview
display disclosure for each provider in the Plugins section. The disclosure is
closed by default and expands to show the mandatory row, optional bar rows, and
one Statistics checkbox when applicable. The mandatory row uses the existing
checkbox visual in a non-disableable state; optional rows call dedicated
visibility actions. Clicks on a metric control must not toggle or reorder the
parent plugin row.

The action updates the app plugin store immediately and saves the complete
`PluginSettings` object. It does not restart probes or schedule a tray update,
because the choice only affects already available Overview rendering.

### D4. Apply filtering to selected Overview metric types

Pass the hidden-label map (or the provider's derived hidden labels) from the
app composition into `OverviewPage` and then `ProviderCard`. `ProviderCard`
continues to use `scopeFilter="all"`; an additional filter removes only
optional progress lines whose labels are hidden and removes text lines when the
provider statistics setting is hidden. Badge lines remain unchanged. The same
filtering applies to loading skeleton rows so a card does not show metrics that
will disappear when loading completes.

`ProviderDetailPage` does not pass Overview visibility settings, so its
existing all-lines behavior is preserved. Tray rendering continues to use
`primaryCandidates` independently.

### D5. Preserve legacy and newly added metrics

An absent `hiddenOverviewProgressLines` field loads as an empty map. Optional
progress lines and statistics are therefore initially visible for existing
installations. A new manifest progress line is also visible unless the user
disables it later. A new text line remains visible unless the provider's
statistics block is hidden.
Unknown runtime progress labels remain visible because the settings UI cannot
offer a safe choice for an undeclared line; they do not affect the mandatory
line calculation.

## Risks / Trade-offs

- **Metric labels change** -> The old hidden label no longer matches and the
  renamed line becomes visible by default; this is safer than hiding a new
  metric accidentally.
- **Duplicate labels in one provider** -> The existing runtime/manifest
  matching model is label-based, so duplicate labels share one visibility
  choice. Plugin manifests are expected to use unique display labels.
- **Provider exposes a new optional line** -> It increases card height once,
  but the line is visible by default to preserve the current all-metrics
  behavior and can then be unchecked in Settings.
- **Settings persistence fails** -> Keep the immediate in-memory change and log
  the save error using the existing settings-action error handling; the next
  successful save or restart reloads the last persisted value.
- **Many provider choices increase Settings height** -> Keep the controls
  compact, collapsed by default, and grouped under the existing provider rows
  rather than adding a new top-level page.
- **Statistics contain provider-specific text** -> Treat all declared `text`
  lines as one provider statistics block; this gives Codex a useful single
  switch without adding one checkbox per date range.

## Migration Plan

1. Extend plugin settings parsing, normalization, equality, and tests with the
   hidden progress-label map and hidden statistics provider list.
2. Add collapsed settings controls, view-model fields, callbacks, and
   persistence action tests.
3. Thread the visibility state into Overview and filter progress/text lines and
   skeletons, with detail/tray regression tests.
4. Run focused settings/Overview tests, the full frontend test suite, and the
   TypeScript/build checks.

Existing settings files require no explicit migration: a missing map is treated
as empty. Rollback can remove the new filtering and controls; the extra stored
field is ignored by older builds.

## Open Questions

None. The control location, mandatory-bar rule, default, persistence shape, and
view boundaries are resolved by the proposal and specification.
