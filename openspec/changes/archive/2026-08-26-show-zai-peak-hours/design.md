## Context

See `proposal.md` for motivation. The Z.ai plugin currently produces quota lines from two authenticated endpoints, while the generic provider card already renders badge lines in both Overview and provider detail views. The plugin runtime provides the current UTC instant as `ctx.nowIso`. Z.ai's documented schedule uses fixed Singapore Standard Time (UTC+8), which has no daylight-saving transition; its 14:00-18:00 window is 15:00-19:00 in Japan.

## Goals / Non-Goals

**Goals:**

- Classify the official weekday window deterministically from the runtime-provided instant.
- Reuse the existing metric-line and provider-card path instead of adding provider-specific UI.
- Preserve a useful status line when an authenticated response has no usable quota entries.
- Close any sensitive-field logging gap found by the mandatory plugin redaction audit.

**Non-Goals:**

- Changing Z.ai quota calculation, reset handling, or request behavior.
- Scheduling a separate UI update exactly at a peak boundary.
- Fetching peak status from a new service or making the schedule user-configurable.
- Translating the application UI or adding timezone settings.

## Decisions

### 1. Compute against fixed UTC+8 inside the Z.ai plugin

Parse `ctx.nowIso`, shift the instant by eight hours, and use UTC weekday and clock fields on the shifted value. Treat Monday-Friday, hour 14 through the instant before hour 18, as peak. This avoids dependence on the machine timezone and daylight-saving rules while directly matching Z.ai's official schedule.

Alternative: compare against the user's local 15:00-19:00 clock. Rejected because that range is valid only in JST and would misclassify users in other timezones.

Alternative: add a timezone library. Rejected because Singapore uses a fixed offset and no dependency is needed.

### 2. Emit the established `Peak Hours` badge shape

Add an overview-scoped badge declaration to `plugins/zai/plugin.json` and emit a badge line with `Peak` / `#ef4444` or `Off-Peak` / `#22c55e`. The existing `ProviderCard` renders overview-scoped badges on both relevant pages, matching Claude's current visual vocabulary without frontend changes.

Alternative: add a text line containing only `15:00-19:00`. Rejected because a current binary state is more actionable and a fixed JST label would not be correct globally.

### 3. Evaluate status once per probe

Build the badge from `ctx.nowIso` during every probe and append it to successful output. This follows the plugin snapshot model and means status changes on the next normal automatic or manual refresh rather than through a new timer or IPC path.

Alternative: make `ProviderCard` recalculate Z.ai status continuously. Rejected because it would embed provider policy in generic UI and create a second source of truth.

### 4. Preserve status on empty usage responses

Replace the Z.ai plugin's successful early-return paths with output assembly that retains the existing `No usage data` badge and also appends `Peak Hours`. Authentication, network, HTTP, and invalid-payload errors continue to use the existing probe error behavior.

### 5. Test fixed instants through `ctx.nowIso`

Add plugin tests for start-inclusive and end-exclusive weekday boundaries, an in-window weekday instant, and a weekend instant. Extend empty-limit coverage to verify the status badge coexists with `No usage data`, and retain existing quota assertions as regression coverage.

### 6. Redact the existing Z.ai customer identifier

The implementation audit found that the documented subscription response contains `customerId`, while the HTTP body logger's sensitive-key list covers user and account identifiers but not customer identifiers. Add both `customerId` and `customer_id` to `redact_body` and extend its camelCase identifier regression test. This is an internal security correction required for plugin changes and does not alter data returned to the Z.ai plugin.

## Risks / Trade-offs

- [Z.ai changes its published schedule] -> Keep the fixed window named and documented in one plugin helper and update its boundary tests with the provider documentation.
- [Badge is stale between a boundary and the next probe] -> Accept the existing snapshot cadence; manual refresh and configured auto-refresh update it without introducing provider-specific scheduling.
- [Early-return restructuring changes no-data behavior] -> Add a regression assertion for both `No usage data` and `Peak Hours`, and run the complete Z.ai plugin test file.
- [Z.ai customer identifiers appear in diagnostic logs] -> Redact both camelCase and snake_case customer identifier fields before response-body logging.

## Migration Plan

No data migration or rollback procedure is required. The change adds one declared output line; rollback consists of removing that manifest line and the plugin's local badge generation.
