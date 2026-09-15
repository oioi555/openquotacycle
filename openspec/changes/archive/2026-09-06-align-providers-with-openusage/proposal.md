## Why

Quotracker ships a long tail of providers that current OpenUsage no longer officially supports, while overlapping providers lag OpenUsage on auth sources, quota/reset interpretation, and error handling. Narrowing to OpenUsage's official set and porting those gaps keeps maintenance on accounts we can actually test.

## What Changes

- Treat current OpenUsage's official provider set as Quotracker's supported set: Antigravity, Claude, Codex, Copilot, Cursor, Devin, Grok, OpenCode, OpenRouter, Z.ai.
- **BREAKING**: Remove unique bundled providers that OpenUsage does not officially support and that are not in daily use here: Amp, Factory, Gemini, JetBrains AI Assistant, Kimi, Kiro, MiniMax, Windsurf, Perplexity, Synthetic.
- Keep `opencode-go` and `xai` as the OpenCode and Grok counterparts (same plugin ids). They are official-set alignments, not unique exceptions.
- Keep Linux-only value: platform auth paths, Z.ai Peak Hours, Window Starter, and the unbundled `mock` plugin.
- Port OpenUsage gaps on the remaining providers: missing auth paths, quota/reset mapping, and failure text. Do not copy macOS-only Desktop/Keychain flows or OpenUsage's Grok OAuth write-back.
- Devin is in the official set but **not implemented in this change**. A later change adds it if we actually use Devin.

## Capabilities

### New Capabilities

- `provider-catalog`: official supported-provider set, unique-plugin removal, deferred Devin, and Linux extras that stay.
- `claude-quota`: live Claude meters from file/keychain login, Fable, and Session "Not started".
- `copilot-quota`: editor-token auth plus Copilot AI-credit meters.
- `zai-quota`: `CREDIT_LIMIT`/`TOKENS_LIMIT` window mapping and no-coding-plan handling. Peak Hours stays in `zai-peak-hours`.

### Modified Capabilities

- `opencode-go-quota`: distinguish Go entitlement failures; honor OpenCode data-dir env; add local Go+Zen spend tiles.
- `openrouter-key-quota`: independent API-key sources and account `/credits` alongside key spend.
- `xai-supergrok-quota`: weekly unified-billing meter and pay-as-you-go badge; keep GrokBuild auth read-only.
- `codex-account-quota`: classify Session by window duration for any plan; surface Extra Usage and Rate Limit Resets count (no claim).
- `cursor-usage-pools`: add Grok Bot and restore OpenUsage Total Usage without dropping Linux Desktop auth or the Cursor/Other pools.
- `antigravity-quota`: unused 5-hour windows show Not started; local conversation spend when databases exist.

## Impact

- Bundled plugins under `plugins/` and `copy-bundled.cjs`; README and `docs/providers/*`.
- Host env whitelist and redaction lists in `src-tauri/src/plugin_engine/host_api.rs` (drop MiniMax/Synthetic/Pi keys; add OpenRouter/OpenCode/Grok env names used by remaining plugins).
- Settings plugin order/disabled lists: removed ids vanish from the catalog; leftover settings entries are ignored, not migrated.
- Local HTTP API cache default-enabled list stays Claude/Codex/Cursor.
- Existing users who enabled a dropped plugin lose that card after upgrade. No settings wipe.
- No new runtime dependency. No Devin, Claude multi-account, or Codex reset-credit claim in this change.
