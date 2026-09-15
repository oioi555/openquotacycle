## Context

See proposal.md Why. Current state: manifest `lines[]` carries `primaryOrder` (Rust-validated, sorted into `primaryCandidates`); overview defaults are implicit (missing keys = manifest order + all visible); `handleOverviewDisplayReset` deletes stored keys; tray renders provider/bars/donut via `getTrayPrimaryBars` + `menubarIconStyle` setting.

## Goals / Non-Goals

**Goals:**
- Explicit manifest defaults with validation, honored by overview classification, Customize L2, and display reset.
- Tray reduced to static app icon + text tooltip; all dynamic icon code and settings deleted.

**Non-Goals:**
- Completing the broader navigation and visual redesigns in `align-ui-with-openusage-v07` or `align-visual-with-openquota`.
- Redesigning the tooltip content beyond plain text.

## Decisions

- **Key shape `visibleByDefault: true`** (per-line mark): expresses shown directly on the kept bars; everything unmarked is On Demand. Rejected alternative: manifest-level `defaultVisible: [...]` list — equivalent expressiveness, but per-line marks sit next to the line they describe.
- **Reset restores declared defaults**: `handleOverviewDisplayReset` removes the provider's explicit visibility and order overrides so resolution returns to manifest order and marks for both progress and text lines. It does not force all lines or statistics visible.
- **Defaults flow through existing functions**: settings resolution uses explicit visible sets (absent = manifest marks); `settingsPlugins`/`pluginViews` pass them through. Text lines use the same per-line classification as progress lines. Legacy hidden-line and hidden-statistics preferences migrate into explicit visible sets to preserve user choices.
- **Hard delete for tray**: remove `tray-primary-progress.ts`, icon render modules, `menubarIconStyle` (setting, Settings UI, migration ignores stale value), `primaryOrder` (all manifests + Rust validation/tests), `primaryCandidates` DTO. No deprecation shim — internal UI surface only.
- **Fixed icon is the full-color app icon**: the tray installs `icons/icon.png` once (macOS keeps a single `setIconAsTemplate` mask call). An interim light/dark variant swap was rejected: template-derived monochrome recoloring depends on the panel color and was the recurring breakage source; the full-color icon is legible on both panel styles and needs no theme tracking (`isDark` never enters tray inputs).
- **Tooltip keeps plain text**: `formatTrayTooltip` currently consumes `getTrayPrimaryBars` output; rework it to summarize from plugin states directly (names + primary fractions by manifest order, first progress line fallback).

## Risks / Trade-offs

- [Risk] Stored overrides silently beat new manifest defaults for existing users → Mitigation: intended (user choice wins); reset exposes defaults. [Risk] Deleting `menubarIconStyle` orphans the Settings UI section → Mitigation: remove UI + ignore stale key in migration, covered by settings-migration tests.
- [Risk] Tooltip rewrite changes tooltip text → Mitigation: pin exact strings in tray-controller tests before/after.

## Migration Plan

- Migrate legacy hidden-line and hidden-statistics preferences into explicit visible sets. With no stored preference, use manifest marks. Invalid marks or marks on unsupported line types warn without rejecting the plugin. Stale `menubarIconStyle` values are ignored.
- Rollback = revert change.

## Open Questions

- None. Bundled manifest marks define initial visibility; unmarked progress and text lines are On-Demand.
