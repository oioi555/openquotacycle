# GitHub Copilot

Tracks GitHub Copilot usage quotas for both paid and free tier users.

## Authentication

The plugin looks for a GitHub token in this order:

1. **Editor `apps.json`** (`~/.config/github-copilot/apps.json`) — VS Code / Copilot Chat `github.com` / `github.com:<appId>` `oauth_token`
2. **Editor `hosts.json`** (`~/.config/github-copilot/hosts.json`) — same host keys
3. **GitHub CLI hosts** (`~/.config/gh/hosts.yml`) — `github.com` `oauth_token`
4. **GitHub CLI Keychain** (`gh:github.com`) — Token from `gh auth login`
5. **App keychain** (service name `Quotracker-copilot`) — Token previously cached by the plugin
6. **State File** (`{pluginDataDir}/auth.json`) — Fallback file-based storage

### Setup

Install and authenticate with the GitHub CLI:

```bash
# Arch
pacman -S github-cli

# Authenticate
gh auth login
```

Choose "GitHub.com" and follow the prompts. The plugin will automatically read the token from the gh CLI keychain.

Once authenticated via gh CLI, the plugin caches the token in the app keychain for faster access on subsequent probes.

## API

**Endpoint:** `https://api.github.com/copilot_internal/user`

**Headers:**
```
Authorization: token <token>
Accept: application/json
Editor-Version: vscode/1.96.2
Editor-Plugin-Version: copilot-chat/0.26.7
User-Agent: GitHubCopilotChat/0.26.7
X-Github-Api-Version: 2025-04-01
```

### Response (Paid Tier)

```json
{
  "copilot_plan": "pro",
  "quota_reset_date": "2025-02-15T00:00:00Z",
  "quota_snapshots": {
    "premium_interactions": {
      "percent_remaining": 80,
      "entitlement": 300,
      "remaining": 240,
      "quota_id": "premium"
    },
    "chat": {
      "percent_remaining": 95,
      "entitlement": 1000,
      "remaining": 950,
      "quota_id": "chat"
    }
  }
}
```

### Response (Free Tier)

```json
{
  "copilot_plan": "individual",
  "access_type_sku": "free_limited_copilot",
  "limited_user_quotas": {
    "chat": 410,
    "completions": 4000
  },
  "monthly_quotas": {
    "chat": 500,
    "completions": 4000
  },
  "limited_user_reset_date": "2025-02-11"
}
```

## Displayed Lines

| Line         | Tier | Description |
|--------------|------|-------------|
| Credits      | Paid | `100 - premium_interactions.percent_remaining` |
| Extra Usage  | Paid | Text count when `overage_permitted` |
| Chat         | Free | Count used/limit from `limited_user_quotas` vs `monthly_quotas` |
| Completions  | Free | Same count mapping. Unlimited / `-1` Chat and Completions are omitted |
| Credits      | Org  | Text count from `token_based_billing.credits_used` when present |

All progress lines include:
- `resetsAt` — ISO timestamp of next quota reset
- `periodDurationMs` — 30-day period (2592000000ms)

## Errors

| Condition       | Message                                           |
|-----------------|---------------------------------------------------|
| No token found  | "Not signed in. Sign in to Copilot in an editor or run `gh auth login`." |
| 401/403         | "Token invalid. Run `gh auth login` to re-auth."  |
| HTTP error      | "Usage request failed (HTTP {status})..."         |
| Network error   | "Usage request failed. Check your connection."    |
| Invalid JSON    | "Usage response invalid. Try again later."        |
