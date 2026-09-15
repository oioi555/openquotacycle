# Z.ai

Tracks [Z.ai](https://z.ai) (Zhipu AI) usage quotas for GLM coding plans.

> These API endpoints are not documented in Z.ai's public API reference. They are used internally by the subscription
> management UI and work with both OAuth tokens and API keys.

## Overview

- **Protocol:** REST (plain JSON)
- **Base URL:** `https://api.z.ai/`
- **Auth:** API key via environment variable (`ZAI_API_KEY`, fallback `GLM_API_KEY`)
- **Session utilization:** percentage (0-100)
- **Weekly utilization:** percentage (0-100)
- **Tool calls:** count-based (used / limit)
- **Reset periods:** payload window (`unit` × `number`); sub-daily → Session, multi-day → Weekly; Tool calls monthly
- **Peak hours:** Monday-Friday, 14:00-18:00 Singapore Standard Time (UTC+8), equivalent to 15:00-19:00 JST
- **Off-peak rate:** model usage is charged at 50% of the standard credit rate

The optional [Window Starter](../window-starter.md) defaults to `zcode --prompt <prompt>` (no model flag; zcode 0.16.5 rejects `--max-turns`). Customize L2 can switch to OpenCode (`zai-coding-plan/glm-5.3-flash`, not `opencode-go/`), Hermes (`zai` / `glm-5.3-flash`), or Pi (`zai/glm-5.3-flash`). Claude Code is not offered for Z.ai.

## Setup

1. [Subscribe to a GLM Coding plan](https://z.ai/subscribe) and get your API key from
   the [Z.ai console](https://z.ai/manage-apikey/apikey-list)
2. Set `ZAI_API_KEY` (fallback: `GLM_API_KEY`)

Quotracker is a GUI app. A one-off `export ...` in a terminal session will not be visible when you launch Quotracker from
Spotlight/Launchpad. Persist it, then restart Quotracker.

zsh (`~/.zshrc`):

```bash
export ZAI_API_KEY="YOUR_API_KEY"
```

fish (universal var):

```fish
set -Ux ZAI_API_KEY "YOUR_API_KEY"
```

3. Enable the Z.ai plugin in Quotracker settings

## Peak Hours Status

Quotracker derives the current GLM Coding Plan rate window locally from the plugin runtime clock. It does not make an
additional status request.

- Monday-Friday from 14:00 inclusive to 18:00 exclusive UTC+8: danger-tone header chip `Peak`
- All other times, including weekends: positive-tone header chip `Off-Peak`
- Japan time equivalent: Monday-Friday from 15:00 inclusive to 19:00 exclusive JST
- The status is recalculated on each automatic or manual plugin refresh
- Empty quota still emits the chip; there is no Peak Hours metric row

## Endpoints

### GET /api/biz/subscription/list

Returns the user's active subscription(s). Used to extract the plan name.

#### Headers

| Header        | Required | Value              |
|---------------|----------|--------------------|
| Authorization | yes      | `Bearer <api_key>` |
| Accept        | yes      | `application/json` |

#### Response

```json
{
  "code": 200,
  "data": [
    {
      "id": "169359",
      "customerId": "71321768207710758",
      "productName": "GLM Coding Max",
      "description": "-All Pro plan benefits\n-4× Pro plan usage...",
      "status": "VALID",
      "purchaseTime": "2026-01-12 16:55:13",
      "valid": "2026-02-12 16:55:13-2026-03-12 16:55:13",
      "autoRenew": 1,
      "initialPrice": 30.0,
      "actualPrice": 30.0,
      "currentPeriod": 2,
      "currentRenewTime": "2026-01-12",
      "nextRenewTime": "2026-02-12",
      "billingCycle": "monthly",
      "inCurrentPeriod": true,
      "paymentChannel": "STRIPE"
    }
  ],
  "success": true
}
```

Used fields:

- `productName` — plan display name (e.g. "GLM Coding Max")
- `nextRenewTime` — monthly reset date for web search quota (ISO date, e.g. "2026-03-12")

### GET /api/monitor/usage/quota/limit

Returns session token usage and web search quotas.

#### Headers

| Header        | Required | Value              |
|---------------|----------|--------------------|
| Authorization | yes      | `Bearer <api_key>` |
| Accept        | yes      | `application/json` |

#### Response

```json
{
  "code": 200,
  "data": {
    "limits": [
      {
        "type": "TOKENS_LIMIT",
        "unit": 3,
        "number": 5,
        "usage": 800000000,
        "currentValue": 127694464,
        "remaining": 672305536,
        "percentage": 15,
        "nextResetTime": 1770648402389
      },
      {
        "type": "TIME_LIMIT",
        "unit": 5,
        "number": 1,
        "usage": 4000,
        "currentValue": 1828,
        "remaining": 2172,
        "percentage": 45,
        "usageDetails": [
          {
            "modelCode": "search-prime",
            "usage": 1433
          },
          {
            "modelCode": "web-reader",
            "usage": 462
          },
          {
            "modelCode": "zread",
            "usage": 0
          }
        ]
      }
    ]
  },
  "success": true
}
```

**CREDIT_LIMIT / TOKENS_LIMIT:**

- `percentage` — usage as percentage (0-100). Missing/non-numeric → invalid response, not 0%.
- `nextResetTime` — epoch milliseconds of next reset
- Window is `(unit, number)`: `3` hours, `4` days, `6` weeks, `5` months. Sub-daily → Session, multi-day → Weekly.
- `unit: 3, number: 5` — 5-hour Session
- `unit: 6, number: 7` — 7-week Weekly (payload duration, not a hardcoded 7-day bar)

**TIME_LIMIT:**

- `usage` — total web search/reader call limit (e.g. 4000)
- `currentValue` — calls consumed
- `remaining` — calls remaining
- `percentage` — usage as percentage (0-100)
- `usageDetails` — per-model breakdown (search-prime, web-reader, zread)
- `unit: 5, number: 1` — monthly period (no `nextResetTime`; resets on the 1st of each month at 00:00 UTC)

## Displayed Lines

| Line         | Description                                                                  |
|--------------|------------------------------------------------------------------------------|
| Session      | CREDIT_LIMIT / TOKENS_LIMIT sub-daily percent                                |
| Weekly       | CREDIT_LIMIT / TOKENS_LIMIT multi-day percent                                |
| Tool calls   | TIME_LIMIT count (used / limit). Missing `nextResetTime` falls back to 1st of month UTC |
| Peak / Off-Peak | Header status chip for the current GLM Coding Plan rate window            |

## Errors

| Condition     | Message                                                    |
|---------------|------------------------------------------------------------|
| No API key    | "No ZAI_API_KEY found. Set up environment variable first." |
| 401/403       | "API key invalid. Check your Z.ai API key."                |
| HTTP error    | "Usage request failed (HTTP {status}). Try again later."   |
| Network error | "Usage request failed. Check your connection."             |
| Invalid JSON  | "Usage response invalid. Try again later."                 |
| No coding plan | `success: false` plus a "coding plan" message → no active GLM Coding Plan |
