## Context

See `proposal.md` for motivation. The OpenCode Go plugin already maps the authenticated usage API into Session / Weekly / Monthly progress lines and optional local spend tiles. Header status chips already exist; Z.ai emits `Peak` / `Off-Peak` from `ctx.nowIso` without a second request. The Go usage API returns only percent windows and does not identify the active model or peak billing state. OpenCode's Go docs copy DeepSeek's published weekday UTC windows and 2x peak rates for DeepSeek models only. Local spend currently also sums `providerID` `opencode` (Zen), which this provider does not support.

## Goals / Non-Goals

**Goals:**

- Classify DeepSeek's two weekday UTC windows deterministically from the runtime-provided instant.
- Reuse the existing header-chip path instead of adding provider-specific UI.
- Label the chip `DeepSeek Peak` / `DeepSeek Off-Peak` so it is not read as a Go-wide rate window.
- Emit the chip only when Go meters succeed.
- Count local spend tiles from `opencode-go` rows only.

**Non-Goals:**

- Changing Go quota calculation, reset handling, or request behavior.
- Adding a Zen provider or Zen quota API.
- Detecting whether the user is currently on a DeepSeek model.
- Scheduling a separate UI update exactly at a peak boundary.
- Fetching peak status from a new service or making the schedule user-configurable.
- Translating the application UI or adding timezone settings.

## Decisions

### 1. Compute against UTC inside the OpenCode Go plugin

Parse `ctx.nowIso` and use UTC weekday plus UTC hour. Treat Monday-Friday as peak when the hour is 1, 2, or 3, or 6, 7, 8, or 9. That is start-inclusive and end-exclusive for 01:00-04:00 and 06:00-10:00 UTC. Use UTC weekday so the classifier matches OpenCode's English schedule rather than the machine timezone.

Alternative: shift to JST and compare 10:00-13:00 plus 15:00-19:00. Rejected because that range is valid only in Japan and would misclassify users in other timezones.

Alternative: follow Beijing weekday boundaries instead of UTC weekdays. Rejected because the published UTC windows never straddle a Beijing weekend boundary, so UTC weekday matches both the English docs and Beijing weekdays for every peak instant.

### 2. Prefix the chip with DeepSeek

Emit `DeepSeek Peak` / `#danger` or `DeepSeek Off-Peak` / `#positive`. Z.ai can keep unlabeled `Peak` / `Off-Peak` because that plan's rate applies to every GLM Coding Plan request. Go's 2x window applies only to DeepSeek models; the prefix makes the scope visible without a metric row.

Alternative: reuse bare `Peak` / `Off-Peak`. Rejected because the Go card would look like the whole subscription is in a higher-rate window.

Alternative: emit the chip only when local spend last used a DeepSeek model. Rejected because the usage API has no model field and local SQLite is optional and incomplete.

### 3. Evaluate status once per successful Go-meter probe

Build the chip from `ctx.nowIso` during every probe that returns Go Session / Weekly / Monthly lines. Entitlement-only Go spend, missing-key Go spend, and thrown auth/usage failures stay chip-less. Status changes on the next automatic or manual refresh.

Alternative: show the chip whenever `auth.json` has a key, including entitlement-only spend. Rejected because DeepSeek Go pricing does not apply without a Go subscription.

### 4. Test both windows through `ctx.nowIso`

Add plugin tests for morning start/end, the 04:00-06:00 gap, afternoon start/end, a weekday outside both windows, and a weekend instant inside the clock hours. Keep existing quota assertions as regression coverage, including an exact-result test that now also expects the chip.

### 5. Document the DeepSeek-only meaning

Update `docs/providers/opencode-go.md` and the README provider summary with the UTC schedule, JST equivalents, 2x peak rate, and the fact that GLM and other Go models are unaffected.

### 6. Local spend is Go-only

Filter SQLite message rows to `providerID === "opencode-go"`. Drop the hosted-providers allowlist that also accepted `opencode`. Zen rows, ChatGPT OAuth, and other IDs stay out. EntitlementError or missing key still render spend tiles when Go rows exist, and fail closed when the only local costs are Zen.

Alternative: keep mixing Zen into the Go card as "hosted OpenCode spend". Rejected because this plugin is Go quota, not a Zen provider.

## Risks / Trade-offs

- [DeepSeek or OpenCode changes the published schedule] -> Keep the windows in one plugin helper and update boundary tests with the provider documentation.
- [Chip is stale between a boundary and the next probe] -> Accept the existing snapshot cadence; manual refresh and configured auto-refresh update it.
- [Users on GLM still see DeepSeek Peak] -> Keep the DeepSeek prefix; do not infer the active model.
- [Exact `toEqual` probe snapshots omit `statuses`] -> Update those assertions in the OpenCode Go plugin tests.
- [Users who also used Zen locally see lower spend totals] -> Document that tiles are Go-only; do not keep a dual-provider sum.

## Migration Plan

No persisted-data migration. Spend tiles immediately omit Zen rows. Rollback restores the `opencode` allowlist and removes the DeepSeek chip.
