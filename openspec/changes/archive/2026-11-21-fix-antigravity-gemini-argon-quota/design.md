# Design

## Context

`plugins/antigravity/plugin.js` currently sends `"User-Agent": "antigravity"` in both Cloud Code fallback calls (`probeCloudCodeSummary` for `/v1internal:retrieveUserQuotaSummary` and `probeCloudCode` for `/v1internal:fetchAvailableModels`). Cloud Code gates `gemini-*` summary buckets by client `User-Agent` version: with bare `antigravity`, `v1internal:retrieveUserQuotaSummary` returns only `3p-5h` and `3p-weekly` (`Claude` and `Claude Wk`). Because `parseQuotaSummary` produces a non-null 2-line result, `probeCloudCode` returns `_summary: true` and never falls back to `fetchAvailableModels`, leaving `Session` and `Weekly` missing whenever the local language server is unreachable.

Separately, Antigravity on paid Google AI Pro plans reports Gemini 4 Argon under its own group (`Gemini 4 Argon`) with bucket ID `gemini-argon-wtu-weekly` (7-day window), whereas Google AI Ultra folds Argon into the shared `Gemini Models` pool and omits `gemini-argon-wtu-weekly`. Currently `SUMMARY_BUCKETS` and `plugins/antigravity/plugin.json` only recognize `gemini-5h`, `gemini-weekly`, `3p-5h`, and `3p-weekly`, so `gemini-argon-wtu-weekly` is silently dropped.

## Goals / Non-Goals

**Goals:**
- Ensure Cloud Code fallback requests receive `gemini-5h`, `gemini-weekly`, and (when applicable) `gemini-argon-wtu-weekly` alongside `3p-5h` and `3p-weekly`.
- Surface `gemini-argon-wtu-weekly` as `Argon Wk` with 7-day `periodDurationMs` in both local LS and Cloud Code summary probes, while keeping `Weekly` exclusively on `gemini-weekly`.
- Omit `Argon Wk` cleanly when the backend does not emit `gemini-argon-wtu-weekly` (e.g., Ultra, Free, Plus, or legacy endpoints).

**Non-Goals:**
- Adding a separate Window Starter entry for Argon (Argon on Pro is weekly-only and has no 5-hour window).
- Changing local Connect-RPC language-server headers (`GetUnleashData`, `RetrieveUserQuotaSummary`, `GetUserStatus`, `GetCommandModelConfigs`), which already return all buckets from the local binary.
- Inferring or synthesizing an Argon line from legacy `GetUserStatus` / `fetchAvailableModels` responses when `retrieveUserQuotaSummary` is unavailable.

## Decisions

1. **Cloud Code `User-Agent` header (`antigravity/acp/1.3.0`):**
   - Extract `var CLOUD_CODE_USER_AGENT = "antigravity/acp/1.3.0"` in `plugins/antigravity/plugin.js` and pass it in both `probeCloudCodeSummary` and `probeCloudCode`.
   - *Rationale:* Verified against Cloud Code (`pingdotgg/t3code#24800` and live `agy 1.5.12` quota schema) that `antigravity/acp/1.3.0` returns `gemini-5h`, `gemini-weekly`, `gemini-argon-wtu-weekly`, `3p-5h`, and `3p-weekly`, whereas bare `antigravity` or `antigravity/hub/1.0.0` returns only `3p-*`.
   - *Alternative considered:* Using `antigravity/hub/2.24.0`, which restores `gemini-5h` and `gemini-weekly` but is less reliable for `gemini-argon-wtu-weekly` across ACP/CLI tokens. Easy to swap via the single constant if upstream changes again.

2. **Bucket ID and display label (`gemini-argon-wtu-weekly` -> `Argon Wk`):**
   - Add `{ id: "gemini-argon-wtu-weekly", label: "Argon Wk", periodMs: WEEKLY_PERIOD_MS }` to `SUMMARY_BUCKETS` right after `gemini-weekly`, so rendered line order is `Session`, `Weekly`, `Argon Wk`, `Claude`, `Claude Wk`.
   - Add `{ "type": "progress", "label": "Argon Wk", "scope": "overview", "visibleByDefault": true }` in `plugins/antigravity/plugin.json` in the matching position.
   - *Rationale:* Matches `Claude Wk` naming (`shorten-quota-labels`) and `overview` default visibility so Pro users see their separate Argon weekly budget immediately without crowding non-Pro accounts (where `parseQuotaSummary` omits absent buckets). Users can still toggle it to On Demand in Customize.
   - *Interaction with existing subsystems:*
     - `Timeline`: automatically renders `Argon Wk` as an additional weekly row under `Weekly resets` when `resetsAt` is present.
     - `crossing-go`: treats `Argon Wk` as a weekly-cadence line on `antigravity` (no code change needed).
     - `Window Starter`: unaffected (`session` -> `Session`/`Weekly`, `claude` -> `Claude`/`Claude Wk`).

## Risks / Trade-offs

- **Upstream `User-Agent` gating:** Google could raise the minimum accepted `antigravity/acp/*` version in Cloud Code later. Centralizing `CLOUD_CODE_USER_AGENT` keeps future bumps to a one-line change, and `plugin.test.js` pins the header explicitly.
- **Stored explicit line visibility:** Users who previously customized Antigravity's visible line set in settings have an explicit `visibleLines` list that will not auto-include `Argon Wk` until they enable it in Customize or reset customization (standard `overview-metrics` / `manifest-display-defaults` behavior).
- **Stale snapshot recovery:** Existing `quota-snapshot.json` files that only captured `Claude` and `Claude Wk` remain until the next successful fresh probe overwrites them.
