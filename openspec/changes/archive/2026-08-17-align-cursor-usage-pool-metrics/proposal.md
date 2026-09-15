# Feature: Align Cursor usage metrics with official pool names

## Summary

Align Cursor support with the official dashboard by replacing Tuxmeter's
aggregate `Total usage` metric with the monthly `Cursor Models` and `Other
Models` pools, while including the completed Linux Cursor authentication-path
correction in the same tracked change.

## Motivation

Cursor's current dashboard presents two independent included-usage pools:
`Cursor Models` (Cursor Grok and Composer) and `Other Models` (third-party
models). Tuxmeter currently exposes the same API fields as `Auto usage` and
`API usage`, while also showing `Total usage`, which is not a dashboard pool
and can be misleading because the pool percentages use different limits.

Both pools are monthly quotas. Their reset boundary is Cursor's billing-cycle
end, not a session or weekly reset. The provider must retain that distinction
in the metric reset metadata so the UI's quota timeline and reset display do
not imply the wrong period.

Cursor Desktop also stores credentials in platform-specific locations. Linux
uses `~/.config/Cursor/User/globalStorage/state.vscdb`, while macOS uses the
existing Library path. The already-completed Linux path correction and removal
of the misleading `agent login` hint need to be represented in this Change so
the implementation and its tests remain traceable.

The terminology prevents users from reconciling Tuxmeter with the official
Cursor usage page, and the aggregate metric is not actionable for deciding
which pool remains available.

## Proposed Solution

- Remove `Total usage` from Cursor runtime output and its plugin manifest.
- Rename `Auto usage` to `Cursor Models` and map it to Cursor's existing
  `planUsage.autoPercentUsed` field.
- Rename `API usage` to `Other Models` and map it to Cursor's existing
  `planUsage.apiPercentUsed` field.
- Expose both pool metrics in the overview scope as monthly quotas. Use
  `billingCycleStart` and `billingCycleEnd` for reset metadata and preserve
  the reported percentages without treating either pool as a session or
  weekly quota.
- Read Cursor Desktop state from the Linux or macOS platform path, persist
  refreshed tokens to the source they came from, and direct missing-auth users
  to the Cursor app rather than an unrelated CLI.
- Keep Credits, request-based usage, and On-demand behavior unchanged unless
  required to remove aggregate-only code paths.
- Update Cursor tests, provider documentation, the supported-provider summary,
  and authentication-path documentation to use the official terminology and
  monthly semantics.

## Capabilities

- `cursor-usage-pools`

## Alternatives Considered

- Keep `Total usage` and merely rename the two detail rows. Rejected because
  the aggregate percentage is not one of Cursor's displayed pools and makes
  comparison with the official page harder.
- Recompute a total from the two pool percentages. Rejected because the pools
  have independent limits and their percentages cannot be safely added.
- Rename only the UI labels while leaving manifest/runtime labels unchanged.
  Rejected because runtime output, overview filtering, local API consumers, and
  documentation would remain inconsistent.
- Treat the two pools as generic short-window quotas. Rejected because Cursor
  defines both included pools as monthly plan allowances and the reset display
  would be wrong.

## Impact

- [x] Breaking changes: `Total usage` is removed and existing Cursor metric
  labels change in runtime output and the local usage API.
- [x] Platform behavior: Linux Cursor Desktop authentication is included and
  must remain covered by tests.
- [ ] Database migrations
- [ ] API changes
