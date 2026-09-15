## Context

Tuxmeter loads self-contained JavaScript plugins through its QuickJS host API.
Plugins can read files and make HTTPS requests. GrokBuild stores xAI
credentials in `~/.grok/auth.json`, while OpenCode stores the OpenRouter API
key in `~/.local/share/opencode/auth.json`. The UI's progress model stores
`used` and `limit`; the default display mode is `left`, which renders
`limit - used` as the primary amount.

## Goals / Non-Goals

**Goals:**

- Add independent xAI SuperGrok and OpenRouter provider plugins.
- Read the xAI credential from GrokBuild's `~/.grok/auth.json` read-only and
  the OpenRouter key from OpenCode's auth file, without owning any OAuth
  refresh or requiring additional CLI installations.
- Present OpenRouter's remaining budget correctly under both Tuxmeter display
  modes.
- Keep provider errors, tests, icons, manifests, and documentation consistent
  with existing plugins.

**Non-Goals:**

- Refreshing or writing GrokBuild or OpenCode auth credentials from Tuxmeter,
  or calling xAI OAuth endpoints.
- Reading Grok CLI logs or aggregating OpenRouter Grok usage into SuperGrok.
- Using OpenRouter management-key-only account credits.
- Adding a Rust IPC command, database schema, or new runtime dependency.

## Decisions

### GrokBuild auth as the xAI credential source

Read GrokBuild's `~/.grok/auth.json` read-only. GrokBuild entry keys use
`<scope>::<client_id>` (for example `https://auth.x.ai::<client_id>`), so the
plugin scans all entries and uses the first object with a non-empty `key`;
expiry comes from `expires_at` (ISO) with the key's JWT `exp` claim as fallback.
GrokBuild remains the sole owner of OAuth refresh and file persistence —
Tuxmeter never writes the file and never calls OAuth endpoints. Missing or
expired credentials fail explicitly.

### OpenCode auth as the OpenRouter credential source

Read the `openrouter` API key from OpenCode's
`~/.local/share/opencode/auth.json`. This matches the user's actual execution
path and avoids duplicating refresh logic. Missing or rejected keys fail
explicitly.

### Separate provider identities

Use `xai` and `openrouter` as separate plugin IDs, manifests, icons, and cards.
The xAI endpoint reports a subscription period meter; the OpenRouter endpoint
reports key-wide spend/budget. They cannot be safely summed or relabeled.

### OpenRouter remaining mapping

For a limited key, keep the runtime's canonical representation as
`used = limit - limit_remaining`, `limit = limit`. This is required because
the existing UI converts a progress line to remaining only when the user
selects `left` mode; in default mode the user sees the API's remaining budget.
Unlimited keys use text spend lines because there is no valid progress limit.

### No token refresh in the plugin

GrokBuild owns the xAI OAuth refresh and persistence of `~/.grok/auth.json`;
OpenCode holds the static OpenRouter API key. Tuxmeter reports an actionable
reconnect error when the xAI credential is expired or rejected instead of
mutating either auth store.

### Stale snapshot fallback

Cache the last successful xAI quota window (display fields only) under the
plugin data directory and render it with a stale Status badge when the
GrokBuild credential is expired or the billing request fails, so the meter
stays visible during auth or API outages.

### Pace context from the billing window

When xAI returns both period boundaries, pass their positive difference as the
progress line's period duration. This preserves the UI contract needed for the
ahead/on-track/behind indicator and the in-bar time marker; period-kind
fallbacks are used only when boundaries are absent.

## Risks / Trade-offs

- **Undocumented xAI billing endpoint** → Keep parsing defensive and surface
  invalid responses clearly; provider behavior may change independently.
- **OpenRouter reset metadata may be a reset kind rather than an ISO timestamp**
  → Omit the countdown unless a valid timestamp is returned; quota and spend
  remain visible.
- **Auth file format changes** → Treat missing/malformed entries as an
  unconfigured provider and never log credential values.
- **OpenRouter key-wide scope** → Document that all models on the key are
  included, including `x-ai/*`, and keep it separate from SuperGrok.
- **GrokBuild may rewrite `~/.grok/auth.json` at any time** → Tuxmeter reads
  the file fresh on each probe and never writes to it, avoiding races.

## Migration Plan

No migration is required. The new plugin directories are discovered by the
existing bundle script. Users with a GrokBuild xAI login see the new xAI
provider after the next Tuxmeter refresh; users with an OpenRouter key in
OpenCode see the OpenRouter provider. Otherwise the provider shows a
configuration message and can be disabled.

## Open Questions

None that block the current implementation. The xAI endpoint's long-term
stability is an operational risk, not a design choice requiring migration.
