# Cursor

> Reverse-engineered, undocumented API. May change without notice.

## Overview

- **Protocol:** Connect RPC v1 (JSON over HTTP)
- **Base URL:** `https://api2.cursor.sh`
- **Service:** `aiserver.v1.DashboardService`
- **Auth provider:** Auth0 (via Cursor)
- **Client ID:** `KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB`
- **Amounts:** cents (divide by 100 for dollars)
- **Timestamps:** unix milliseconds (as strings)

## Plugin metrics

| Metric | Source field | Scope | Format | Notes |
|---|---|---|---|---|
| Credits | `GetCreditGrantsBalance` + `/api/auth/stripe.customerBalance` | overview | dollars | Combined total: active grant total + Stripe prepaid balance (negative `customerBalance`). Used stays based on grant usage. |
| Total Usage | `planUsage.totalPercentUsed` | overview | percent | Aggregate plan percent as Cursor reports it. Not synthesized from Cursor+Other. Shown when the field is finite even without a dollar `limit`. |
| Cursor | `planUsage.autoPercentUsed` | overview | percent | Monthly Cursor pool, including Cursor Grok and Composer. Omitted when field is missing or non-finite. Reset uses the billing-cycle end. |
| Other | `planUsage.apiPercentUsed` | overview | percent | Monthly Other pool for third-party models. Omitted when field is missing or non-finite. Reset uses the billing-cycle end. |
| Requests | `/api/usage` (enterprise) | overview | count | REST fallback when Connect `planUsage` is unusable (no percent, no pools, no limit) |
| On-demand | `spendLimitUsage` | detail | dollars | Only when individual or pooled limit > 0 |
| Grok Bot | `GetSandUsageStatus` | detail | percent | Optional weekly percent. Omitted on pooled enterprise / zero included limit. Failure is nonfatal. |

**Enterprise flow** uses REST `/api/usage` only when Connect plan usage has no usable percent, pool, or dollar limit.

**Monthly quota**: `Total Usage` is the aggregate Cursor reports (`totalPercentUsed`).
`Cursor` and `Other` are independent monthly plan pools. When both billing-cycle
timestamps are valid, reset metadata uses `billingCycleEnd` and
`billingCycleEnd - billingCycleStart`. Pool percentages must not be added
together to invent Total Usage.

**Team detection**: an account is treated as "team" when `planName` is
`"Team"`, or `spendLimitUsage.limitType` is `"team"`, or
`spendLimitUsage.pooledLimit` is present. This affects request fallback and
On-demand pooling, not the monthly pool labels.

## Endpoints

### POST /aiserver.v1.DashboardService/GetCurrentPeriodUsage

Returns current billing cycle spend, limits, and percentage used.

#### Headers

| Header | Required | Value |
|---|---|---|
| Authorization | yes | `Bearer <access_token>` |
| Content-Type | yes | `application/json` |
| Connect-Protocol-Version | yes | `1` |

#### Request

```json
{}
```

#### Response

```jsonc
{
  "billingCycleStart": "1768399334000",   // unix ms (string)
  "billingCycleEnd": "1771077734000",
  "planUsage": {
    "totalSpend": 23222,                  // cents — includedSpend + bonusSpend
    "includedSpend": 23222,               // cents — counted against plan limit
    "bonusSpend": 0,                      // cents — free credits from model providers
    "remaining": 16778,                   // cents — limit minus includedSpend
    "limit": 40000,                       // cents — plan included amount
    "remainingBonus": false,              // true when bonus credits still available
    "bonusTooltip": "...",
    "autoPercentUsed": 0,                 // Cursor monthly pool %
    "apiPercentUsed": 46.444,             // Other monthly pool %
    "totalPercentUsed": 15.48             // aggregate plan %; shown as Total Usage
  },
  "spendLimitUsage": {                    // on-demand budget (after plan exhausted)
    "totalSpend": 0,                      // cents
    "pooledLimit": 50000,                 // cents — team pool (team plans only, optional)
    "pooledUsed": 0,
    "pooledRemaining": 50000,
    "individualLimit": 10000,             // cents — per-user cap
    "individualUsed": 0,
    "individualRemaining": 10000,
    "limitType": "user"                   // "user" | "team"
  },
  "displayThreshold": 200,               // basis points
  "enabled": true,
  "displayMessage": "You've used 46% of your usage limit",
  "autoModelSelectedDisplayMessage": "...",
  "namedModelSelectedDisplayMessage": "..."
}
```

