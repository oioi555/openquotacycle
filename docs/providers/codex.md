# Codex

> Reverse-engineered, undocumented API. May change without notice.

## Overview

- **Protocol:** REST (plain JSON)
- **Base URL:** `https://chatgpt.com`
- **Auth provider:** `auth.openai.com` (OAuth 2.0)
- **Client ID:** `app_EMoamEEZ73f0CkXaXp7hrann`
- **Percentages:** integers (0-100)
- **Timestamps:** unix seconds
- **Window durations:** seconds (18000 = 5h, 604800 = 7d)

The optional [Window Starter](../window-starter.md) defaults to an ephemeral, read-only Codex CLI request with GPT-5.6 Luna. Customize L2 can switch the harness to OpenCode (`openai/gpt-5.6-luna`), Hermes (`openai-codex`), or Pi (`openai-codex/gpt-5.6-luna`, not `openai/`).

## Endpoints

### GET /backend-api/wham/usage

Returns rate limit windows and optional credits.

#### Headers

| Header | Required | Value |
|---|---|---|
| Authorization | yes | `Bearer <access_token>` |
| Accept | yes | `application/json` |
| ChatGPT-Account-Id | no | `<account_id>` |

#### Response

```jsonc
{
  "plan_type": "plus",                     // plan tier (display only; Session is duration-based)
  "rate_limit": {
    "primary_window": {
      "used_percent": 42,                  // % used in the 5-hour window
      "reset_at": 1738900000,              // unix seconds
      "limit_window_seconds": 18000        // 5 hours — Session for every plan
    },
    "secondary_window": {
      "used_percent": 24,                  // % used in the 7-day window
      "reset_at": 1738900000,              // unix seconds
      "limit_window_seconds": 604800       // 7 days
    }
    // Either window may carry either duration; classification is by duration,
    // not by primary/secondary position. A weekly-only response may carry just
    // one 7-day window in either position.
  },
  "code_review_rate_limit": {              // separate weekly code review limit (optional)
    "primary_window": {
      "used_percent": 0,
      "reset_at": 1738900000,
      "limit_window_seconds": 604800
    }
  },
  "credits": {                             // remaining flex credits (optional; header may override)
    "balance": 100                         // count; Extra Usage shows dollars at $0.04 each
  },
  "rate_limit_reset_credits": {            // unused reset grants (optional)
    "available_count": 3
  }
}
```

Both rate_limit windows are enforced simultaneously — hitting either limit throttles the user.

### Account Rate Limit Classification

Account-level windows (`rate_limit.primary_window` / `rate_limit.secondary_window`) are classified strictly by their `limit_window_seconds` duration — never by `primary_window` / `secondary_window` position, and never by `plan_type`:

| `limit_window_seconds` | Display |
|---|---|
| `604800` (7 days) | one account-level `Weekly` line for every plan, with the window's actual `reset_at` and a 7-day period |
| `18000` (5 hours) | one account-level `Session` line for every plan, with the window's actual `reset_at` and a 5-hour period |
| absent / other / non-number | not displayed — no Session/Weekly fallback line is fabricated |

Because classification is position-independent, a weekly allowance returned in `primary_window` behaves identically to one in `secondary_window`, and a **weekly-only** response — `rate_limit` with just a 7-day window in either position and no five-hour window — is handled the same way. When both windows carry a 7-day duration, exactly one `Weekly` line is shown (first emit-capable position wins). When a response carries both a 5-hour and a 7-day window, one `Session` line and one `Weekly` line are shown with `Session` emitted first regardless of which API position carries which duration. Duplicate 5-hour windows likewise collapse to one `Session` line.

`additional_rate_limits` entries become extra progress lines. `gpt-reserve` (Luna Reserve fallback after regular usage is exhausted) is a weekly-only `Luna Reserve` line: only a `limit_window_seconds: 604800` window is emitted, duplicate weekly windows collapse to one, and a five-hour window is ignored. It is unmarked in `plugin.json`, so it defaults to On Demand and can be toggled in Customize. `GPT-*-Codex-Spark` is skipped (the model is being retired). Unlisted additional limits still use the stripped `limit_name`.

`Extra Usage` is a text line from remaining flex credits (`x-codex-credits-balance` header, else `credits.balance`) shown as `"$X.XX · N credits"` at $0.04 each. `Rate Limit Resets` is a text line from `rate_limit_reset_credits.available_count`. Neither line consumes a credit.

## Authentication

### Credential Storage Locations

Codex CLI supports multiple credential storage modes:

- **file** (default): `CODEX_HOME/auth.json` (or `~/.codex/auth.json` by default)
- **keyring**: OS keychain/credential manager entry (service name `Codex Auth`)
- **auto**: keyring first, fallback to file
- **ephemeral**: memory-only (no persistence)

For `keyring`/`auto`, Codex may not keep `auth.json` on disk. If keyring save succeeds, Codex removes the fallback `auth.json`.

OpenQuotaCycle Codex plugin auth lookup order:

1. `CODEX_HOME/auth.json` (when `CODEX_HOME` is set)
2. `~/.config/codex/auth.json`
3. `~/.codex/auth.json`

Expected auth payload shape:

```jsonc
{
  "OPENAI_API_KEY": null,                  // legacy API key field
  "tokens": {
    "access_token": "<jwt>",               // OAuth access token (Bearer)
    "refresh_token": "<token>",
    "id_token": "<jwt>",                   // OpenID Connect ID token
    "account_id": "<uuid>"                 // sent as ChatGPT-Account-Id header
  },
  "last_refresh": "2026-01-28T08:05:37Z"  // ISO 8601
}
```

> Note: Codex also stores MCP OAuth tokens in `~/.codex/.credentials.json` (or keyring), but that is separate from ChatGPT CLI auth used by this plugin.

### Token Refresh

Access tokens are short-lived JWTs. Refreshed when `last_refresh` is older than 8 days, or on 401/403.

```
POST https://auth.openai.com/oauth/token
Content-Type: application/x-www-form-urlencoded
```

```
grant_type=refresh_token
&client_id=app_EMoamEEZ73f0CkXaXp7hrann
&refresh_token=<refresh_token>
```

Response returns new `access_token`, and optionally new `refresh_token` and `id_token`.
