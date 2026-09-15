# Antigravity

> Reverse-engineered from app bundle and language server binary. May change without notice.

Antigravity is a Google-branded Codeium fork: same language-server binary and Connect-RPC protocol. The key differences: Antigravity uses fraction-based per-model quota (not credits), and doesn't require an API key in the request metadata.

## Overview

- **Vendor:** Google (internal codename "Jetski")
- **Protocol:** Connect RPC v1 (JSON over HTTP) on local language server
- **Service:** `exa.language_server_pb.LanguageServerService`
- **Auth:** CSRF token from language-server process args; the `agy` CLI does not require a CSRF flag. Cloud Code uses only an unexpired access token from the Linux SQLite profiles, the `agy` OS keyring entry, or the existing cache.
- **Quota:** fraction (0.0–1.0, where 1.0 = 100% remaining)
- **Quota windows:** rolling 5 hours and weekly
- **Timestamps:** ISO 8601
- **Requires:** Antigravity standalone app, Antigravity IDE, or `agy` CLI running for local quota; otherwise an unexpired signed-in access token is required for the Cloud Code fallback. Antigravity or `agy` owns OAuth renewal.
- **Offline:** after a reboot the stored access token is usually expired and no local server is running. The plugin then shows the last successful reading from a display-only snapshot with a `Stale` chip, or the start-Antigravity error when no snapshot exists yet.

The optional [Window Starter](../window-starter.md) can start Antigravity's independent Session and Claude 5-hour windows through `agy`. Both default off. Session uses `--model gemini-3.8-flash-low`; Claude uses `--model claude-sonnet-4-6`. Quotracker does not pass `--dangerously-skip-permissions`. Enable each window on Customize L2 or from the Timeline Window Starter row context menu; the UI does not ask for model names.

## Discovery

The language server listens on a random localhost port. Three values must be discovered from the running process.

```bash
# 1. Find process and extract CSRF token
ps -ax -o pid=,command= | grep 'language_server_linux.*antigravity'
# Match: --app_data_dir antigravity OR --app_data_dir antigravity-ide
#       OR a path containing /antigravity/ or /antigravity-ide/
# Extract: --csrf_token <token>
# Extract: --extension_server_port <port>  (HTTP fallback)

# 2. Find listening ports
lsof -nP -iTCP -sTCP:LISTEN -a -p <pid>

# 3. Probe each port to find the Connect-RPC endpoint
POST https://127.0.0.1:<port>/.../GetUnleashData  → first 200 OK wins
```

Port and CSRF token change on every IDE restart. The LS may use HTTPS with a self-signed cert.

## Headers (all local requests)

| Header | Required | Value |
|---|---|---|
| Content-Type | yes | `application/json` |
| Connect-Protocol-Version | yes | `1` |
| x-codeium-csrf-token | yes | `<csrf_token>` (from process args) |

## Endpoints

### RetrieveUserQuotaSummary (authoritative)

Newer Antigravity builds expose merged quota pools and both quota windows through this endpoint. The LS wraps the payload in `response`; Cloud Code returns the `groups` payload directly.

```
POST http://127.0.0.1:{port}/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary
POST https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary
```

Only exact bucket IDs are recognized:

| Bucket ID | Display label | Window |
|---|---|---|
| `gemini-5h` | Session | 5 hours |
| `gemini-weekly` | Weekly | 7 days |
| `3p-5h` | Claude | 5 hours |
| `3p-weekly` | Claude Wk | 7 days |

The Gemini Pro and Flash models share the Gemini pool. Claude, GPT-OSS, and other non-Gemini models share the `3p` pool. A missing `remainingFraction` drops only that bucket; it must not be treated as full or depleted.

Five-hour Session/Claude windows keep a server `resetTime` even when rounded usage is still 0% — a tiny `agy` request can leave remaining at ~100% with a live 5-hour countdown. `Not started` is only for a missing reset time. Weekly windows keep their reset even when unused. OpenQuota's Overview may still show Session `Not started` at 0% used; Quotracker intentionally shows the countdown to match `agy` and the Antigravity IDE.

Optional local spend tiles read `~/.gemini/antigravity-cli/conversations/*.db` (`SELECT time_created AS ms, tokens, cost FROM generations` for the last 30 UTC days). Missing or unreadable conversation DBs must not fail quota meters.

