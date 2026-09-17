# OpenRouter

> Key usage and quota via the OpenRouter API.

## Overview

- **Key order:** `~/.config/openquotacycle/openrouter.json` (`apiKey` / `api_key` / `key`) → `OPENROUTER_API_KEY` → OpenCode `~/.local/share/opencode/auth.json` `openrouter.key`
- **APIs:** `GET https://openrouter.ai/api/v1/credits` and `GET https://openrouter.ai/api/v1/key`
- **Provider ID:** `openrouter`
- **Usage scope:** key-wide usage (all models, including `x-ai/*`)

## Detection

The first non-empty key in that order enables the plugin. Config file example:

```jsonc
{
  "apiKey": "sk-or-v1-..."
}
```

If no key is found, the plugin shows an error to add a key in
`~/.config/openquotacycle/openrouter.json`, `OPENROUTER_API_KEY`, or OpenCode.

## Data Sources

Both endpoints are queried. Either failing is nonfatal when the other produced
rows. Both 401/403 → invalid key.

### GET https://openrouter.ai/api/v1/credits

Credits/Balance from remaining management credits.

### GET https://openrouter.ai/api/v1/key

#### Headers

| Header | Value |
|---|---|
| Authorization | `Bearer <key>` |
| Accept | `application/json` |
| User-Agent | `OpenQuotaCycle` |

#### Response Shape

```jsonc
{
  "data": {
    "label": "my key",
    "usage": 40,            // total spent (USD)
    "limit": 100,           // budget in USD, null on free/unlimited keys
    "limit_remaining": 60,  // USD remaining, null when limit is null
    "usage_daily": 10,
    "usage_weekly": 25,
    "usage_monthly": 40,
    "limit_reset": "monthly",
    "is_free_tier": false
  }
}
```

## Display Rules

- Credits / Balance from `/credits` remaining.
- Key Limit from `/key` as `limit - remaining` for the current window.
- Period spend text lines: Today / Weekly / Monthly from `/key` usage fields.
- `resetsAt` is shown only when `limit_reset` is an ISO timestamp.

## Failure Behavior

- Invalid key (both endpoints 401/403) → update the key in config, env, or OpenCode.
- Other HTTP errors → `Usage request failed (HTTP <status>). Try again later.`
- Missing `data`, non-numeric `usage`, missing/negative period usage fields,
  or `limit_remaining > limit` → "OpenRouter response invalid".

## Separation from Grok

OpenRouter is a distinct provider with its own ID, display name, and icon.
Its key-wide usage is reported as OpenRouter spend and is never aggregated
into the Grok SuperGrok quota, even when models are served via `x-ai/*`.

## Notes

- Both `/credits` and `/key` are used. A `/credits` failure still keeps `/key` rows.
