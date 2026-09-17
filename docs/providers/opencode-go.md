# OpenCode Go

Tracks account quota using the official authenticated OpenCode Go usage API.

## Authentication and source

- **Endpoint:** `GET https://opencode.ai/zen/go/v1/usage`
- **Authentication:** `Authorization: Bearer <key>` using the existing `opencode-go.key` entry in OpenCode `auth.json`.
- **Data dir:** `OPENCODE_DATA_DIR` if set, else `$XDG_DATA_HOME/opencode`, else `~/.local/share/opencode`.
- **Provider ID:** `opencode-go`
- No new credential storage or configuration is required. Connect OpenCode Go in OpenCode first.

## Quota and reset mapping

| API window | OpenQuotaCycle label | Usage | Reset |
| --- | --- | --- | --- |
| `usage.rolling` | Session (5 hours) | `percent` | `resetsAt` |
| `usage.weekly` | Weekly | `percent` | `resetsAt` |
| `usage.monthly` | Monthly | `percent` | `resetsAt` |

`percent` is a used percentage on a 0–100 scale. OpenQuotaCycle clamps finite numeric values to that range and uses `limit: 100`. Remaining is `100 - percent`: a value of `1` means 1% used and 99% remaining, never 100% used. Fractional percentages are not multiplied by 100.

Each window must have a supported status (`ok` or `rate-limited`), a finite numeric percentage, and a valid ISO-8601 `resetsAt` timestamp with a timezone. Reset timestamps are normalized to UTC for the existing UI. OpenQuotaCycle does not infer reset timestamps from local history or subscription dates. For the pace indicator only, the monthly duration is derived from the API reset timestamp and the preceding calendar anchor, with the same end-of-month clamping used by OpenCode. This derived duration does not alter the authoritative reset timestamp.

The official documentation lists base allowances of $12 / $30 / $60, but effective allowance varies by model. Those dollar limits and local model costs are not used to compute quota.

## DeepSeek Peak Hours

OpenQuotaCycle derives the current DeepSeek rate window locally from the plugin runtime clock. It does not make an additional status request. The window applies only to DeepSeek models on Go (V4.1 Flash, V4 Pro, V4 Flash, V4 Flash Vision Exp). GLM, Kimi, Grok, and other Go models keep flat rates. Peak token prices are twice the off-peak rates, so DeepSeek traffic burns the dollar meters faster.

- Monday-Friday from 01:00 inclusive to 04:00 exclusive UTC, and from 06:00 inclusive to 10:00 exclusive UTC: danger-tone header chip `DeepSeek Peak`
- All other times, including the weekday 04:00-06:00 UTC gap and weekends: positive-tone header chip `DeepSeek Off-Peak`
- Japan time equivalent: Monday-Friday 10:00-13:00 JST and 15:00-19:00 JST
- The status is recalculated on each automatic or manual plugin refresh
- Successful Go meters emit the chip; entitlement-only spend and auth/usage failures do not
- There is no Peak Hours metric row

## Failures and refresh

Missing/unreadable credentials, other HTTP failures, network failures, and malformed or incomplete usage responses produce an unavailable status instead of quota bars.

- **401** → Authentication failed (rejected key).
- **403 `EntitlementError`** (`body.error.type`) → no Go subscription. Go meters are omitted; local spend tiles may still appear.
- **generic 403** → Access denied.

## Local spend

When `opencode*.db` exists under the data dir, the plugin scans message rows with `providerID` `opencode-go` and appends Today / Yesterday / Last 30 Days text lines (`"$X.XX · Nk tokens"`). Zen (`opencode`) and other provider IDs are ignored. Empty periods are omitted. Spend cannot fail the probe when Go meters already succeeded. EntitlementError still allows spend-only output when local Go rows exist; Zen-only local costs do not.

The provider fetches the API on each probe and keeps no private usage cache. Refresh scheduling and in-flight request handling remain controlled by OpenQuotaCycle's existing refresh mechanism.

The local HTTP API does not restore OpenCode Go snapshots from disk on startup, because older snapshots contain unmarked dollar estimates. It waits for a fresh probe, then caches that result. Auth and usage failures throw instead of emitting a Status badge. Other providers retain their existing cache behavior.

## Migration from local estimates

Earlier versions summed local assistant-message costs from `opencode.db`, divided them by fixed dollar limits, and inferred window resets. This missed other-device usage and could disagree with server accounting.

Existing `anchorDate` and `usageCorrection` settings are ignored; the file is left untouched. Server quota still requires OpenCode authentication. Local SQLite is only the optional spend tiles above.

## References

- [Official Go documentation](https://opencode.ai/docs/go/)
- [DeepSeek API pricing (peak / off-peak)](https://api-docs.deepseek.com/quick_start/pricing)
- [Verified upstream usage route](https://github.com/anomalyco/opencode/blob/5b1e31988ed74b821b3a7ca6647188446992aafc/packages/console/app/src/routes/zen/go/v1/usage.ts)
- [Server quota analysis](https://github.com/anomalyco/opencode/blob/5b1e31988ed74b821b3a7ca6647188446992aafc/packages/console/core/src/subscription.ts)
- [CodexBar public API request #3065](https://github.com/steipete/CodexBar/issues/3065)
- [CodexBar percent=1 regression #3216](https://github.com/steipete/CodexBar/issues/3216)

Verified against upstream on 2026-09-05. The current upstream contract agrees with the percentage and reset mapping above.
