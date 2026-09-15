## Context

See proposal.md Why. Customize L1 top bar previously had no action; L2's top action resets one provider (existing `handleOverviewDisplayReset`). Dialog patterns follow `about-dialog.svelte` (backdrop + Esc + `onClose`).

## Goals / Non-Goals

**Goals:**
- One destructive bulk action, always confirmed, reusing existing dialog/TopBar primitives.

**Non-Goals:**
- Provider-list order reset (list order is untouched; only enablement, visibility, metric order).
- Undo support.

## Decisions

- **Dialog state in `app-ui-controller`** (`showResetAllCustomization` + setter, cleared by `resetState`), mirroring `showAbout`, so shell/tests drive it without prop drilling.
- **TopBar reuse via `refreshIcon: "reset"` + `refreshTitle`**: no new TopBar API beyond what L2 already added; L1 passes a dialog opener as `onRefresh`.
- **Re-probe only newly enabled providers** (same `beginRefresh`/`startBatch` sequence as `handleToggle`), so reset doesn't refetch healthy providers.
- **No-op when nothing to reset**: handler still commits cleared state (cheap, idempotent); probe skipped when nothing was disabled.

## Risks / Trade-offs

- [Risk] Reset enables dev-only Mock plugin too → Mitigation: matches dialog copy ("installed providers back on"); Mock stays dev-bundled and user can disable it again.
