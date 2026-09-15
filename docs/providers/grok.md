# Grok

> SuperGrok subscription quota via Grok Build's `~/.grok/auth.json` credentials.

## Overview

- **Source of truth:** `~/.grok/auth.json` (Grok Build auth store)
- **Quota API:** `GET https://cli-chat-proxy.grok.com/v1/billing?format=credits`
- **Provider ID:** `grok`
- **Usage scope:** SuperGrok period quota (same shared meter used by Grok Build)

The plugin reads the first usable key entry from Grok Build's auth file and
queries the same shared period meter that Grok Build exposes. Grok Build remains
the sole owner of OAuth refresh and `~/.grok/auth.json` persistence — this
plugin reads the file read-only, never refreshes tokens, and never writes
credentials back to the file.

## Detection

The plugin enables when `~/.grok/auth.json` contains at least one entry that is
an object with a non-empty `key`. Grok Build keys its entries by
`<scope>::<client_id>` (for example `https://auth.x.ai::<client_id>`), so the
plugin scans all entries and uses the first match rather than assuming a fixed
key:

```jsonc
{
  "https://auth.x.ai::b1a00492-073a-47ea-816f-4c329264a828": {
    "key": "<token>",
    "refresh_token": "<refresh token>", // read-only; never used or written
    "expires_at": "2026-08-01T12:00:00.000Z" // ISO datetime
  }
}
```

If no entry has a non-empty `key`, the plugin shows a
"Log in to Grok in Grok Build first" error. The `refresh_token` is ignored: this
plugin deliberately leaves self-refresh to Grok Build to avoid racing its own
auth updates.

## Expired Tokens

When `expires_at` (ISO datetime) is in the past, the plugin does **not**
attempt a refresh. If `expires_at` is missing or unparsable and the key is a
JWT, its `exp` claim is used as a fallback. In both cases the plugin shows a
"Grok session expired. Start Grok Build and try again." error. Grok Build owns
the reconnect/refresh flow; Quotracker can spawn `grok models` to trigger it
(see Credential Wake).

## Credential Wake

When the probe reports that credential error (in `error` or `staleError`),
Quotracker can spawn the official `grok` CLI as a one-shot:

```text
grok models
```

This is quota-free (it lists models; it is not `grok -p` and does not start a
coding session). Grok Build refreshes `~/.grok/auth.json` if the stored token is
stale. Quotracker does **not** parse `models` stdout — that output can claim
the user is unauthenticated even when refresh succeeded. The following re-probe
is the only auth truth.

**Discovery:** `PATH` plus `~/.local/bin`, plus Grok Build's install directory `$HOME/.grok/bin`. Availability for the Start grok control comes from this wake module, not from Window Starter.

**UI:** Customize L2 has **Auto-start grok** (default off). The Overview card
shows an icon-only **Start grok** action whenever wake is needed and `grok` is
available — including while auto is on. Click (or auto, on a credential error
or when the toggle turns on while already credential-stale) runs the one-shot,
then re-probes `grok` only.

Network and 5xx stale callouts do **not** wake: those failures are not
credential expiry, and spawning a CLI that needs the network is pointless.

Quotracker never calls OAuth endpoints, never writes `~/.grok/auth.json`, and
never writes the OS keyring. `models` stdout is drained and discarded.

This is not a Window Starter attempt and does not use `grok -p`.

## Data Source

`GET https://cli-chat-proxy.grok.com/v1/billing?format=credits`

#### Headers

| Header | Value |
|---|---|
| Authorization | `Bearer <key>` |
| Accept | `application/json` |
| User-Agent | `Quotracker` |
| X-XAI-Token-Auth | `xai-grok-cli` (primary auth identifier) |
| x-grok-client-surface | `grok-build` (compatibility) |
| x-grok-client-version | `1.0.0` (compatibility) |

#### Response Shape

```jsonc
{
  "config": {
    "currentPeriod": {
      "type": "WEEKLY",       // WEEKLY | MONTHLY | DAILY
      "start": "2026-03-02T00:00:00.000Z",
      "end": "2026-03-09T00:00:00.000Z"
    },
    "creditUsagePercent": 40  // usage rate (0-100)
  }
}
```

## Window Rules

- Only a weekly period is shown. `currentPeriod.type` must contain `WEEK`
  (`WEEKLY`, `USAGE_PERIOD_TYPE_WEEKLY`, …). Monthly, daily, and unknown
  period types are omitted — they are not relabeled as `Period`.
- `used` = `creditUsagePercent`, `limit` = `100`, percent format.
- `resetsAt` = `currentPeriod.end` (falls back to `config.billingPeriodEnd`).
- `periodDurationMs` = `end - start` when both boundaries are present; otherwise 7 days.
- Protobuf JSON omits zero-valued fields: when `creditUsagePercent` is absent
  but a current weekly period exists, it is treated as `0%` used rather than an error.
- `used` clamps at `100`.
- Extra Usage is a PAYG text metric from `onDemandCap.val`: present and `> 0`
  → `"N cap"`; missing or `0` → omit. The probe still succeeds with only Extra
  Usage when no weekly window exists, as long as the cap is non-zero. Extra
  Usage is unmarked in the manifest (Customize default: On Demand).

## Stale Snapshot Fallback

Quotracker caches the last successful quota window locally so the provider stays
usable while Grok Build's Grok credential is expired or the API is unreachable.

- **Location:** `{quotracker app_data_dir}/plugins_data/grok/quota-snapshot.json`
- **Stored:** only the weekly window display fields (`used`, `label`, `resetsAt`,
  `periodDurationMs`, `savedAt`). Access tokens, refresh tokens, and other
  secrets are **never** written to the snapshot. Monthly/daily windows are not snapshotted.
- **When shown:** expired credential, missing/unreadable auth, 401/403,
  network errors, and 5xx responses. The last known progress line is rendered
  with a warning header chip `Stale` and the same actionable error as a
  warning callout. Without a valid
  snapshot, the provider reports its regular actionable error instead.
- **Refresh:** the next successful billing response overwrites the snapshot.
  Malformed or invalid snapshots are ignored.
- **Safety:** the plugin never refreshes tokens, never writes
  `~/.grok/auth.json`, and never calls OAuth endpoints — Grok Build remains the
  sole owner of credential refresh and persistence.

## Failure Behavior

- Token expired / 401/403 → "Grok session expired. Start Grok Build and try again."
- Missing / unreadable auth → "Not connected. Log in to Grok in Grok Build first."
- Other HTTP errors → `Usage request failed (HTTP <status>). Try again later.`
- No weekly window and Extra Usage cap `0` → "No Grok quota data available".

## Notes

- The auth file is Grok Build-owned. Quotracker reads `~/.grok/auth.json`
  read-only and relies on Grok Build to refresh credentials, avoiding write
  races with Grok Build's own auth updates.
- OpenRouter usage (even via `x-ai/*` models) is tracked by the separate
  OpenRouter plugin, never aggregated here.
