# Feature: Add xAI SuperGrok (GrokBuild auth) and OpenRouter quota providers

## Summary

Add separate Tuxmeter providers for the xAI SuperGrok subscription quota and
OpenRouter key usage/quota.

## Motivation

OpenUsage's current Grok implementation reads Grok CLI state, but the xAI
credentials actually used here live in GrokBuild's `~/.grok/auth.json`, which
GrokBuild owns and refreshes; Tuxmeter only needs to read that store. The
OpenRouter API key lives in the `openrouter` entry in OpenCode's
`~/.local/share/opencode/auth.json`. Users also need OpenRouter spending and
key-budget visibility without confusing it with the xAI SuperGrok subscription
meter.

## Proposed Solution

- Add an `xai` plugin that reads GrokBuild's `~/.grok/auth.json` read-only
  (first entry with a non-empty `key`; entry keys use
  `<scope>::<client_id>`, for example `https://auth.x.ai::<client_id>`) and queries
  `https://cli-chat-proxy.grok.com/v1/billing?format=credits`.
- Add an `openrouter` plugin that reads the `openrouter` key from OpenCode's
  `~/.local/share/opencode/auth.json` and queries
  `https://openrouter.ai/api/v1/key`.
- Keep the providers independent. OpenRouter usage, including `x-ai/*`
  models, is reported as OpenRouter key usage and is not added to SuperGrok.
- Map OpenRouter's `limit_remaining` to Tuxmeter's progress model as
  `used = limit - limit_remaining`. Tuxmeter's default `left` display then
  presents the remaining amount; the user can switch to used mode.
- Handle missing credentials, expired xAI tokens, authentication failures,
  invalid responses, and network/HTTP failures with provider-specific errors.
- Cache the last successful xAI quota window so the meter stays visible via a
  stale snapshot when GrokBuild's credential expires or the API is unreachable.
- Add manifests, currentColor icons, tests, provider documentation, and
  README entries. Bundle registration remains directory-based.

## Alternatives Considered

- Using OpenCode's `xai` OAuth entry: rejected because OpenCode's session
  information is not stable, and the actively used GrokBuild installation owns
  `~/.grok/auth.json` and its refresh flow.
- Using OpenRouter's `/credits`: rejected because it requires a management key;
  `/api/v1/key` works with the normal OpenRouter key.
- Aggregating OpenRouter Grok usage into xAI: rejected because the billing
  owners and quota scopes differ.

## Impact

- [ ] Breaking changes
- [ ] Database migrations
- [ ] API changes

The change is plugin-only plus documentation and tests. No Rust IPC or
database migration is required. The xAI billing endpoint is an undocumented
Grok-facing endpoint and may change independently.
