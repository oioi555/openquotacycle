## Context

The Claude plugin currently declares a `Peak Hours` overview badge, fetches `https://promoclock.co/api/status` during every probe, maps the response to Peak/Off-Peak colors, and appends the badge after the normal usage lines. The behavior was added by the PromoClock integration commit `83551c1` and is independent of Anthropic's usage endpoint. See `proposal.md` for the policy change that makes this integration obsolete.

## Goals / Non-Goals

**Goals:**

- Remove the retired status integration at its source so Claude probing has no PromoClock dependency.
- Preserve the existing Claude usage, authentication, local statistics, and no-usage paths byte-for-byte in behavior.
- Keep the plugin manifest and provider documentation aligned with the resulting output.

**Non-Goals:**

- Do not replace the badge with a different schedule, local time calculation, or informational line.
- Do not change Anthropic API requests, quota calculations, reset metadata, token refresh, or `ccusage` handling.
- Do not add a feature flag or compatibility shim for the retired status.

## Decisions

### 1. Remove the external integration instead of disabling its display

Delete the PromoClock URL/constants, payload classifier, color mapping, request helper, and probe call. Returning `null` from the existing helper or hiding the line in the frontend would retain unnecessary network traffic and stale provider policy in the backend.

Alternative: keep the request and omit the badge. Rejected because the status is no longer authoritative and the request has no remaining product purpose.

### 2. Preserve the existing probe assembly order

Leave quota and local usage line construction unchanged. Remove only the PromoClock call and conditional append so `No usage data` remains the same fallback when no other lines are available.

Alternative: refactor the whole probe into a new output pipeline. Rejected because it expands the regression surface for a removal-only change.

### 3. Make the manifest, tests, and documentation removal explicit

Remove the `Peak Hours` manifest line, PromoClock fixtures/mocks/integration cases, the Claude provider peak-hours section, and the README metric label. Add focused regression coverage that a normal successful probe makes no PromoClock request and emits no badge while retaining existing usage assertions.

Alternative: retain tests for the retired payload parser. Rejected because the parser will no longer exist and testing it would preserve obsolete behavior.

## Risks / Trade-offs

- [Users who still expect the badge lose a visible metric] -> Document the retirement in the Change and keep all actual Claude quota lines unchanged.
- [A future Anthropic policy change introduces another peak adjustment] -> Add a separate change based on current official behavior instead of reviving this unauthenticated integration.
- [Removing the call changes the number of mocked HTTP requests in existing tests] -> Run the complete Claude plugin test file and add a no-PromoClock-request assertion.

## Migration Plan

No data migration is required. The badge disappears and the external request stops on the first app version containing the change. Rollback is a source-level revert of the manifest, plugin, tests, and documentation removal if the retired status becomes authoritative again.
