## Context

See `proposal.md` for the motivation and user-facing scope. The current Cursor
plugin receives `planUsage.autoPercentUsed`, `planUsage.apiPercentUsed`, and
`planUsage.totalPercentUsed`. It emits the latter as the overview `Total usage`
line and emits the former two as detail lines named `Auto usage` and `API usage`.

Cursor Desktop authentication is stored in `state.vscdb`: Linux uses
`~/.config/Cursor/User/globalStorage/state.vscdb` and macOS uses the existing
`~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` path. The
plugin can fall back to the OS keyring and persists refreshed tokens to their
original source. The Linux path support and the app-only login hint are part of
this Change's implementation contract.

The plugin manifest controls which runtime labels are visible in the overview.
The frontend filters runtime lines by those manifest labels, so the runtime
output and manifest must change together. The same runtime labels are also
returned through Tuxmeter's local usage API.

## Goals / Non-Goals

**Goals:**

- Make the two Cursor pool metrics the canonical Cursor usage display.
- Use the official `Cursor Models` and `Other Models` labels consistently in
  runtime output, overview metadata, tests, documentation, and local API data.
- Preserve Cursor's reported pool percentages and billing-cycle reset metadata
  without introducing a new calculation.
- Preserve the monthly nature of both pools by using the Cursor billing-cycle
  start/end as their reset window.
- Keep Cursor Desktop authentication working on Linux and macOS.
- Remove aggregate-only mapping and fallback assumptions that depend on
  `totalPercentUsed`.

**Non-Goals:**

- No change to Cursor endpoints, token protocol, or request-based fallback
  behavior beyond the platform path selection already required for auth.
- No recomputation of pool usage from exported spend data.
- No compatibility alias for `Total usage`; its removal is intentional and is a
  breaking local API label change.
- No change to Credits, Requests, or On-demand semantics.

## Decisions

### 1. Select platform-specific Cursor auth state

The provider will select the Linux state database for `ctx.app.platform ===
"linux"` and the existing macOS state database for macOS. Keychain lookup
remains a fallback. A refreshed access token is written back to the selected
source, and the no-auth message directs the user to sign in through Cursor.

Alternative rejected: keep only the macOS path or suggest `agent login`.
Neither works for this Linux installation; `agent` can resolve to an unrelated
CLI.

### 2. Reuse Cursor's pool fields directly

`autoPercentUsed` maps to `Cursor Models` and `apiPercentUsed` maps to `Other
Models`. The values remain percentages with a limit of 100 and retain the
existing billing-cycle reset timestamp and duration. When
`billingCycleStart` and `billingCycleEnd` are valid, `periodDurationMs` is the
difference between them and `resetsAt` is the cycle end. This explicitly
represents the monthly plan quota rather than a session or weekly quota. This
matches Cursor's official usage pools and avoids incorrectly adding
percentages that use different allowances.

Alternative rejected: derive a total or distribute `totalPercentUsed` across
the pools. The response does not provide a safe common denominator for that
calculation.

### 3. Remove aggregate mapping, not pool data collection

The runtime mapper will stop emitting `Total usage` and will no longer use
`totalPercentUsed` as the condition for emitting a primary metric. Presence of
at least one valid pool percentage will be the relevant signal for pool data.
Existing authentication and request-based fallback detection remains intact;
only aggregate-specific mapping and checks are removed or replaced with pool
presence checks.

For Team/Enterprise-shaped responses, the dollar aggregate branch is removed.
Valid pool percentages remain the authoritative output, while Credits,
Requests, and On-demand continue through their existing paths.

### 4. Promote both pools to overview metrics

The manifest will declare `Cursor Models` and `Other Models` as overview
progress lines. Credits remains the first primary candidate; the two pools
follow in official order, and Requests remains a later fallback candidate for
request-based accounts. On-demand remains a detail metric.

This is required because the overview renderer uses manifest labels to filter
runtime lines. Renaming only the runtime lines would make them disappear from
the overview.

### 5. Treat label changes as an intentional breaking output change

Tests will assert that the old label is absent and the two official labels are
present. Documentation and the README provider summary will be updated in the
same change. No persisted settings migration is needed because metric labels
are not stored as user configuration; consumers of the local usage API must
adopt the new labels.

## Risks / Trade-offs

- **Existing local API consumers expect `Total usage`** → Document the breaking
  label change and cover the absence of the old label in tests.
- **Older Cursor responses omit one or both pool fields** → Omit only invalid
  pool metrics and retain any valid non-pool output; never invent a pool value
  from `totalPercentUsed`.
- **Cursor's API field names may lag dashboard terminology** → Keep the direct
  field mapping explicit in provider documentation and tests using fixtures that
  match the official dashboard pools.
- **Invalid cycle dates could lose monthly reset metadata** → Preserve the
  existing defensive date parsing; when valid dates exist, assert the exact
  cycle-end reset and start-to-end duration in tests rather than substituting a
  session or weekly duration.
- **Team accounts may previously rely on the dollar aggregate row** → Prefer
  the official pool percentages consistently; retain the existing request and
  On-demand metrics as separate signals.

## Migration Plan

1. Verify the existing Linux auth-path correction and add it to the Cursor
   regression coverage alongside the macOS path.
2. Update the Cursor manifest, mapper, tests, and documentation in one release.
3. Run the plugin suite, frontend tests, build, and plugin bundle verification.
4. Confirm the local usage API returns monthly `Cursor Models` and `Other
   Models` metrics and no `Total usage` for a live Cursor account.
5. Rollback by reverting the change if a Cursor response variant cannot provide
   usable pool fields; no data migration or persisted-state rollback is needed.
