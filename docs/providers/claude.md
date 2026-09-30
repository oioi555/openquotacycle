# Claude Code

> Reverse-engineered, undocumented API. May change without notice.

## Overview

- **Protocol:** REST (plain JSON)
- **Base URL:** `https://api.anthropic.com`
- **Auth provider:** `platform.claude.com` (OAuth 2.0)
- **Client ID:** `9d1c250a-e61b-44d9-88ed-5944d1962f5e`
- **Beta header required:** `anthropic-beta: oauth-2025-04-20`
- **Utilization:** integer percentage (0-100)
- **Credits:** cents (divide by 100 for dollars)
- **Timestamps:** ISO 8601 (response), unix milliseconds (credentials file)

The optional [Window Starter](../window-starter.md) uses the authenticated Claude Code CLI only (`claude -p` with Haiku 4.5, no tools, one turn, no session persistence). Anthropic forbids third-party clients, so OpenCode, Hermes, and Pi are not offered for Claude.

## Endpoints

### GET /api/oauth/usage

Returns rate limit windows and optional extra credits.

#### Headers

| Header | Required | Value |
|---|---|---|
| Authorization | yes | `Bearer <access_token>` |
| Accept | yes | `application/json` |
| Content-Type | yes | `application/json` |
| anthropic-beta | yes | `oauth-2025-04-20` |

#### Response

```jsonc
{
  "five_hour": {
    "utilization": 25,              // % used in 5h rolling window
    "resets_at": "2026-01-28T15:00:00Z"
  },
  "seven_day": {
    "utilization": 40,              // % used in 7-day window
    "resets_at": "2026-02-01T00:00:00Z"
  },
  "seven_day_opus": {               // separate weekly Opus limit (optional, plan-dependent)
    "utilization": 0,
    "resets_at": "2026-02-01T00:00:00Z"
  },
  "limits": [                       // extra named windows (optional)
    {
      "kind": "weekly_scoped",
      "scope": { "model": { "display_name": "Fable" } },
      "utilization": 10,
      "resets_at": "2026-02-01T00:00:00Z"
    }
  ],
  "extra_usage": {                  // on-demand overage credits (optional)
    "is_enabled": true,
    "used_credits": 500,            // cents spent
    "monthly_limit": 10000,         // cents cap (0 = unlimited)
    "currency": "USD"
  }
}
```

All windows are enforced simultaneously — hitting any limit throttles the user.

## Authentication

### Token Location

**Primary:** `~/.claude/.credentials.json`

```jsonc
{
  "claudeAiOauth": {
    "accessToken": "<jwt>",          // OAuth access token (Bearer)
    "refreshToken": "<token>",
    "expiresAt": 1738300000000,      // unix ms
    "scopes": ["..."],
    "subscriptionType": "pro",
    "rateLimitTier": "..."
  }
}
```

**Fallback:** Linux Secret Service, service name `Claude Code-credentials` (same JSON structure).

Stored file/keychain OAuth owns live `/api/oauth/usage` meters. `CLAUDE_CODE_OAUTH_TOKEN` is used only for inference-only plus local spend when no stored OAuth exists (`inferenceOnly` skips the usage endpoint). A five-hour Session with `used === 0` and no parseable `resets_at` omits `resetsAt` so the UI shows `Not started`.

**Fable:** a `limits[]` entry with `kind: weekly_scoped` and `scope.model.display_name === "Fable"` becomes a weekly Fable percent line (0–100).

### Multiple Accounts

Each Claude Code login lives in its own config directory (`CLAUDE_CONFIG_DIR`). OpenQuotaCycle discovers them once at app start:

1. Primary: the app's `CLAUDE_CONFIG_DIR` when set, else `~/.claude`. Always provider id `claude`, so existing settings and history keep applying.
2. Every `~/.claude-*` directory that contains `.credentials.json` (name order).
3. Every directory in `claude.accountDirs` of `~/.config/openquotacycle/config.json` (`~` expanded) that contains `.credentials.json`.

Each extra directory becomes its own Claude card: id `claude@` + first 8 chars of `oauthAccount.accountUuid` from `<dir>/.claude.json`, or `claude@<dir name without leading .>` when that is missing. The primary reads `~/.claude.json` (or `<dir>/.claude.json` when `CLAUDE_CONFIG_DIR` is set). Same `accountUuid` in two extra directories → only the first is kept. When the primary holds the same account as an extra directory, the primary `Claude` card is omitted and the extra directory's card stays. The primary card stays `Claude`. Extra cards are named from the directory: `~/.claude-sub` → `Claude · sub`; a directory outside the convention uses its base name (`/srv/claude/acc1` → `Claude · acc1`). With more than one account, hovering a card title shows that account's full email (`oauthAccount.emailAddress`).

Each card has its own order, enable state, Customize, Window Starter participation, history, lock, leftover notify, and local HTTP API snapshot. New cards are enabled by default. Probes read, refresh, and write back tokens only inside that card's directory.

Add a login (on the machine running OpenQuotaCycle):

```bash
CLAUDE_CONFIG_DIR=~/.claude-b claude   # then run /login
```

Directories outside the `~/.claude-*` convention (e.g. managed by an account switcher app):

```json
{
  "claude": {
    "accountDirs": ["~/accounts/claude-work", "/srv/claude/acc1"]
  }
}
```

- Log in separately on each machine. Never copy `.credentials.json` between machines — refresh-token rotation can then log one side out.
- Restart OpenQuotaCycle after a new login or config change.
- Account switchers (e.g. Orca) swap the login inside `~/.claude`. Give every account its own dedicated directory (`~/.claude-a`, `~/.claude-b`, …) and log in there separately. The primary then always duplicates one of them, so it never shows a card, and each account keeps one stable card and Window Starter no matter which account is active in `~/.claude`.
- Linux file-based credentials only; macOS keychain logins for extra directories are not detected.

### Token Refresh

Access tokens are short-lived JWTs. Refreshed proactively 5 minutes before expiration, or reactively on 401/403.

```
POST https://platform.claude.com/v1/oauth/token
Content-Type: application/json
```

```json
{
  "grant_type": "refresh_token",
  "refresh_token": "<refresh_token>",
  "client_id": "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  "scope": "user:profile user:inference user:sessions:claude_code user:mcp_servers"
}
```

```jsonc
{
  "access_token": "<new_jwt>",
  "refresh_token": "<new_refresh_token>",  // may be same as previous
  "expires_in": 3600                       // seconds
}
```