### GetUserStatus (legacy fallback)

Returns plan info and legacy per-model quota for all models (Gemini, Claude, GPT-OSS) in a single call. It exposes only the rolling five-hour windows.

```
POST http://127.0.0.1:{port}/exa.language_server_pb.LanguageServerService/GetUserStatus
```

#### Request

```json
{
  "metadata": {
    "ideName": "antigravity",
    "extensionName": "antigravity",
    "ideVersion": "unknown",
    "locale": "en"
  }
}
```

The CSRF token alone authenticates. When an API key is available from the local SQLite database, it is included in the metadata.

#### Response

```jsonc
{
  "userStatus": {
    "planStatus": {
      "planInfo": {
        "planName": "Pro",                       // "Free" | "Pro" | "Teams" | "Ultra"
        "teamsTier": "TEAMS_TIER_PRO"
      }
    },

    "cascadeModelConfigData": {
      "clientModelConfigs": [
        {
          "label": "Gemini 3 Pro (High)",
          "modelOrAlias": { "model": "MODEL_PLACEHOLDER_M7" },
          "quotaInfo": {
            "remainingFraction": 1,              // 0.0–1.0
            "resetTime": "2026-02-07T14:23:01Z"
          }
        },
        {
          "label": "Claude Sonnet 4.5",
          "quotaInfo": { "remainingFraction": 1, "resetTime": "..." }
        },
        {
          "label": "Claude Opus 4.5 (Thinking)",
          "quotaInfo": { "remainingFraction": 1, "resetTime": "..." }
        },
        {
          "label": "GPT-OSS 120B (Medium)",
          "quotaInfo": { "remainingFraction": 1, "resetTime": "..." }
        }
        // ~7 models total, dynamic
      ]
    }
  }
}
```

### GetCommandModelConfigs (fallback)

Returns model configs with per-model quota only. No plan info, no email. Use when `GetUserStatus` fails.

```
POST http://127.0.0.1:{port}/exa.language_server_pb.LanguageServerService/GetCommandModelConfigs
```

#### Request

```json
{
  "metadata": {
    "ideName": "antigravity",
    "extensionName": "antigravity",
    "ideVersion": "unknown",
    "locale": "en"
  }
}
```

#### Response

```jsonc
{
  "clientModelConfigs": [
    // same shape as GetUserStatus.cascadeModelConfigData.clientModelConfigs
  ]
}
```

## Available Models

| Display Name | Internal ID | Provider |
|---|---|---|
| Gemini 3 Flash | 1018 | Google |
| Gemini 3 Pro (High) | 1008 | Google |
| Gemini 3 Pro (Low) | 1007 | Google |
| Claude Sonnet 4.5 | 333 | Anthropic (proxied) |
| Claude Sonnet 4.5 (Thinking) | 334 | Anthropic (proxied) |
| Claude Opus 4.6 (Thinking) | MODEL_PLACEHOLDER_M26 | Anthropic (proxied) |
| GPT-OSS 120B (Medium) | 342 | OpenAI (proxied) |

Models are dynamic — the list changes as Google adds/removes them. The plugin reads labels from the response, not a hardcoded list.

Interestingly, non-Google models (Claude, GPT-OSS) are proxied through Codeium/Windsurf infrastructure — Antigravity uses the same language server binary as Windsurf. The `GetUserStatus` response also includes `monthlyPromptCredits`, `monthlyFlowCredits`, and `monthlyFlexCreditPurchaseAmount` fields inherited from the Windsurf credit system, but these appear to be completely irrelevant to Antigravity's quota model which is purely fraction-based per model.

## Local SQLite Database

Antigravity stores auth credentials in a VS Code-compatible state database.

- **Standalone:** `~/.config/Antigravity/User/globalStorage/state.vscdb`
- **IDE:** `~/.config/Antigravity IDE/User/globalStorage/state.vscdb`
- **Table:** `ItemTable` (`key` TEXT, `value` TEXT)

### antigravityAuthStatus

```json
{
  "apiKey": "ya29.<token>",
  "email": "user@example.com",
  "name": "Test User"
}
```