### POST /aiserver.v1.DashboardService/GetPlanInfo

Returns plan name, price, and included amount.

#### Headers

Same as above.

#### Request

```json
{}
```

#### Response

```json
{
  "planInfo": {
    "planName": "Ultra",
    "includedAmountCents": 40000,
    "price": "$200/mo",
    "billingCycleEnd": "1771077734000"
  }
}
```

### POST /aiserver.v1.DashboardService/GetUsageLimitPolicyStatus

Returns whether user is in slow pool, feature gates, and allowed models. Response undocumented.

### POST /aiserver.v1.DashboardService/GetUsageLimitStatusAndActiveGrants

Returns limit policy status plus any active credit grants. Response undocumented.

### GET /api/auth/stripe

Returns subscription and Stripe customer balance metadata from `cursor.com`.

#### Headers

| Header | Required | Value |
|---|---|---|
| Cookie | yes | `WorkosCursorSessionToken=<userId>%3A%3A<access_token>` |

#### Response (partial)

```json
{
  "membershipType": "ultra",
  "subscriptionStatus": "active",
  "customerBalance": -123456
}
```

`customerBalance` is in cents. Negative means customer credit/prepaid balance.

## Authentication

### Token Sources

OpenQuotaCycle reads Cursor auth in this order:

1. **Cursor Desktop SQLite** (preferred)
2. **Cursor CLI keychain** (fallback)

#### 1) Cursor Desktop SQLite (preferred)

Paths:

- Linux: `~/.config/Cursor/User/globalStorage/state.vscdb`

```bash
sqlite3 ~/.config/Cursor/User/globalStorage/state.vscdb \
  "SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken'"
```

| Key | Description |
|---|---|
| `cursorAuth/accessToken` | JWT bearer token |
| `cursorAuth/refreshToken` | Token refresh credential |
| `cursorAuth/cachedEmail` | Account email |
| `cursorAuth/stripeMembershipType` | Plan tier (e.g. `pro`, `ultra`) |
| `cursorAuth/stripeSubscriptionStatus` | Subscription status |

#### 2) OS keyring (fallback)

OpenQuotaCycle also reads these Cursor service entries from the OS keyring:

- `cursor-access-token`
- `cursor-refresh-token`

If neither source contains a valid session, sign in through the Cursor app.
OpenQuotaCycle does not require an unrelated `agent login` command.

### Token Refresh

Access tokens are short-lived JWTs. The app refreshes before each request if expired, then persists the new access token back to the same source it was loaded from (SQLite or keychain).

```
POST https://api2.cursor.sh/oauth/token
Content-Type: application/json
```

```json
{
  "grant_type": "refresh_token",
  "client_id": "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB",
  "refresh_token": "<refresh_token>"
}
```

**Success:**

```json
{
  "access_token": "<new_jwt>",
  "id_token": "<id_token>",
  "shouldLogout": false
}
```

**Invalid/expired token:**

```json
{
  "access_token": "",
  "id_token": "",
  "shouldLogout": true
}
```

When `shouldLogout` is `true`, the refresh token is invalid and the user must re-authenticate via Cursor.

### Session Cookie (for `cursor.com` endpoints)

Some web endpoints (for example `/api/auth/stripe` and enterprise `/api/usage`) use a session cookie instead of bearer auth:

```
WorkosCursorSessionToken=<userId>%3A%3A<access_token>
```

`userId` is derived from JWT `sub` (e.g. `google-oauth2|user_abc` -> `user_abc`).
