## Context

See proposal.md for motivation. Current constraints:

- Providers are JS plugins under `plugins/<id>/`, bundled by `copy-bundled.cjs` except `mock`.
- Official OpenUsage set is the 10 providers in `ProviderCatalog.swift` / README. Quotracker plugin ids for Grok and OpenCode stay `xai` and `opencode-go`.
- Linux already has working auth for Claude file/keychain, Codex `$CODEX_HOME`, Cursor `state.vscdb`, Antigravity Linux LS, GrokBuild read-only `~/.grok/auth.json`, OpenCode `auth.json`, Z.ai env keys.
- `host_api.rs` env whitelist currently includes MiniMax/Synthetic/Pi vars used only by plugins this change removes, and does not include `OPENROUTER_API_KEY` / `OPENCODE_DATA_DIR`.
- Progress rows with no `resetsAt` currently show the cap/limit as the trailing label, not `Not started`.
- Cursor spec currently forbids Total Usage; this change restores it as OpenUsage's plan-usage meter without synthesizing it from pool percents.

## Goals / Non-Goals

**Goals:**

- Delete unique unsupported plugins from source and the production bundle in one cut.
- Keep plugin ids and settings keys for remaining providers.
- Port OpenUsage auth/quota/error gaps that matter on Linux.
- Teach session-period progress rows without `resetsAt` to show `Not started`.

**Non-Goals:**

- Devin implementation.
- Claude multi-account cards.
- Codex reset-credit claim (write).
- Grok/OpenUsage OAuth refresh write-back into `~/.grok/auth.json`.
- macOS Claude Desktop Safe Storage.
- A Settings → API Keys UI. OpenRouter keys are file/env/OpenCode fallback only.
- Renaming plugin id `xai` → `grok` or `opencode-go` → `opencode`.
- OpenUsage pricing engine, iCloud, Sparkle, or local HTTP contract changes beyond dropped plugin ids disappearing from `/v1/limits`.

## Decisions

### D1. Delete unique plugin trees; do not hide them

Trash `plugins/{amp,factory,gemini,jetbrains-ai-assistant,kimi,kiro,minimax,windsurf,perplexity,synthetic}/` plus matching `docs/providers/*.md`. `copy-bundled.cjs` then bundles whatever directories remain except `mock`.

Alternative: keep source and exclude from the bundle. Rejected: the policy is not to maintain unused providers.

### D2. Keep `xai` and `opencode-go` ids

User settings store plugin ids in `order` / `disabled` / hidden-line maps. Renaming would be a silent settings break. Display names stay `xAI` and `OpenCode Go`; docs say they are the Grok and OpenCode counterparts.

### D3. Stale settings ids are ignored, not migrated

Removed ids left in `settings.json` are skipped when resolving the catalog. No rewrite of the store. Same pattern as unknown plugins today.

### D4. OpenRouter key order is config file, env, OpenCode

Match OpenUsage's "saved key overrides env" without adding a UI: `~/.config/quotracker/openrouter.json` `{ "apiKey": "..." }`, then `OPENROUTER_API_KEY`, then OpenCode `auth.json`. Call both `/credits` and `/key`; either failure is nonfatal when the other produced usable rows.

### D5. Grok auth stays read-only

Linux GrokBuild/Grok CLI owns `~/.grok/auth.json`. Continue to refuse refresh/write. Change interpretation only: weekly unified pool + Extra Usage PAYG badge; drop Monthly/Daily/Period relabeling. Keep the existing stale snapshot.

### D6. Not started is a shared trailing-label rule

Plugins omit `resetsAt` when the 5-hour window has not started (Claude already has a test for this). UI: if a progress line has `periodDurationMs === 5h` and no parseable `resetsAt`, show `Not started` instead of the cap label. Antigravity Session/Claude 5h rows use the same rule.

### D7. Codex Session follows duration, not Plus

Replace the Plus-only Session gate with OpenUsage's duration classifier: `18000` → Session, `604800` → Weekly, unknown → omit. Reviews stay. Extra Usage and Rate Limit Resets are display-only; no consume endpoint.

### D8. Cursor Total Usage is restored as the aggregate Cursor reports

Do not sum Cursor+Other. If `totalPercentUsed` (or equivalent plan-usage) exists, emit Total Usage. Grok Bot is a separate optional Connect call; failure is nonfatal. Linux `state.vscdb` auth is unchanged.

### D9. Host env whitelist tracks remaining plugins

Remove `MINIMAX_API_KEY`, `MINIMAX_API_TOKEN`, `MINIMAX_CN_API_KEY`, `SYNTHETIC_API_KEY`, `PI_CODING_AGENT_DIR`. Add `OPENROUTER_API_KEY`, `OPENCODE_DATA_DIR`, `XDG_DATA_HOME`. Audit redaction lists against remaining plugin request/response fields and add tests for gaps.

### D10. OpenCode Go 403 EntitlementError vs 401

Parse the JSON error type. 401 → rejected key. 403 `EntitlementError` → hide Go meters, still try local Zen/Go spend from `opencode*.db`. Honor `OPENCODE_DATA_DIR` / `XDG_DATA_HOME`.

## Risks / Trade-offs

- [Users of dropped plugins lose those cards] → Document in README/CHANGELOG. No data wipe. They can keep an older build.
- [OpenRouter users who only had an OpenCode key] → OpenCode `auth.json` remains the last fallback.
- [Grok monthly accounts show no Weekly meter] → Matches OpenUsage; Extra Usage badge still explains PAYG.
- [Cursor Total Usage plus Cursor/Other can look redundant] → OpenUsage's layout; Total Usage is the plan meter, pools stay independent.
- [Antigravity protobuf spend may drift] → Spend is optional; quota meters must still succeed if DBs are unreadable.
- [Not started shared UI might hit non-session rows with a 5h period and no reset] → Limit the label to `periodDurationMs === 5 * 60 * 60 * 1000`.

## Migration Plan

1. Land plugin deletions and README in the same release as remaining-provider ports so the advertised set matches the binary.
2. Existing `settings.json` needs no migration step.
3. Rollback is revert of the release; dropped plugins would have to be restored from git.

## Open Questions

None that block this change. Devin remains a later change if we start using it.