`apiKey` is a Google OAuth access token (`ya29...`). It is included in local-server metadata and may be used as a last-resort Bearer token for Cloud Code when protobuf OAuth tokens are unavailable, unless the plugin has identified that same value as expired.

### antigravityUnifiedStateSync.oauthToken (Topic protobuf)

The durable OAuth credential is stored in both the standalone and IDE profiles as a base64-encoded `Topic` protobuf. The plugin finds the `Topic.DataEntry` whose key is `oauthTokenInfoSentinelKey`, reads its `Row.value` (itself base64-encoded), and decodes the contained OAuth token message.

```protobuf
message Topic {
  repeated DataEntry data = 1;
}
message DataEntry {
  string key = 1;
  Row value = 2;
}
message Row {
  string value = 1; // base64-encoded OAuthTokenInfo
}
```

The IDE profile may not contain `antigravityAuthStatus`; the Topic OAuth record is authoritative and must be used without the legacy cache.

### jetskiStateSync.agentManagerInitState (protobuf)

Google OAuth tokens are also stored as a base64-encoded protobuf blob, with a refresh token and expiry timestamp. The plugin reads the access token and expiry for validation but deliberately ignores the refresh token.

```protobuf
message AgentManagerInitState {
  OAuthTokenInfo oauth_token = 6;       // field 6, wire type 2
}
message OAuthTokenInfo {
  string access_token = 1;              // "ya29...." Google OAuth access token
  string token_type = 2;               // ignored
  string refresh_token = 3;            // "1//..." Google OAuth refresh token
  Timestamp expiry = 4;                // field 4, wire type 2
}
message Timestamp {
  int64 seconds = 1;                   // Unix epoch seconds
}
```

The plugin decodes this using a minimal protobuf wire-format parser (varint + length-delimited only). The access token is short-lived; the refresh token is retained by Antigravity/`agy` for credential renewal and is ignored by Quotracker.

### OS keyring (`agy` entry)

The `agy` CLI keeps its OAuth credentials in the OS keyring under the Secret Service entry with service attribute `gemini` (account `antigravity`). The secret is JSON: `{ token: { access_token, token_type, refresh_token, expiry }, auth_method, id_token }`, where `expiry` is Go's RFC3339Nano form (for example `2026-09-12T05:30:08.187537917+09:00`).

`agy` refreshes this entry on every run — print mode performs a silent refresh before its first request, which is exactly what a Window Starter run triggers. The plugin reads this entry read-only, uses only the access token (expiry-trimmed to milliseconds before parsing), dedupes it against the profile tokens, and never reads out, sends, or persists the refresh token. A missing or expired entry is skipped silently. On Linux the read goes through the host's `readGenericPassword` (Secret Service via `oo7`). `agy` stores the item as `text/plain; charset=utf8`; the host uses a patched `oo7` 0.6 that accepts MIME parameters (crates.io 0.6.0 required an exact `text/plain`). The entry is only visible when the same keyring daemon is running.

### Credential Renewal

Quotracker does not call Google's OAuth token endpoint, submit the stored refresh token, or write a newly refreshed Antigravity token. Credential renewal stays with Antigravity and `agy`.

After boot, when the access token is expired and no local server is running, Quotracker can run a one-shot `agy -p /quota --print-timeout 1m` (host argv exactly those four tokens; no `--model`, no Window Starter prompt). `--print-timeout` is required so `/quota` is not canceled mid-command. That slash command refreshes the official CLI keyring and exits without an agent turn or a 5-hour window. The host discards stdout; quota is then read by the existing plugin probe (fresh keyring → Cloud Code). This is not Window Starter. Window Starter's Antigravity pins are `agy -p <prompt> --model gemini-3.8-flash-low` and `agy -p <prompt> --model claude-sonnet-4-6`, which start a cascade and consume quota.

- **Auto-start agy** (Antigravity Customize L2, default off): on a `Stale` chip or the start-agy error, run the one-shot then re-probe Antigravity. Turning the toggle on while already Stale starts that one-shot immediately. The refresh icon stays visible until the card recovers so a failed wake is not a dead end.
- **Start agy**: the same one-shot when `agy` is on `PATH` and the card is `Stale` or showing `Antigravity session expired. Start Antigravity or agy and try again.` The callout matches Grok (title + detail). The action is an icon-only refresh button to the right of the copy, with tooltip "Start agy to refresh the session"; it spins while wake is in flight.
- If an exact `agy` process is already running, skip spawn and only re-probe.
- If `agy` is not on `PATH`, the button is hidden and Auto-start does not spawn.

