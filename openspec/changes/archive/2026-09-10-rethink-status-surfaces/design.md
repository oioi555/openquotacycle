## Context

See proposal.md Why. Today every plugin status is `type: "badge"`. Host policy always shows badges, so they cannot go On Demand. Customize splits progress (Always/On Demand + DnD) from text (Statistics, switch only). Header is name + 11px plan left, reload + 16px mark right.

## Goals / Non-Goals

**Goals:**
- METRIC / STATUS / NOTICE only.
- One Customize list for progress and text.
- Extra Usage omit-when-disabled; when present, a classifiable metric.
- Mock is a 3-channel fixture.

**Non-Goals:**
- Copy OpenQuota StatusMetric pills in the card body.
- Frontend copy of the Singapore schedule.
- Renaming Extra labels across providers.
- Window Starter / cost aggregation.

## Decisions

- **`PluginOutput.statuses: { text, tone }[]` + `error?: string`.** Status is not a metric. Probe failure is `error`, not `{ type: badge, label: Error }`. Alternative: `badge.placement = "header"` — rejected; it keeps badge as a metric type.
- **Tones `positive | warning | danger | neutral`.** Header chrome is host-owned. Peak Hours: Peak → `danger`, Off-Peak → `positive`. Grok stale → `warning` text `Stale`.
- **Empty `lines` is success.** Runtime no longer invents `no lines returned`. Z.ai with no quota still emits Peak Hours in `statuses`.
- **NOTICE = throw and host stale-while-revalidate.** `staleError` renders as `ui-notice` (same recipe as PluginError). No `notices[]` array in this change.
- **Customize: kill Statistics.** `getOverviewProgressBarOptions` includes text. `overviewLineOrder` stores progress+text labels. STATUS/NOTICE never appear in Customize.
- **Extra Usage when present = unmarked text** (On Demand). Grok cap>0 emits `ctx.line.text({ label: "Extra Usage", value: "N cap" })`. Cap 0/missing: omit.
- **Kill `ctx.line.badge`.** Add `ctx.status.chip({ text, tone })`.
- **Mock:** Session + Weekly progress (default visible), Extra Usage text (On Demand), one status chip, throw on odd minutes. Name `Mock`.

## Risks / Trade-offs

- [Risk] Empty lines + only statuses used to trip `no lines returned` → Mitigation: empty lines are valid; statuses are independent.
- [Risk] Header chips crowd the plan → Mitigation: compact 11px tone text; no outline Badge.
- [Risk] Existing installs stored Extra Usage as always-visible badge → Mitigation: Grok Extra becomes a new text label in the unified list; unmarked defaults to On Demand.
- [Risk] OpenCode tests pin Status badges → Mitigation: same task as throw; assert the thrown string.

## Migration Plan

Host parses optional `statuses` (default `[]`) and `error`. Plugins ship together. Rollback = revert. Stored Customize sets keep working; Statistics rows move into the same visible set they already used.

## Open Questions

None for this pass.