The only offline surface is a display-only quota snapshot (`quota-snapshot.json` in the plugin data directory): the last successful reading's labels, usage, limits, reset timestamps, and plan name, never any credential. It is written after every successful probe with at least one quota line, is not overwritten by empty readings, and is shown with a `Stale` chip when all sources fail. It is never used to send a request.

## Cloud Code API (fallback)

When the language server is not running, the plugin falls back to Google's Cloud Code API using a Google OAuth access token (from protobuf data, or apiKey as last resort).

### retrieveUserQuotaSummary (preferred)

The plugin tries this endpoint before the legacy model endpoints. A valid summary, including an empty `groups` response, is authoritative and must not fall through to legacy parsing.

```
POST https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary
Authorization: Bearer <access_token>
Content-Type: application/json
User-Agent: antigravity
```

### fetchAvailableModels (legacy fallback)

```
POST https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels
Authorization: Bearer <access_token>
Content-Type: application/json
User-Agent: antigravity
```

Base URLs tried in order:
1. `https://daily-cloudcode-pa.googleapis.com`
2. `https://cloudcode-pa.googleapis.com`

#### Response

```jsonc
{
  "models": {
    "gemini-3-pro": {
      "displayName": "Gemini 3 Pro",
      "model": "gemini-3-pro",
      "quotaInfo": {
        "remainingFraction": 0.8,          // 0.0–1.0
        "resetTime": "2026-02-08T10:00:00Z"
      }
    }
    // ... more models
  }
}
```

Returns 401/403 if the token is invalid or expired. Quotracker reports the fallback as unavailable and does not perform a reactive OAuth refresh.

The response includes all models provisioned for the account. The plugin filters out non-user-facing models using three layers: (1) `isInternal: true` flag from the API, (2) empty `displayName` (catches internal autocomplete models like `chat_20706`, `tab_flash_lite_preview`), and (3) a model-ID blacklist (catches Gemini 2.5 variants and placeholders).

The Cloud Code model set is a superset of the LS model set. The LS returns only cascade-configured chat models, Cloud Code includes all provisioned models. This difference is expected.

## Plugin Strategy

1. Scan both Linux state databases, preferring the first profile with an unexpired `antigravityUnifiedStateSync.oauthToken` record; retain only valid access-token candidates, read the `agy` OS keyring entry (service `gemini`) as an additional read-only candidate, and read the existing cache without writing it
2. **Strategy 1 — local probe (primary):**
   a. Discover `language_server_linux`/`language_server_linux_x64` via `ctx.host.ls.discover()` (ps + lsof), then try markerless exact `agy` discovery
   b. Probe ports with `GetUnleashData` to find the Connect-RPC endpoint; `agy` requests use an empty CSRF value
   c. Include `apiKey` in metadata if available and not known expired
   d. Call `RetrieveUserQuotaSummary` for merged 5-hour + weekly pools
   e. Call `GetUserStatus` only for plan name when the summary succeeds
   f. Fall back to legacy `GetUserStatus` / `GetCommandModelConfigs` when the summary endpoint is unavailable
3. **Strategy 2 — Cloud Code API (fallback, only if local probing fails):**
   a. Build a deduplicated candidate list from unexpired proto access tokens, fresh cached tokens, and API-key metadata not known expired
   b. Try each token with `retrieveUserQuotaSummary`, then `fetchAvailableModels` if the summary endpoint is unavailable
   c. Never call Google's OAuth token endpoint, submit a refresh token, or write a refreshed token
   d. Parse summary bucket IDs exactly; legacy model parsing skips `isInternal` models, empty-displayName models, and blacklisted model IDs
4. On any successful probe with at least one quota line, persist those lines (plus plan) as a display-only snapshot in the plugin data directory
5. If every strategy fails: return the persisted snapshot with a `Stale` chip and the same thrown error as a card callout when a snapshot exists, otherwise error "Antigravity session expired. Start Antigravity or agy and try again."
